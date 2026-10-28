/// <reference types="node" />
import { createHash } from "crypto";
import { FileJp, FunctionJp, Joinpoint, Loop, Param } from "@specs-feup/clava/api/Joinpoints.js";
import { ArrayPartitionType, HlsArrayPartition, HlsArrayPartitionDomain } from "./directives/HlsArrayPartition.js";
import { HlsDirectiveDomain, HlsDirectiveParams } from "./directives/HlsDirective.js";
import { InlineTypes, HlsInlineDomain, HlsInline } from "./directives/HlsInline.js";
import { HlsPipeline, HlsPipelineDomain, PipeliningStyle } from "./directives/HlsPipeline.js";
import { HlsUnroll, HlsUnrollDomain } from "./directives/HlsUnroll.js";
import Io from "@specs-feup/lara/api/lara/Io.js";
import Query from "@specs-feup/lara/api/weaver/Query.js";
import chalk from "chalk";
import { AmdPlatform, Clock, ClockUnit, OutputFormat, Uncertainty, UncertaintyUnit, VitisHlsConfig } from "./VitisHlsConfig.js";
import { VitisHls } from "./VitisHls.js";
import { VitisSynReport } from "./VitisReports.js";

type DirectiveKind = "unroll" | "pipeline" | "inline" | "partition";

type DomainOf = {
    unroll: HlsUnrollDomain;
    pipeline: HlsPipelineDomain;
    inline: HlsInlineDomain;
    partition: HlsArrayPartitionDomain;
};

type TargetKind = "loop" | "function" | "param";

const TARGET_OF: Record<DirectiveKind, TargetKind> = {
    unroll: "loop",
    pipeline: "loop",
    inline: "function",
    partition: "param",
};

const PARTITION_TYPE_LABEL: Record<ArrayPartitionType, string> = {
    [ArrayPartitionType.BLOCK]: "blk",
    [ArrayPartitionType.CYCLIC]: "cyc",
    [ArrayPartitionType.COMPLETE]: "cmp",
};

// Linux limits a file name to 255 bytes; stay well below it to leave room for prefixes/suffixes
const MAX_ID_LENGTH = 120;

const VERB_OF: Record<DirectiveKind, string> = {
    unroll: "unroll()",
    pipeline: "pipeline()",
    inline: "inline()",
    partition: "partitionArray()",
};

/** Raw choices accumulated by the verbs; defaults are applied when the domain is built. */
type PendingDomains = {
    unroll: { factors: number[]; skipExitCheck: boolean[] };
    pipeline: { intervals: number[]; rewind: boolean[]; styles: PipeliningStyle[] };
    inline: { types: InlineTypes[] };
    partition: { variants: { type: ArrayPartitionType; factors: number[] }[]; dimensions: number[] };
};

type Pending = { [K in DirectiveKind]?: PendingDomains[K] };

/** One directive configured on one target. */
export type DirectiveDesign = { target: Joinpoint; kind: DirectiveKind; params: HlsDirectiveParams<HlsDirectiveDomain> };

export type SynthesisOptions = {
    platform: AmdPlatform | string;
    clock: Clock;
    uncertainty: Uncertainty;
    outputFormat: OutputFormat;
    outputDir: string;
    silent: boolean;
};

/** Outcome of synthesizing one design; `report` is null if the tool run failed (see `error`). */
export type DesignResult = {
    design: Design;
    label: string;
    report: VitisSynReport | null;
    error: string | null;
};

export type ResultMetric = "latency" | "time" | "lut" | "ff" | "bram" | "dsp";

const METRICS: Record<ResultMetric, (r: VitisSynReport) => number> = {
    latency: r => r.latencyBest,
    time: r => r.execTimeBest.value,
    lut: r => r.LUT,
    ff: r => r.FF,
    bram: r => r.BRAM,
    dsp: r => r.DSP,
};

/** A full design point: one configuration per (target, directive). `id` is its 0-based position in the enumeration. */
export type Design = { id: number; directives: DirectiveDesign[] };

