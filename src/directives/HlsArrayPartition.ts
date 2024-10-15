import { FunctionJp, Joinpoint, Param } from "@specs-feup/clava/api/Joinpoints.js";
import { HlsDirective } from "./HlsDirective.js";

export class HlsArrayPartition extends HlsDirective {
    private variable: string;
    private dimension: number;
    private factor: number;
    private isOff: boolean;
    private type: ArrayPartitionType;

    constructor(variable: string, dimension: number, factor: number = 0, isOff: boolean = false, type: ArrayPartitionType = ArrayPartitionType.CYCLIC) {
        super();
        this.variable = variable;
        this.dimension = dimension;
        this.factor = factor;
        this.isOff = isOff;
        this.type = type;
        this.setEnabled(true);
    }

    public getVariable(): string {
        return this.variable;
    }

    public getDimension(): number {
        return this.dimension;
    }

    public getFactor(): number {
        return this.factor;
    }

    public getType(): ArrayPartitionType {
        return this.type;
    }

    public getOff(): boolean {
        return this.isOff;
    }

    public setVariable(variable: string): void {
        this.variable = variable;
    }

    public setDimension(dimension: number): void {
        this.dimension = dimension;
    }

    public setFactor(factor: number): void {
        if (factor > 0) {
            this.factor = factor;
        }
        else {
            console.warn(`Factor value ${factor} is invalid, it must be greater than 0. Maintaining previous value of ${this.factor}.`);
        }
    }

    public setType(type: ArrayPartitionType): void {
        this.type = type;
    }

    public setOff(isOff: boolean): void {
        this.isOff = isOff;
    }

    public toString(): string {
        return `Directive #pragma HLS ${this.generateDirective()}, with pragma JP ${this.pragma.astId}`;
    }

    protected getAttachmentTarget(param: Param): Joinpoint | null {
        const fun = param.parent as FunctionJp;
        const body = fun.body;
        if (!body) {
            return null;
        }
        else {
            const firstStmt = body.firstChild;
            return firstStmt;
        }
    }

    protected generateDirective(): string {
        const type = `type=${this.type}`;
        const factor = this.type != ArrayPartitionType.COMPLETE ? `factor=${this.factor}` : "";
        const dim = `dim=${this.dimension}`;
        const off = this.isOff ? "off=true" : "";

        const directive = this.joinDirectiveArgs(["array_partition", this.variable, type, factor, dim, off]);
        return directive;
    }

}

export enum ArrayPartitionType {
    BLOCK = "block",
    CYCLIC = "cyclic",
    COMPLETE = "complete",
}