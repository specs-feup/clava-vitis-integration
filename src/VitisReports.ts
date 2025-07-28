import { AmdPlatform, Clock, Uncertainty } from "./VitisHlsConfig.js"

export type VitisSynReport = {
    platform: string | AmdPlatform,
    topFunction: string,

    clockTarget: Clock,
    clockTargetUncertainty: Uncertainty,
    clockEstim: Clock,
    frequencyMaxMHz: number,

    latencyWorst: number,
    latencyAvg: number,
    latencyBest: number,
    hasFixedLatency: boolean,

    execTimeWorst: ExecTime,
    execTimeAvg: ExecTime,
    execTimeBest: ExecTime,

    FF: number,
    LUT: number,
    BRAM: number,
    DSP: number,

    availFF: number,
    availLUT: number,
    availBRAM: number,
    availDSP: number,

    perFF: number,
    perLUT: number,
    perBRAM: number,
    perDSP: number,

    valid: boolean,
    errors: string[]
}

export type VitisImplReport = {
    vivadoVersion: string,

    clockTarget: Clock,
    clockAchieved: Clock,

    FF: number,
    LUT: number,
    BRAM: number,
    DSP: number,

    availFF: number,
    availLUT: number,
    availBRAM: number,
    availDSP: number,

    perFF: number,
    perLUT: number,
    perBRAM: number,
    perDSP: number,

    valid: boolean,
    errors: string[]
}

export type ExecTime = {
    value: number,
    unit: TimeUnit
}

export enum TimeUnit {
    NANOSECOND = "ns",
    MICROSECOND = "us",
    MILLISECOND = "ms",
    SECOND = "s"
}

export function convertTimeUnit(value: number, from: TimeUnit, to: TimeUnit): number {
    const conversionFactors: { [key in TimeUnit]: number } = {
        [TimeUnit.NANOSECOND]: 1e-9,
        [TimeUnit.MICROSECOND]: 1e-6,
        [TimeUnit.MILLISECOND]: 1e-3,
        [TimeUnit.SECOND]: 1
    };

    return value * conversionFactors[from] / conversionFactors[to];
}