import { ClockUnit, UncertaintyUnit } from "./VitisHlsConfig.js";
import { VitisImplReportParser } from "./VitisImplReportParser.js";
import { TimeUnit } from "./VitisReports.js";
import { VitisSynReportParser } from "./VitisSynReportParser.js";

describe("Vitis report parsers", () => {
  it("parses a synthesis report", () => {
    const report = new VitisSynReportParser().parseReport(
      "inputs/report-syn/csynth.xml",
    );

    expect(report).toMatchObject({
      valid: true,
      errors: [],
      vitisVersion: 2024.1,
      platform: "xczu9eg-ffvb1156-2-e",
      topFunction: "foo",
      clockTarget: { value: 10, unit: ClockUnit.NANOSECOND },
      clockTargetUncertainty: { value: 2, unit: UncertaintyUnit.NANOSECOND },
      clockEstim: { value: 8, unit: ClockUnit.NANOSECOND },
      frequencyMaxMHz: 125,
      latencyWorst: 6_021_801,
      latencyAvg: 6_018_201,
      latencyBest: 6_014_601,
      hasFixedLatency: false,
      execTimeWorst: { value: 60.218, unit: TimeUnit.MILLISECOND },
      execTimeAvg: { value: 60.182, unit: TimeUnit.MILLISECOND },
      execTimeBest: { value: 60.146, unit: TimeUnit.MILLISECOND },
      FF: 4096,
      LUT: 5425,
      BRAM: 30,
      DSP: 0,
      availFF: 548160,
      availLUT: 274080,
      availBRAM: 1824,
      availDSP: 2520,
    });
    expect(report.perFF).toBeCloseTo(4096 / 548160);
    expect(report.perLUT).toBeCloseTo(5425 / 274080);
    expect(report.perBRAM).toBeCloseTo(30 / 1824);
    expect(report.perDSP).toBe(0);
    expect(Date.parse(report.timestamp)).not.toBeNaN();
  });

  it("parses an implementation report", () => {
    const report = new VitisImplReportParser().parseReport(
      "inputs/report-impl/export_impl.xml",
    );

    expect(report).toMatchObject({
      valid: true,
      errors: [],
      vivadoVersion: "v.2024.2",
      clockTarget: { value: 6.667, unit: ClockUnit.NANOSECOND },
      clockAchieved: { value: 3.311, unit: ClockUnit.NANOSECOND },
      FF: 4246,
      LUT: 3719,
      BRAM: 3,
      DSP: 0,
      availFF: 548160,
      availLUT: 274080,
      availBRAM: 1824,
      availDSP: 2520,
    });
    expect(report.perFF).toBeCloseTo(4246 / 548160);
    expect(report.perLUT).toBeCloseTo(3719 / 274080);
    expect(report.perBRAM).toBeCloseTo(3 / 1824);
    expect(report.perDSP).toBe(0);
    expect(Date.parse(report.timestamp)).not.toBeNaN();
  });

  it("creates an invalid empty synthesis report", () => {
    const report = VitisSynReportParser.emptyReport();

    expect(report).toMatchObject({
      valid: false,
      errors: [],
      platform: "<no_platform>",
      topFunction: "<no_function>",
      vitisVersion: "<no_version>",
      latencyWorst: -1,
      execTimeWorst: { value: -1, unit: TimeUnit.MICROSECOND },
    });
  });

  it("creates an invalid empty implementation report", () => {
    const report = VitisImplReportParser.emptyReport();

    expect(report).toMatchObject({
      valid: false,
      errors: [],
      vivadoVersion: "<no_version>",
      clockTarget: { value: 0, unit: ClockUnit.NANOSECOND },
      clockAchieved: { value: 0, unit: ClockUnit.NANOSECOND },
      FF: -1,
      LUT: -1,
      BRAM: -1,
      DSP: -1,
    });
  });
});