export class DseEngine {
    private topFunction: FunctionJp;
    private targets: Map<string, Joinpoint> = new Map();
    private pending: Map<string, Pending> = new Map();
    private mostRecentTarget: string = "";
    private mostRecentDirective: DirectiveKind | null = null;
    private appliedDesign: Design | null = null;
    private insertedPragmas: Joinpoint[] = [];
    private aliases: Map<string, string> = new Map();
    private synthesisOptions: SynthesisOptions = {
        platform: AmdPlatform.ZCU102,
        clock: { value: 100, unit: ClockUnit.MEGAHERTZ },
        uncertainty: { value: 2, unit: UncertaintyUnit.NANOSECOND },
        outputFormat: OutputFormat.VITIS_XO,
        outputDir: "output_hls",
        silent: false,
    };
    private results: Map<number, DesignResult> = new Map();
    private sortMetric: ResultMetric = "latency";

    constructor(topFunction: FunctionJp) {
        this.topFunction = topFunction;
    }

    public on(target: Joinpoint): DseEngine {
        if (!this.isValidTarget(target)) {
            throw new Error("Invalid target: cannot add a target that is an ancestor of the top function.");
        }
        if (!this.targets.has(target.astId)) {
            this.targets.set(target.astId, target);
            this.pending.set(target.astId, {});
        }
        this.mostRecentTarget = target.astId;
        this.mostRecentDirective = null;
        return this;
    }

    /** Gives the current loop target a short name, used in printing and design ids (e.g. "l1"). */
    public alias(name: string): DseEngine {
        const target = this.targets.get(this.mostRecentTarget);
        if (!target) {
            throw new Error("alias() must be preceded by on(target).");
        }
        if (!(target instanceof Loop)) {
            throw new Error(`alias() is only supported on loop targets, but the current target is ${this.describeTarget(target)}.`);
        }
        if (!/^[A-Za-z0-9_]+$/.test(name)) {
            throw new Error(`Invalid alias "${name}": only letters, digits and underscores are allowed.`);
        }
        for (const [id, existing] of this.aliases) {
            if (existing === name && id !== this.mostRecentTarget) {
                throw new Error(`Alias "${name}" is already used by another loop.`);
            }
        }
        this.aliases.set(this.mostRecentTarget, name);
        return this;
    }

    // DSL verbs for loop unrolling
    public unroll(): DseEngine {
        this.beginDirective("unroll");
        return this;
    }

    public withFactors(factors: number[]): DseEngine {
        const domain = this.currentDomain(this.currentKind("unroll")) as PendingDomains["unroll"];
        this.checkPositive(factors, "factors");
        domain.factors.push(...factors);
        return this;
    }

    public complete(): DseEngine {
        // Factor 0 means "no factor" in HlsUnroll, i.e. complete unrolling
        const domain = this.currentDomain(this.currentKind("unroll")) as PendingDomains["unroll"];
        domain.factors.push(0);
        return this;
    }

    public withSkipExitCheck(): DseEngine {
        const domain = this.currentDomain(this.currentKind("unroll")) as PendingDomains["unroll"];
        domain.skipExitCheck.push(true);
        return this;
    }

    public withNoSkipExitCheck(): DseEngine {
        const domain = this.currentDomain(this.currentKind("unroll")) as PendingDomains["unroll"];
        domain.skipExitCheck.push(false);
        return this;
    }

    // DSL verbs for function inlining
    public inline(): DseEngine {
        this.beginDirective("inline");
        return this;
    }

    public withRecursivity(): DseEngine {
        const domain = this.currentDomain(this.currentKind("inline")) as PendingDomains["inline"];
        domain.types.push(InlineTypes.RECURSIVE);
        return this;
    }

    public withNoRecursivity(): DseEngine {
        const domain = this.currentDomain(this.currentKind("inline")) as PendingDomains["inline"];
        domain.types.push(InlineTypes.REGULAR);
        return this;
    }

    // DSL verbs for pipelining
    public pipeline(): DseEngine {
        this.beginDirective("pipeline");
        return this;
    }

