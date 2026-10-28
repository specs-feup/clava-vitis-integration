import { VitisImplReportParser } from "../src/VitisImplReportParser.js";

const parser = new VitisImplReportParser();
const report = parser.parseReport("inputs/report-impl/export_impl.xml");

VitisImplReportParser.prettyPrintReport(report);
