import { FunctionJp, Joinpoint } from "@specs-feup/clava/api/Joinpoints.js";
import { HlsDirective, HlsDirectiveDomain, HlsDirectiveParams } from "./HlsDirective.js";

export type HlsInlineDomain = HlsDirectiveDomain & {
    inlineType: InlineTypes[];
}

export class HlsInline extends HlsDirective<HlsInlineDomain> {
    private inlineType: InlineTypes;

    constructor(inlineType = InlineTypes.REGULAR) {
        super();
        this.inlineType = inlineType;
        this.setEnabled(true);
    }

    public setRecursive(): void {
        this.inlineType = InlineTypes.RECURSIVE;
    }

    public setOff(): void {
        this.inlineType = InlineTypes.OFF;
    }

    public applyParams(params: HlsDirectiveParams<HlsInlineDomain>): void {
        this.inlineType = params.inlineType;
        this.setEnabled(params.enabled);
    }

    protected getAttachmentTarget(jp: FunctionJp): Joinpoint | null {
        const body = jp.body;
        if (!body) {
            return null;
        }
        const firstStmt = body.firstChild;
        return firstStmt;
    }

    protected generateDirective(): string {
        const args = ["inline", this.inlineType];
        const directive = this.joinDirectiveArgs(args);
        return directive;
    }
}

export enum InlineTypes {
    REGULAR = "",
    RECURSIVE = "recursive",
    OFF = "off"
}