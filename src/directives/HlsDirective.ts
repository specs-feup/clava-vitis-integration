import { Joinpoint, Pragma } from "@specs-feup/clava/api/Joinpoints.js";

export abstract class HlsDirective {
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
    }

    public attach(joinpoint: Joinpoint): void {
        this.updatePragma();
        const target = this.getAttachmentTarget(joinpoint);
        if (target != null) {
            target.insertBefore(this.pragma);
        }
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