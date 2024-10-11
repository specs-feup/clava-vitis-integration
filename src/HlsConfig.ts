import { FileJp } from "@specs-feup/clava/api/Joinpoints.js";

export class HlsConfig {
    private topFunction: string;
    private platform: AmdPlatform | string = AmdPlatform.ZCU102;
    private clock: Clock = { value: 100, unit: ClockUnit.MEGAHERTZ };
    private flowTarget: FlowTarget = FlowTarget.VITIS;
    private outputFormat: OutputFormat = OutputFormat.VITIS_XO;
    private enablePackaging: boolean = false;
    private sources: Set<FileJp> = new Set();

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

    public setOutputFormat(outputFormat: OutputFormat): HlsConfig {
        this.outputFormat = outputFormat;
        return this;
    }

    public setEnablePackaging(enable: boolean): HlsConfig {
        this.enablePackaging = enable;
        return this;
    }

    public addSource(source: FileJp): HlsConfig {
        this.sources.add(source);
        return this;
    }

    public addSources(sources: FileJp[]): HlsConfig {
        sources.forEach(element => {
            this.sources.add(element);
        });
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

    public getOutputFormat(): OutputFormat {
        return this.outputFormat;
    }

    public isPackagingEnabled(): boolean {
        return this.enablePackaging;
    }

    public getSources(): FileJp[] {
        return Array.from(this.sources);
    }

    public generateConfigFile(): string {
        const config = `
part=${this.platform}

[hls]
flow_target=${this.flowTarget}
package.output.format=${this.outputFormat}
package.output.syn=${this.enablePackaging}
clock_uncertainty=${this.clock.value}${this.clock.unit}
syn.top=${this.topFunction}
`;
        for (const source of this.sources) {
            config.concat(`syn.file=${source.filename}\n`);
        }

        return config;
    }
}

export class NullConfig extends HlsConfig {
    constructor() {
        super("<no_function>");
    }
}

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
    value: number,
    unit: ClockUnit
}

export type Uncertainty = {
    uncertainty: number,
    unit: UncertaintyUnit
}

export enum OutputFormat {
    VIVADO_IP = "ip_catalog",
    VITIS_XO = "xo",
    SYSTEM_GENERATOR_VIVADO_IP = "sysgen",
    RTL = "rtl"
}