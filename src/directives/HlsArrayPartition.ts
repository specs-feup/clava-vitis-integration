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