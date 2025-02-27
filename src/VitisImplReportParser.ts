import Io from "@specs-feup/lara/api/lara/Io.js";
import { XMLParser } from "fast-xml-parser";
import { ClockUnit, UncertaintyUnit } from "./VitisHlsConfig.js";
import { TimeUnit, VitisImplReport, VitisSynReport } from "./VitisReports.js";

export class VitisImplReportParser {
    constructor() { }

    public parseReport(reportPath: string): VitisImplReport {
        const reportData = Io.readFile(reportPath);

        const parser = new XMLParser();
        const json = parser.parse(reportData);

        const period = json.profile.PerformanceEstimates.SummaryOfTimingAnalysis.EstimatedClockPeriod;
        const freqMHz = (1 / period) * 1e3;
        const hasFixedLatency = json.profile.PerformanceEstimates.SummaryOfOverallLatency["Worst-caseLatency"] ===
            json.profile.PerformanceEstimates.SummaryOfOverallLatency["Best-caseLatency"];

        const execWorst = json.profile.PerformanceEstimates.SummaryOfOverallLatency["Worst-caseRealTimeLatency"].split(" ") as string[];
        const execAvg = json.profile.PerformanceEstimates.SummaryOfOverallLatency["Average-caseRealTimeLatency"].split(" ") as string[];
        const execBest = json.profile.PerformanceEstimates.SummaryOfOverallLatency["Best-caseRealTimeLatency"].split(" ") as string[];

        const report: VitisImplReport = {
            platform: json.profile.UserAssignments.Part,
            topFunction: json.profile.UserAssignments.TopModelName,

            clockTarget: { value: json.profile.UserAssignments.TargetClockPeriod, unit: ClockUnit.NANOSECOND },
            clockTargetUncertainty: { value: json.profile.UserAssignments.ClockUncertainty, unit: UncertaintyUnit.NANOSECOND },
            clockEstim: { value: json.profile.PerformanceEstimates.SummaryOfTimingAnalysis.EstimatedClockPeriod, unit: ClockUnit.NANOSECOND },
            frequencyMaxMHz: freqMHz,

            latencyWorst: json.profile.PerformanceEstimates.SummaryOfOverallLatency["Worst-caseLatency"],
            latencyAvg: json.profile.PerformanceEstimates.SummaryOfOverallLatency["Average-caseLatency"],
            latencyBest: json.profile.PerformanceEstimates.SummaryOfOverallLatency["Best-caseLatency"],
            hasFixedLatency: hasFixedLatency,

            execTimeWorst: { value: Number(execWorst[0]), unit: execWorst[1].trim() as TimeUnit },
            execTimeAvg: { value: Number(execAvg[0]), unit: execAvg[1].trim() as TimeUnit },
            execTimeBest: { value: Number(execBest[0]), unit: execBest[1].trim() as TimeUnit },

            FF: json.profile.AreaEstimates.Resources.FF,
            LUT: json.profile.AreaEstimates.Resources.LUT,
            BRAM: json.profile.AreaEstimates.Resources.BRAM_18K,
            DSP: json.profile.AreaEstimates.Resources.DSP,

            availFF: json.profile.AreaEstimates.AvailableResources.FF,
            availLUT: json.profile.AreaEstimates.AvailableResources.LUT,
            availBRAM: json.profile.AreaEstimates.AvailableResources.BRAM_18K,
            availDSP: json.profile.AreaEstimates.AvailableResources.DSP,

            perFF: json.profile.AreaEstimates.Resources.FF / json.profile.AreaEstimates.AvailableResources.FF,
            perLUT: json.profile.AreaEstimates.Resources.LUT / json.profile.AreaEstimates.AvailableResources.LUT,
            perBRAM: json.profile.AreaEstimates.Resources.BRAM_18K / json.profile.AreaEstimates.AvailableResources.BRAM_18K,
            perDSP: json.profile.AreaEstimates.Resources.DSP / json.profile.AreaEstimates.AvailableResources.DSP
        };

        return report;
    }

    public static emptyReport(): VitisImplReport {
        const report: VitisImplReport = {
            platform: "<no_platform>",
            topFunction: "<no_function>",

            clockTarget: { value: -1, unit: ClockUnit.NANOSECOND },
            clockTargetUncertainty: { value: -1, unit: UncertaintyUnit.NANOSECOND },
            clockEstim: { value: -1, unit: ClockUnit.NANOSECOND },
            frequencyMaxMHz: -1,

            latencyWorst: -1,
            latencyAvg: -1,
            latencyBest: -1,
            hasFixedLatency: true,

            execTimeWorst: { value: -1, unit: TimeUnit.MICROSECOND },
            execTimeAvg: { value: -1, unit: TimeUnit.MICROSECOND },
            execTimeBest: { value: -1, unit: TimeUnit.MICROSECOND },

            FF: -1,
            LUT: -1,
            BRAM: -1,
            DSP: -1,

            availFF: -1,
            availLUT: -1,
            availBRAM: -1,
            availDSP: -1,

            perFF: -1,
            perLUT: -1,
            perBRAM: -1,
            perDSP: -1
        };
        return report;
    }

    public static prettyPrintReport(report: VitisImplReport): string {
        const out = `${'-'.repeat(20)}`;

        console.log(out);
        return out;
    }
}