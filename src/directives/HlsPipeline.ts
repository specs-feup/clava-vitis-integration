import { FunctionJp, Joinpoint, Loop } from "@specs-feup/clava/api/Joinpoints.js";
import { HlsDirective } from "./HlsDirective.js";

export class HlsPipeline extends HlsDirective {
    private initiationInterval: number;
    private isOff: boolean;
    private rewind: boolean;
    private style: PipeliningStyle;

    constructor(initiationInterval: number = 1, isOff: boolean = false, rewind = false, style: PipeliningStyle = PipeliningStyle.STALL_PIPELINE) {
        super();
        this.initiationInterval = initiationInterval;
        this.isOff = isOff;
        this.rewind = rewind;
        this.style = style;
        this.setEnabled(true);
    }

    public setInitiationInterval(initiationInterval: number): void {
        if (initiationInterval > 0) {
            this.initiationInterval = initiationInterval;
        }
        else {
            console.warn(`Initiation interval value ${initiationInterval} is invalid, it must be greater than 0. Maintaining previous value of ${this.initiationInterval}.`);
        }
    }

    public setOff(isOff: boolean): void {
        this.isOff = isOff;
    }

    public setRewind(rewind: boolean): void {
        this.rewind = rewind;
    }

    public setStyle(style: PipeliningStyle): void {
        this.style = style;
    }

    public getInitiationInterval(): number {
        return this.initiationInterval;
    }

    public getOff(): boolean {
        return this.isOff;
    }

    public getRewind(): boolean {
        return this.rewind;
    }

    public getStyle(): PipeliningStyle {
        return this.style;
    }

    public toString(): string {
        return `Directive #pragma HLS ${this.generateDirective()}, with pragma JP ${this.pragma.astId}`;
    }

    protected getAttachmentTarget(jp: Loop | FunctionJp): Joinpoint | null {
        const body = jp.body;
        if (body != null) {
            return body.firstChild;
        }
        else {
            return null;
        }
    }

    protected generateDirective(): string {
        const ii = this.initiationInterval > 0 ? `II=${this.initiationInterval}` : "";
        const off = this.isOff ? "off" : "";
        const rewind = this.rewind ? "rewind" : "";
        const style = `style=${this.style}`;

        const args = [ii, off, rewind, style];
        const directive = this.joinDirectiveArgs(args);
        return directive;
    }
}

export enum PipeliningStyle {
    STALL_PIPELINE = "stp",
    FLUSHABLE_PIPELINE = "flp",
    FREERUNNING_PIPELINE = "frp"
}