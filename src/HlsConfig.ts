export class HlsConfig {
    private topFunction: string;
    private platform: AmdPlatform | string = AmdPlatform.ZCU102;
    private clock: Clock = { clock: 100, unit: ClockUnit.MEGAHERTZ };
    private flowTarget: FlowTarget = FlowTarget.VITIS;

    constructor(topFunction: string) {
        this.topFunction = topFunction;
    }

    public setTopFunction(topFunction: string): HlsConfig {
        this.topFunction = topFunction;
        return this;
    }

    public setPlatform(platform: AmdPlatform | string): HlsConfig {
        this.platform = platform;
        return this;
    }

    public setClock(clock: Clock): HlsConfig {
        this.clock = clock;
        return this;
    }

    public setFlowTarget(flowTarget: FlowTarget): HlsConfig {
        this.flowTarget = flowTarget;
        return this;
    }

    public getTopFunction(): string {
        return this.topFunction;
    }

    public getPlatform(): AmdPlatform | string {
        return this.platform;
    }

    public getClock(): Clock {
        return this.clock;
    }

    public getFlowTarget(): FlowTarget {
        return this.flowTarget;
    }
};

export enum AmdPlatform {
    ZCU102 = "xczu9eg-ffvb1156-2-e",
    ZCU102_DFX = "",
    ZCU104 = "",
    VMK180 = "",
    VCK190 = "",
    VCK190_DFX = "",
    VEK280 = "",
    VEK280_BDC = ""
}

export enum FlowTarget {
    VITIS,
    VIVADO
}

export enum ClockUnit {
    PICOSECOND = "ps",
    NANOSECOND = "ns",
    MICROSECOND = "us",
    MILLISECOND = "ms",
    HERTZ = "Hz",
    KILOHERTZ = "kHz",
    MEGAHERTZ = "MHz",
    GIGAHERTZ = "GHz"
}

export enum UncertaintyUnit {
    NANOSECOND = "ns",
    PERCENTAGE = "%",
    MEGAHERTZ = "MHz"
}

export type Clock = {
    clock: number,
    unit: ClockUnit
}

export type Uncertainty = {
    uncertainty: number,
    unit: UncertaintyUnit
}