    public withInitiationIntervals(intervals: number[]): DseEngine {
        const domain = this.currentDomain(this.currentKind("pipeline")) as PendingDomains["pipeline"];
        this.checkPositive(intervals, "initiation intervals");
        domain.intervals.push(...intervals);
        return this;
    }

    public withRewind(): DseEngine {
        const domain = this.currentDomain(this.currentKind("pipeline")) as PendingDomains["pipeline"];
        domain.rewind.push(true);
        return this;
    }

    public withNoRewind(): DseEngine {
        const domain = this.currentDomain(this.currentKind("pipeline")) as PendingDomains["pipeline"];
        domain.rewind.push(false);
        return this;
    }

    public withStyle(style: PipeliningStyle): DseEngine {
        const domain = this.currentDomain(this.currentKind("pipeline")) as PendingDomains["pipeline"];
        domain.styles.push(style);
        return this;
    }

    // DSL verbs for array partitioning
    public partitionArray(): DseEngine {
        this.beginDirective("partition");
        return this;
    }

    public withCompletePartitioning(): DseEngine {
        return this.addPartitionVariant(ArrayPartitionType.COMPLETE, [0]);
    }

    public withBlockPartitioning(factors: number[]): DseEngine {
        return this.addPartitionVariant(ArrayPartitionType.BLOCK, factors);
    }

    public withCyclicPartitioning(factors: number[]): DseEngine {
        return this.addPartitionVariant(ArrayPartitionType.CYCLIC, factors);
    }

    public acrossDimensions(dimensions: number[]): DseEngine {
        const domain = this.currentDomain(this.currentKind("partition")) as PendingDomains["partition"];
        if (dimensions.some(d => !Number.isInteger(d) || d < 0)) {
            throw new Error("Invalid dimensions: all values must be non-negative integers.");
        }
        domain.dimensions.push(...dimensions);
        return this;
    }

    /** Finalizer: prints every design in the search space (one pragma configuration per target/directive combination). */
    public showSearchSpace(): DseEngine {
        const slots = this.buildSlots();
        const total = slots.reduce((n, s) => n * s.length, 1);
        console.log(`Search space: ${total} design(s) across ${slots.length} directive(s)`);
        if (slots.length === 0) {
            return this;
        }

        for (const design of this.designs()) {
            console.log(`Design ${design.id + 1}/${total} [${this.designId(design)}]:`);
            for (const d of design.directives) {
                console.log(`  ${this.describeTarget(d.target)}: ${d.kind} ${JSON.stringify(d.params)}`);
            }
        }
        return this;
    }

    /** Finalizer: lazily enumerates every design of the search space. Pure, it does not touch the code. */
    public *designs(): Generator<Design> {
        const slots = this.buildSlots();
        if (slots.length > 0) {
            let id = 0;
            for (const directives of this.product(slots)) {
                yield { id: id++, directives };
            }
        }
    }

    /**
     * Readable, deterministic, filename-safe identifier of a design, e.g.
     * (loops show their alias, if set, instead of loop_<astId>) "l1.pipe-ii2-rw0-stp+l1.unr-f4-sk1+param_a.part-cyc-f2-d1".
     * Ids longer than MAX_ID_LENGTH are truncated and suffixed with a hash of the full id, so they remain unique
     * and valid as Linux file/folder names.
     */
    public designId(design: Design): string {
        const id = design.directives.map(d => `${this.targetLabel(d.target)}.${this.directiveLabel(d)}`).join("+");
        if (id.length <= MAX_ID_LENGTH) {
            return id;
        }
        // Too long for a folder name: keep a readable prefix and a hash of the full id for uniqueness
        const hash = createHash("sha1").update(id).digest("hex").slice(0, 10);
        return `${id.slice(0, MAX_ID_LENGTH - hash.length - 2)}--${hash}`;
    }

    /** Inserts the design's directives into the code, first removing the previously applied design (if any). */
    public applyDesign(design: Design): void {
        this.clearDesign();
        this.appliedDesign = design;
        design.directives.forEach(d => this.insertDirective(d));
    }

