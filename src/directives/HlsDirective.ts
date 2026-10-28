import { Joinpoint, Pragma } from "@specs-feup/clava/api/Joinpoints.js";

export type HlsDirectiveDomain = {
    enabled: boolean[];
}

/** One concrete value per domain field, e.g. {factor: number[]} -> {factor: number} */
export type HlsDirectiveParams<D extends HlsDirectiveDomain> = {
    [K in keyof D]: D[K] extends readonly (infer T)[] ? T : never;
}

export abstract class HlsDirective<D extends HlsDirectiveDomain = HlsDirectiveDomain> {
    protected pragma = new Pragma("#pragma HLS disabled");
    protected enabled: boolean = false;

    public getPragma(): Pragma {
        return this.pragma;
    }

    public setEnabled(enable: boolean): void {
        if (this.enabled && !enable) {
            this.pragma = new Pragma("#pragma HLS disabled");
        }
        else if (!this.enabled && enable) {
            this.pragma = this.updatePragma();
        }
        this.enabled = enable;
    }

    /** Sets all parameters of this directive in place, keeping the same object. */
    public abstract applyParams(params: HlsDirectiveParams<D>): void;

    /** @returns the pragma node inserted in the AST (so it can be detached later), or null if there was nowhere to insert it */
    public attach(joinpoint: Joinpoint): Joinpoint | null {
        this.updatePragma();
        const target = this.getAttachmentTarget(joinpoint);
        if (target == null) {
            return null;
        }
        return target.insertBefore(this.pragma);
    }

    protected updatePragma(): Pragma {
        const directive = this.generateDirective();
        this.pragma = new Pragma(`#pragma HLS ${directive}`);
        return this.pragma;
    }

    protected joinDirectiveArgs(args: string[]): string {
        return args.join(" ").trim().replace(/\s+/g, ' ');
    }

    protected abstract getAttachmentTarget(jp: Joinpoint): Joinpoint | null;

    protected abstract generateDirective(): string;
}