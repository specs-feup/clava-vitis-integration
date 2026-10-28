import { jest } from "@jest/globals";
import { VitisSynReportParser } from "../src/VitisSynReportParser.js";
import { VitisImplReportParser } from "../src/VitisImplReportParser.js";

describe("Vitis report parsers", () => {
    it("parses a synthesis report", () => {
        const report = new VitisSynReportParser().parseReport("inputs/report-syn/csynth.xml");
        expect(report.topFunction).toBeTruthy();
        expect(report.latencyBest).toBeGreaterThanOrEqual(0);
        expect(report.frequencyMaxMHz).toBeGreaterThan(0);
        expect(report.availLUT).toBeGreaterThan(0);
        expect(report.perLUT).toBeGreaterThanOrEqual(0);
    });

    it("parses an implementation report", () => {
        const report = new VitisImplReportParser().parseReport("inputs/report-impl/export_impl.xml");
        expect(report.availLUT).toBeGreaterThan(0);
        expect(report.clockAchieved.value).toBeGreaterThan(0);
    });

    it("pretty-prints without throwing", () => {
        jest.spyOn(console, "log").mockImplementation(() => { });
        const syn = new VitisSynReportParser().parseReport("inputs/report-syn/csynth.xml");
        const impl = new VitisImplReportParser().parseReport("inputs/report-impl/export_impl.xml");
        expect(VitisSynReportParser.prettyPrintReport(syn)).toContain(String(syn.latencyBest));
        expect(typeof VitisImplReportParser.prettyPrintReport(impl)).toBe("string");
    });

    it("provides empty reports that are flagged as invalid", () => {
        expect(VitisSynReportParser.emptyReport().valid).toBe(false);
        expect(VitisImplReportParser.emptyReport().valid).toBe(false);
    });
});
