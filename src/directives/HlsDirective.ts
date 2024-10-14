import { Pragma } from "@specs-feup/clava/api/Joinpoints.js";

export abstract class HlsDirective extends Pragma {
    protected enabled: boolean = false;

    constructor(directive: string) {
        super(`#pragma HLS ${directive}`);
    }
}