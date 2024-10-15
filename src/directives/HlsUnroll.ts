import { Joinpoint, Loop } from "@specs-feup/clava/api/Joinpoints.js";
import { HlsDirective } from "./HlsDirective.js";

export class HlsUnroll extends HlsDirective {
    #factor: number;
    #skipExitCheck: boolean;
    #isOff: boolean;

    constructor(factor: number = 0, skipExitCheck: boolean = false, isOff: boolean = false) {
        super();
        this.#factor = factor;
        this.#skipExitCheck = skipExitCheck;
        this.#isOff = isOff;
        this.setEnabled(true);
    }

    public setFactor(factor: number): void {
        if (factor > 0) {
            this.#factor = factor;
        }
        else {
            console.warn(`Factor value ${factor} is invalid, it must be greater than 0. Maintaining previous value of ${this.#factor}.`);
        }
    }

    public setSkipExitCheck(skipExitCheck: boolean): void {
        this.#skipExitCheck = skipExitCheck;
    }

    public setOff(isOff: boolean): void {
        this.#isOff = isOff;
    }

    public getFactor(): number {
        return this.#factor;
    }

    public getSkipExitCheck(): boolean {
        return this.#skipExitCheck;
    }

    public getOff(): boolean {
        return this.#isOff;
    }

    public toString(): string {
        return `Directive #pragma HLS ${this.generateDirective()}, with pragma JP ${this.pragma.astId}`;
    }

    protected getAttachmentTarget(loop: Loop): Joinpoint {
        const firstStmt = loop.body.children[0];
        return firstStmt;
    }

    protected generateDirective(): string {
        const factor = this.#factor > 0 ? `factor=${this.#factor}` : "";
        const skipExitCheck = this.#skipExitCheck ? "skip_exit_check" : "";
        const off = this.#isOff ? "off=true" : "";

        const args = ["unroll", factor, skipExitCheck, off];
        const directive = this.joinDirectiveArgs(args);
        return directive;
    }
}