    /** Removes all directives inserted by the currently applied design (if any). */
    public clearDesign(): void {
        for (const pragma of this.insertedPragmas.reverse()) {
            pragma.detach();
        }
        this.insertedPragmas = [];
        this.appliedDesign = null;
    }

    /** Overrides (part of) the synthesis settings used by synthesize()/synthesizeAll(). */
    public withSynthesisOptions(options: Partial<SynthesisOptions>): DseEngine {
        this.synthesisOptions = { ...this.synthesisOptions, ...options };
        return this;
    }

    /**
     * Applies the design, runs Vitis HLS synthesis on the program, and stores the result
     * (replacing any earlier result of the same design). The design stays applied afterwards.
     * A failing tool run is recorded in the result instead of being thrown.
     */
    public synthesize(design: Design): DesignResult {
        this.applyDesign(design);
        const label = this.designId(design);
        const opts = this.synthesisOptions;

        let result: DesignResult;
        try {
            const files = [...Query.search(FileJp)] as FileJp[];
            const config = new VitisHlsConfig(this.topFunction.name)
                .addSources(files)
                .setClock(opts.clock)
                .setUncertainty(opts.uncertainty)
                .setPlatform(opts.platform)
                .setOutputFormat(opts.outputFormat);
            const vitis = new VitisHls()
                .setConfig(config)
                .setOutputDir(opts.outputDir)
                .setProjectName(`dse_${design.id}`);
            const report = vitis.synthesize(true, opts.silent, true);
            result = { design, label, report, error: null };
        }
        catch (e) {
            result = { design, label, report: null, error: e instanceof Error ? e.message : String(e) };
        }
        finally {
            this.deleteProjects(design);
        }
        this.results.set(design.id, result);
        return result;
    }

    /** Removes the HLS project folders of a design, including those left behind by a failed run. */
    private deleteProjects(design: Design): void {
        const dir = this.synthesisOptions.outputDir;
        if (!Io.isFolder(dir)) return;
        for (const folder of Io.getFolders(dir)) {
            if (folder.getName().startsWith(`dse_${design.id}_`)) {
                Io.deleteFolder(folder);
            }
        }
    }

    /**
     * Synthesizes every design of the search space, then removes the last applied design from the code.
     * Results are collected (see getResults()).
     */
    public synthesizeAll(): DseEngine {
        const total = [...this.designs()].length;
        try {
            for (const design of this.designs()) {
                console.log(`[DSE] Synthesizing design ${design.id + 1}/${total} [${this.designId(design)}]...`);
                const result = this.synthesize(design);
                if (result.error !== null) {
                    console.log(`[DSE]   failed: ${result.error}`);
                }
            }
        }
        finally {
            this.clearDesign();
        }
        return this;
    }

    /** Sets the metric (lowest first) used to rank results in printResults(), rankedResults() and bestResult(). */
    public sortBy(metric: ResultMetric): DseEngine {
        this.sortMetric = metric;
        return this;
    }

    public getResults(): DesignResult[] {
        return [...this.results.values()].sort((a, b) => a.design.id - b.design.id);
    }

    public getResult(design: Design | number): DesignResult | undefined {
        return this.results.get(typeof design === "number" ? design : design.id);
    }

    /** Valid results ordered by the sortBy() metric (latency by default), best (lowest) first. */
    public rankedResults(): DesignResult[] {
        const get = METRICS[this.sortMetric];
        return this.getResults()
            .filter(r => r.report !== null && r.report.valid)
            .sort((a, b) => get(a.report!) - get(b.report!));
    }

    public bestResult(): DesignResult | undefined {
        return this.rankedResults()[0];
    }

