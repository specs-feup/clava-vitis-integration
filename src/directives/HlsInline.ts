import { FunctionJp, Joinpoint } from "@specs-feup/clava/api/Joinpoints.js";
import { HlsDirective } from "./HlsDirective.js";

export class HlsInline extends HlsDirective {
    #inlineType: InlineTypes;

    constructor(inlineType = InlineTypes.REGULAR) {
        super();
        this.#inlineType = inlineType;
        this.setEnabled(true);
    }

    public setRecursive(): void {
        this.#inlineType = InlineTypes.RECURSIVE;
    }

    public setOff(): void {
        this.#inlineType = InlineTypes.OFF;
    }

    protected getAttachmentTarget(jp: FunctionJp): Joinpoint {
        const body = jp.body;
        if (!body) {
            return null;
        }
        const firstStmt = body.firstChild;
        return firstStmt;
    }

    protected generateDirective(): string {
        const directive = ["inline", this.#inlineType].join(" ").trim();
        return directive;
    }
}

export enum InlineTypes {
    REGULAR = "",
    RECURSIVE = "recursive",
    OFF = "off"
}