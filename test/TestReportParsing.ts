import { HlsReportParser } from "../src/HlsReportParser.js";

const parser = new HlsReportParser();

const report = parser.parseReport("inputs/report/csynth.xml");
parser.prettyPrint(report);