    /** Prints a table with one row per synthesized design, sorted by the sortBy() metric (invalid/failed runs last). */
    public printResults(): DseEngine {
        const ranked = this.rankedResults();
        const rejected = this.getResults().filter(r => !ranked.includes(r));
        if (ranked.length + rejected.length === 0) {
            console.log("No results to show.");
            return this;
        }

        const header = ["#", "Design", "Latency", "Fmax(MHz)", "LUT", "FF", "BRAM", "DSP"];
        const rows: string[][] = [];
        for (const r of ranked) {
            const rep = r.report!;
            rows.push([String(r.design.id), r.label, String(rep.latencyBest), rep.frequencyMaxMHz.toFixed(1),
                `${rep.LUT} (${rep.perLUT}%)`, `${rep.FF} (${rep.perFF}%)`, `${rep.BRAM} (${rep.perBRAM}%)`, `${rep.DSP} (${rep.perDSP}%)`]);
        }
        for (const r of rejected) {
            const why = r.error ?? r.report?.errors[0] ?? "invalid report";
            rows.push([String(r.design.id), r.label, "-", "-", "-", "-", "-", `failed: ${why}`.slice(0, 60)]);
        }

        const widths = header.map((h, c) => Math.max(h.length, ...rows.map(row => row[c].length)));
        const fmt = (cells: string[]) => cells.map((cell, c) => cell.padEnd(widths[c])).join("  ");
        console.log(chalk.bold(fmt(header)));
        console.log(widths.map(w => "-".repeat(w)).join("  "));
        rows.forEach((row, i) => {
            const line = fmt(row);
            console.log(i === 0 && ranked.length > 0 ? chalk.green(line) : i >= ranked.length ? chalk.red(line) : line);
        });
        if (ranked.length > 0) {
            console.log(`Best by ${this.sortMetric}: design ${ranked[0].design.id} [${ranked[0].label}]`);
        }
        return this;
    }

    // Generates the pragma for the directive and inserts it at its target
    private insertDirective(design: DirectiveDesign): void {
        if (design.kind === "unroll") {
            const params = design.params as HlsDirectiveParams<HlsUnrollDomain>;
            const directive = new HlsUnroll(params.factor, params.skipExitCheck);
            this.track(directive.attach(design.target));
        }
        if (design.kind === "pipeline") {
            const params = design.params as HlsDirectiveParams<HlsPipelineDomain>;
            const directive = new HlsPipeline(params.initiationInterval, params.rewind);
            this.track(directive.attach(design.target));
        }
        if (design.kind === "inline") {
            const params = design.params as HlsDirectiveParams<HlsInlineDomain>;
            const directive = new HlsInline(params.inlineType);
            this.track(directive.attach(design.target));
        }
        if (design.kind === "partition") {
            const params = design.params as HlsDirectiveParams<HlsArrayPartitionDomain>;
            const directive = new HlsArrayPartition(params.type[0], params.factor, params.dimension);
            this.track(directive.attach(design.target));
        }
    }

    private track(inserted: Joinpoint | null): void {
        if (inserted !== null) {
            this.insertedPragmas.push(inserted);
        }
    }

    // Internal helpers
    private beginDirective(kind: DirectiveKind): void {
        const target = this.currentTarget(kind);
        this.checkTargetType(target, kind);
        const pending = this.pending.get(this.mostRecentTarget)!;
        if (pending[kind] === undefined) {
            (pending as Record<DirectiveKind, unknown>)[kind] = this.emptyPending(kind);
        }
        this.mostRecentDirective = kind;
    }

    private emptyPending<K extends DirectiveKind>(kind: K): PendingDomains[K] {
        const empty: PendingDomains = {
            unroll: { factors: [], skipExitCheck: [] },
            pipeline: { intervals: [], rewind: [], styles: [] },
            inline: { types: [] },
            partition: { variants: [], dimensions: [] },
        };
        return empty[kind];
    }

    private currentTarget(forKind: DirectiveKind): Joinpoint {
        const target = this.targets.get(this.mostRecentTarget);
        if (!target) {
            throw new Error(`${VERB_OF[forKind]} must be preceded by on(target).`);
        }
        return target;
    }

    private currentKind<K extends DirectiveKind>(...allowed: K[]): K {
        const kind = this.mostRecentDirective;
        if (kind === null || !(allowed as DirectiveKind[]).includes(kind)) {
            const expected = allowed.map(k => VERB_OF[k]).join(" or ");
            const got = kind === null ? "no directive" : VERB_OF[kind];
            throw new Error(`Modifier is only valid after ${expected}, but the current directive is ${got}.`);
        }
        return kind as K;
    }

