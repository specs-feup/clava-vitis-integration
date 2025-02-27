import { VitisSynReportParser } from "../src/VitisSynReportParser.js";

const parser = new VitisSynReportParser();

const report = parser.parseReport("inputs/report-syn/csynth.xml");
VitisSynReportParser.prettyPrintReport(report);
