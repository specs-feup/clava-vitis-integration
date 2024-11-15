import Query from "@specs-feup/lara/api/weaver/Query.js";
import { FileJp } from "@specs-feup/clava/api/Joinpoints.js";
import { AmdPlatform, ClockUnit, HlsConfig, OutputFormat, UncertaintyUnit } from "../src/HlsConfig.js";
import { VitisHls } from "../src/VitisHls.js";
import { HlsReportParser } from "../src/HlsReportParser.js";

const files: FileJp[] = [];
for (const file of Query.search(FileJp)) {
    files.push(file);
}

const config = new HlsConfig("convolve2d")
    .addSources(files)
    .setClock({ value: 100, unit: ClockUnit.MEGAHERTZ })
    .setUncertainty({ value: 2, unit: UncertaintyUnit.NANOSECOND })
    .setPlatform(AmdPlatform.ZCU102)
    .setOutputFormat(OutputFormat.VITIS_XO);

const cfg = config.generateConfigFile();
console.log("---------------------------------");
console.log(cfg);
console.log("---------------------------------");

const vitis = new VitisHls().setConfig(config);
const report = vitis.synthesize(true);
HlsReportParser.prettyPrintReport(report);

console.log("Finished synthesis in verbose mode. Doing it again in silent mode...");

const reportSilent = vitis.synthesize(true, true);
HlsReportParser.prettyPrintReport(reportSilent);

console.log("Finished synthesis in silent mode.");