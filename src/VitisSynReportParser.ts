import Io from "@specs-feup/lara/api/lara/Io.js";
import { XMLParser } from "fast-xml-parser";
import { ClockUnit, UncertaintyUnit } from "./VitisHlsConfig.js";
import { TimeUnit, VitisSynReport } from "./VitisReports.js";

export class VitisSynReportParser {
    constructor() { }

    public parseReport(reportPath: string): VitisSynReport {
        const reportData = Io.readFile(reportPath);

        const parser = new XMLParser();
        const json = parser.parse(reportData);

        const period = json.profile.PerformanceEstimates.SummaryOfTimingAnalysis.EstimatedClockPeriod;
        const freqMHz = (1 / period) * 1e3;
        const hasFixedLatency = json.profile.PerformanceEstimates.SummaryOfOverallLatency["Worst-caseLatency"] ===
            json.profile.PerformanceEstimates.SummaryOfOverallLatency["Best-caseLatency"];

        const execWorst = json.profile.PerformanceEstimates.SummaryOfOverallLatency["Worst-caseRealTimeLatency"].split(" ") as string[];
        if (execWorst.length == 1 && execWorst[0] === "undef") {
            execWorst[0] = "-1";
            execWorst[1] = TimeUnit.MICROSECOND;
        }
        const execAvg = json.profile.PerformanceEstimates.SummaryOfOverallLatency["Average-caseRealTimeLatency"].split(" ") as string[];
        if (execAvg.length == 1 && execAvg[0] === "undef") {
            execAvg[0] = "-1";
            execAvg[1] = TimeUnit.MICROSECOND;
        }
        const execBest = json.profile.PerformanceEstimates.SummaryOfOverallLatency["Best-caseRealTimeLatency"].split(" ") as string[];
        if (execBest.length == 1 && execBest[0] === "undef") {
            execBest[0] = "-1";
            execBest[1] = TimeUnit.MICROSECOND;
        }

        let latencyWorst = json.profile.PerformanceEstimates.SummaryOfOverallLatency["Worst-caseLatency"];
        if (latencyWorst === "undef") {
            latencyWorst = -1;
        }
        let latencyAvg = json.profile.PerformanceEstimates.SummaryOfOverallLatency["Average-caseLatency"];
        if (latencyAvg === "undef") {
            latencyAvg = -1;
        }
        let latencyBest = json.profile.PerformanceEstimates.SummaryOfOverallLatency["Best-caseLatency"];
        if (latencyBest === "undef") {
            latencyBest = -1;
        }

        const report: VitisSynReport = {
            platform: json.profile.UserAssignments.Part,
            topFunction: json.profile.UserAssignments.TopModelName,

            clockTarget: { value: json.profile.UserAssignments.TargetClockPeriod, unit: ClockUnit.NANOSECOND },
            clockTargetUncertainty: { value: json.profile.UserAssignments.ClockUncertainty, unit: UncertaintyUnit.NANOSECOND },
            clockEstim: { value: json.profile.PerformanceEstimates.SummaryOfTimingAnalysis.EstimatedClockPeriod, unit: ClockUnit.NANOSECOND },
            frequencyMaxMHz: freqMHz,

            latencyWorst: latencyWorst,
            latencyAvg: latencyAvg,
            latencyBest: latencyBest,
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
            perDSP: json.profile.AreaEstimates.Resources.DSP / json.profile.AreaEstimates.AvailableResources.DSP,

            errors: []
        };

        return report;
    }

    public static emptyReport(): VitisSynReport {
        const report: VitisSynReport = {
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
            perDSP: -1,

            errors: []
        };
        return report;
    }

    public static prettyPrintReport(report: VitisSynReport): string {
        const out = `${'-'.repeat(20)}
Vitis HLS Synthesis Report
${'-'.repeat(20)}
Platform: ${report.platform}
Top Function: ${report.topFunction} 
${'-'.repeat(20)}
Target Clock: ${report.clockTarget.value} ${report.clockTarget.unit} 
Clock Uncertainty: ${report.clockTargetUncertainty.value} ${report.clockTargetUncertainty.unit} 
Estimated Clock: ${report.clockEstim.value} ${report.clockEstim.unit} 
Max Frequency: ${report.frequencyMaxMHz.toFixed(2)} MHz
${'-'.repeat(20)}
Worst Latency: ${report.latencyWorst} 
Average Latency: ${report.latencyAvg} 
Best Latency: ${report.latencyBest} 
Has Fixed Latency: ${report.hasFixedLatency ? "yes" : "no"} 
${'-'.repeat(20)}
Worst Execution Time: ${report.execTimeWorst.value} ${report.execTimeWorst.unit} 
Average Execution Time: ${report.execTimeAvg.value} ${report.execTimeAvg.unit} 
Best Execution Time: ${report.execTimeBest.value} ${report.execTimeBest.unit} 
${'-'.repeat(20)}
Used FF: ${report.FF} 
Used LUT: ${report.LUT} 
Used BRAM: ${report.BRAM} 
Used DSP: ${report.DSP} 
${'-'.repeat(20)}
Available FF: ${report.availFF} 
Available LUT: ${report.availLUT} 
Available BRAM: ${report.availBRAM} 
Available DSP: ${report.availDSP} 
${'-'.repeat(20)}
FF %: ${(Math.round(report.perFF * 100)).toFixed(2)}% 
LUT %: ${(Math.round(report.perLUT * 100)).toFixed(2)}% 
BRAM %: ${(Math.round(report.perBRAM * 100)).toFixed(2)}% 
DSP %: ${(Math.round(report.perDSP * 100)).toFixed(2)}% 
${'-'.repeat(20)}`;
        console.log(out);
        return out;
    }
}