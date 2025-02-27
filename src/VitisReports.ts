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
    perDSP: number
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
    perDSP: number
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