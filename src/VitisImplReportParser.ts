import Io from "@specs-feup/lara/api/lara/Io.js";
import { XMLParser } from "fast-xml-parser";
import { ClockUnit } from "./VitisHlsConfig.js";
import { VitisImplReport } from "./VitisReports.js";

export class VitisImplReportParser {
    constructor() { }

    public parseReport(reportPath: string): VitisImplReport {
        const reportData = Io.readFile(reportPath);

        const parser = new XMLParser();
        const json = parser.parse(reportData);

        const report: VitisImplReport = {
            vivadoVersion: json.profile.RunData.VIVADO_VERSION,

            clockTarget: { value: json.profile.TimingReport.TargetClockPeriod, unit: ClockUnit.NANOSECOND },
            clockAchieved: { value: json.profile.TimingReport.AchievedClockPeriod, unit: ClockUnit.NANOSECOND },

            FF: json.profile.AreaReport.Resources.FF,
            LUT: json.profile.AreaReport.Resources.LUT,
            BRAM: json.profile.AreaReport.Resources.BRAM,
            DSP: json.profile.AreaReport.Resources.DSP,

            availFF: json.profile.AreaReport.AvailableResources.FF,
            availLUT: json.profile.AreaReport.AvailableResources.LUT,
            availBRAM: json.profile.AreaReport.AvailableResources.BRAM,
            availDSP: json.profile.AreaReport.AvailableResources.DSP,

            perFF: json.profile.AreaReport.Resources.FF / json.profile.AreaReport.AvailableResources.FF,
            perLUT: json.profile.AreaReport.Resources.LUT / json.profile.AreaReport.AvailableResources.LUT,
            perBRAM: json.profile.AreaReport.Resources.BRAM / json.profile.AreaReport.AvailableResources.BRAM,
            perDSP: json.profile.AreaReport.Resources.DSP / json.profile.AreaReport.AvailableResources.DSP,

            valid: true,
            errors: []
        };

        return report;
    }

    public static emptyReport(): VitisImplReport {
        const report: VitisImplReport = {
            vivadoVersion: "<no_version>",

            clockTarget: { value: 0, unit: ClockUnit.NANOSECOND },
            clockAchieved: { value: 0, unit: ClockUnit.NANOSECOND },

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

            valid: false,
            errors: []
        };
        return report;
    }

    public static prettyPrintReport(report: VitisImplReport): string {
        const out = `${'-'.repeat(20)}
Vitis Implementation Report
${'-'.repeat(20)}
Vivado version: ${report.vivadoVersion}
Target Clock: ${report.clockTarget.value} ${report.clockTarget.unit}
Achieved Clock: ${report.clockAchieved.value} ${report.clockAchieved.unit}
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