    private currentDomain<K extends DirectiveKind>(kind: K): PendingDomains[K] {
        return this.pending.get(this.mostRecentTarget)![kind] as PendingDomains[K];
    }

    private addPartitionVariant(type: ArrayPartitionType, factors: number[]): DseEngine {
        const domain = this.currentDomain(this.currentKind("partition")) as PendingDomains["partition"];
        if (type !== ArrayPartitionType.COMPLETE) {
            this.checkPositive(factors, "factors");
            if (factors.length === 0) {
                throw new Error(`${type} partitioning requires at least one factor.`);
            }
        }
        const existing = domain.variants.find(v => v.type === type);
        if (existing) {
            existing.factors = this.unique([...existing.factors, ...factors], []);
        }
        else {
            domain.variants.push({ type, factors: this.unique(factors, []) });
        }
        return this;
    }

    private checkPositive(values: number[], what: string): void {
        if (values.some(v => !Number.isInteger(v) || v <= 0)) {
            throw new Error(`Invalid ${what}: all values must be positive integers.`);
        }
    }

    private unique<T>(values: T[], fallback: T[]): T[] {
        return values.length === 0 ? fallback : [...new Set(values)];
    }

    private finalizeDomain<K extends DirectiveKind>(kind: K, target: Joinpoint, p: PendingDomains[K]): DomainOf[K] | DomainOf[K][] {
        const enabled = [true];
        switch (kind) {
            case "unroll": {
                const u = p as PendingDomains["unroll"];
                return { enabled, factor: this.unique(u.factors, [0]), skipExitCheck: this.unique(u.skipExitCheck, [false]) } as DomainOf[K];
            }
            case "pipeline": {
                const q = p as PendingDomains["pipeline"];
                return {
                    enabled,
                    initiationInterval: this.unique(q.intervals, [1]),
                    rewind: this.unique(q.rewind, [false]),
                    style: this.unique(q.styles, [PipeliningStyle.STALL_PIPELINE]),
                } as DomainOf[K];
            }
            case "inline": {
                const i = p as PendingDomains["inline"];
                return { enabled, inlineType: this.unique(i.types, [InlineTypes.REGULAR]) } as DomainOf[K];
            }
            case "partition": {
                const a = p as PendingDomains["partition"];
                if (a.variants.length === 0) {
                    throw new Error(`Array partitioning of ${this.describeTarget(target)} requires withCompletePartitioning(), withBlockPartitioning(factors) or withCyclicPartitioning(factors).`);
                }
                const dimension = this.unique(a.dimensions, [1]);
                // Factors are tied to their type, so each type gets its own domain
                return a.variants.map(v => ({ enabled, type: [v.type], factor: v.factors, dimension })) as DomainOf[K][];
            }
        }
        throw new Error(`Unknown directive kind ${kind}`);
    }

    /** One list of concrete designs per (target, directive), with invalid/redundant combinations removed. */
    private buildSlots(): DirectiveDesign[][] {
        const slots: DirectiveDesign[][] = [];
        for (const [id, target] of this.targets) {
            const pending = this.pending.get(id)!;
            for (const kind of Object.keys(pending) as DirectiveKind[]) {
                const result = this.finalizeDomain(kind, target, pending[kind] as never) as unknown as HlsDirectiveDomain | HlsDirectiveDomain[];
                const domains = Array.isArray(result) ? result : [result];
                const designs = domains.flatMap(domain => [...this.permutations(domain)].map(params => ({ target, kind, params })));
                slots.push(designs);
            }
        }
        return slots;
    }

