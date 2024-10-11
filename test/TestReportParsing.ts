import { VitisHlsReportParser } from "../src/VitisHlsReportParser.js";

const parser = new VitisHlsReportParser();

const report = parser.parseReport("inputs/report/csynth.xml");
parser.prettyPrint(report);
