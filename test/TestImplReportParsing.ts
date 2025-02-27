import { VitisImplReportParser } from "../src/VitisImplReportParser.js";
const parser = new VitisImplReportParser();

const report = parser.parseReport("inputs/report-syn/csynth.xml");
VitisImplReportParser.prettyPrintReport(report);