    private *permutations(domain: HlsDirectiveDomain): Generator<HlsDirectiveParams<HlsDirectiveDomain>> {
        const keys = Object.keys(domain) as (keyof HlsDirectiveDomain)[];
        const recurse = function* (i: number, acc: object): Generator<HlsDirectiveParams<HlsDirectiveDomain>> {
            if (i === keys.length) {
                yield { ...acc } as HlsDirectiveParams<HlsDirectiveDomain>;
                return;
            }
            for (const value of domain[keys[i]] as unknown[]) {
                yield* recurse(i + 1, { ...acc, [keys[i]]: value });
            }
        };
        yield* recurse(0, {});
    }

    private *product(slots: DirectiveDesign[][]): Generator<DirectiveDesign[]> {
        const recurse = function* (i: number, acc: DirectiveDesign[]): Generator<DirectiveDesign[]> {
            if (i === slots.length) {
                yield acc;
                return;
            }
            for (const d of slots[i]) {
                yield* recurse(i + 1, [...acc, d]);
            }
        };
        yield* recurse(0, []);
    }

    private targetLabel(target: Joinpoint): string {
        const alias = this.aliases.get(target.astId);
        if (alias !== undefined) {
            return alias;
        }
        const name = target instanceof Param || target instanceof FunctionJp ? target.name : target.astId;
        const kind = target instanceof Param ? "param" : target instanceof FunctionJp ? "fn" : "loop";
        return `${kind}_${name}`.replace(/[^A-Za-z0-9_]/g, "_");
    }

    private directiveLabel(design: DirectiveDesign): string {
        const bit = (b: boolean) => (b ? 1 : 0);
        switch (design.kind) {
            case "unroll": {
                const p = design.params as unknown as HlsDirectiveParams<HlsUnrollDomain>;
                return `unr-${p.factor > 0 ? `f${p.factor}` : "cmp"}-sk${bit(p.skipExitCheck)}`;
            }
            case "pipeline": {
                const p = design.params as unknown as HlsDirectiveParams<HlsPipelineDomain>;
                return `pipe-ii${p.initiationInterval}-rw${bit(p.rewind)}-${p.style}`;
            }
            case "inline": {
                const p = design.params as unknown as HlsDirectiveParams<HlsInlineDomain>;
                return `inl-${p.inlineType === InlineTypes.REGULAR ? "reg" : p.inlineType === InlineTypes.RECURSIVE ? "rec" : "off"}`;
            }
            case "partition": {
                const p = design.params as unknown as HlsDirectiveParams<HlsArrayPartitionDomain>;
                const factor = p.type === ArrayPartitionType.COMPLETE ? "" : `-f${p.factor}`;
                return `part-${PARTITION_TYPE_LABEL[p.type]}${factor}-d${p.dimension}`;
            }
        }
    }

    private describeTarget(target: Joinpoint): string {
        if (target instanceof Param) {
            return `param ${target.name}`;
        }
        if (target instanceof FunctionJp) {
            return `function ${target.name}`;
        }
        if (target instanceof Loop) {
            const alias = this.aliases.get(target.astId);
            return `loop ${alias !== undefined ? alias : `@${target.astId}`} (line ${target.line})`;
        }
        return target.astId;
    }

    private isValidTarget(target: Joinpoint): boolean {
        // Invalid only if the target contains the top function
        let node: Joinpoint | undefined = this.topFunction;
        while (node !== undefined) {
            if (node.astId === target.astId && node.astId !== this.topFunction.astId) {
                return false;
            }
            node = node.parent;
        }
        return true;
    }

    private checkTargetType(target: Joinpoint, kind: DirectiveKind): void {
        const valid = {
            loop: this.isValidLoopTarget(target),
            function: this.isValidFunctionTarget(target),
            param: this.isValidParamTarget(target),
        }[TARGET_OF[kind]];
        if (!valid) {
            throw new Error(`${VERB_OF[kind]} requires a ${TARGET_OF[kind]} target, but the current target is ${this.describeTarget(target)}.`);
        }
    }

    private isValidLoopTarget(target: Joinpoint): boolean {
        return target instanceof Loop;
    }

    private isValidParamTarget(target: Joinpoint): boolean {
        return target instanceof Param;
    }

    private isValidFunctionTarget(target: Joinpoint): boolean {
        return target instanceof FunctionJp;
    }
}
