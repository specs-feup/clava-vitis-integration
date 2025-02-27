import { HlsReportParser } from "../src/VitisSynReportParser.js";

const parser = new HlsReportParser();

const report = parser.parseReport("inputs/report/csynth.xml");
HlsReportParser.prettyPrintReport(report);
