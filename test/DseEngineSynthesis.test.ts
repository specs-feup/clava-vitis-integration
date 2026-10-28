import { jest } from "@jest/globals";
import { registerSourceCode } from "@specs-feup/lara/jest/jestHelpers.js";
import { FunctionJp, Loop, Pragma } from "@specs-feup/clava/api/Joinpoints.js";
import Query from "@specs-feup/lara/api/weaver/Query.js";
import { DseEngine } from "../src/DseEngine.js";
import { VitisHls } from "../src/VitisHls.js";
import { VitisSynReportParser } from "../src/VitisSynReportParser.js";
import { VitisSynReport } from "../src/VitisReports.js";

const code = `
int dotprod(int a[16], int b[16]) {
    int sum = 0;
    for (int i = 0; i < 16; i++) {
        sum += a[i] * b[i];
    }
    return sum;
}
`;

const baseReport = (): VitisSynReport => ({ ...VitisSynReportParser.emptyReport(), valid: true, errors: [] });
const hlsPragmas = () => (Query.search(Pragma).get() as Pragma[]).filter(p => p.name === "HLS").map(p => p.content);

/** Replaces Vitis: the "latency" of each fake run is the unroll factor in the woven code, so the best design is predictable. */
function fakeVitis(opts: { failOn?: (code: string) => boolean } = {}) {
    return jest.spyOn(VitisHls.prototype, "synthesize").mockImplementation(() => {
        const woven = Query.search(FunctionJp, { name: "dotprod" }).first()!.code;
        if (opts.failOn?.(woven)) {
            throw new Error("synthesis exploded");
        }
        const factor = Number(/factor=(\d+)/.exec(woven)?.[1] ?? 0);
        return { ...baseReport(), latencyBest: 1000 / Math.max(factor, 1), LUT: factor * 10, FF: 5, BRAM: 1, DSP: 2 };
    });
}

describe("DseEngine synthesis and results", () => {
    registerSourceCode(code);

    const engine = () => {
        const fun = Query.search(FunctionJp, { name: "dotprod" }).first()!;
        const loop = Query.searchFrom(fun, Loop).first()!;
        return new DseEngine(fun).on(loop).alias("L1").unroll().withFactors([2, 4, 8]);
    };

    let log: ReturnType<typeof jest.spyOn>;
    beforeEach(() => { log = jest.spyOn(console, "log").mockImplementation(() => { }); });
    afterEach(() => { jest.restoreAllMocks(); });

    it("synthesizes every design on the matching code and leaves the code clean", () => {
        const vitis = fakeVitis();
        const dse = engine().synthesizeAll();
        expect(vitis).toHaveBeenCalledTimes(3);
        expect(dse.getResults().map(r => r.report?.latencyBest)).toEqual([500, 250, 125]);
        expect(hlsPragmas()).toEqual([]);
    });

    it("ranks by the chosen metric and exposes the best result", () => {
        fakeVitis();
        const dse = engine().synthesizeAll();
        expect(dse.bestResult()?.label).toContain("unr-f8");
        expect(dse.sortBy("lut").bestResult()?.label).toContain("unr-f2");
        expect(dse.sortBy("ff").rankedResults()).toHaveLength(3);
    });

    it("records a failing synthesis without aborting the sweep", () => {
        fakeVitis({ failOn: c => c.includes("factor=4") });
        const dse = engine().synthesizeAll();
        const results = dse.getResults();
        expect(results).toHaveLength(3);
        expect(results[1].error).toMatch(/exploded/);
        expect(results[1].report).toBeNull();
        expect(dse.rankedResults()).toHaveLength(2);
        expect(hlsPragmas()).toEqual([]);
    });

    it("treats invalid reports as failures when ranking", () => {
        jest.spyOn(VitisHls.prototype, "synthesize").mockImplementation(() => ({ ...baseReport(), valid: false, errors: ["bad"] }));
        const dse = engine().synthesizeAll();
        expect(dse.rankedResults()).toHaveLength(0);
        expect(dse.bestResult()).toBeUndefined();
    });

    it("looks results up by design or id and replaces repeated runs", () => {
        fakeVitis();
        const dse = engine();
        const designs = [...dse.designs()];
        dse.synthesize(designs[0]);
        dse.synthesize(designs[0]);
        expect(dse.getResults()).toHaveLength(1);
        expect(dse.getResult(0)).toBe(dse.getResult(designs[0]));
        dse.clearDesign();
    });

    it("prints a table with the best design first and failures last", () => {
        fakeVitis({ failOn: c => c.includes("factor=4") });
        const dse = engine().synthesizeAll();
        log.mockClear();
        dse.sortBy("latency").printResults();
        const out = log.mock.calls.map((c: unknown[]) => String(c[0])).join("\n");
        expect(out).toMatch(/Latency/);
        expect(out.indexOf("unr-f8")).toBeLessThan(out.indexOf("unr-f2"));
        expect(out.indexOf("unr-f2")).toBeLessThan(out.indexOf("unr-f4"));
        expect(out).toMatch(/failed: synthesis exploded/);
        expect(out).toMatch(/Best by latency/);
    });

    it("forwards synthesis options to the Vitis config", () => {
        const vitis = fakeVitis();
        const setConfig = jest.spyOn(VitisHls.prototype, "setConfig");
        engine().withSynthesisOptions({ clock: { value: 200, unit: "MHz" as never }, deleteWorkspace: true }).synthesizeAll();
        expect(vitis.mock.calls[0]).toEqual([true, false, true]);
        expect(setConfig.mock.calls[0][0].getClock().value).toBe(200);
    });

    it("prints a message when there is nothing to show", () => {
        engine().printResults();
        expect(log).toHaveBeenCalledWith("No results to show.");
    });
});
