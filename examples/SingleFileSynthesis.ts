import Query from "@specs-feup/lara/api/weaver/Query.js";
import { FileJp } from "@specs-feup/clava/api/Joinpoints.js";
import { AmdPlatform, ClockUnit, VitisHlsConfig, OutputFormat, UncertaintyUnit } from "../src/VitisHlsConfig.js";
import { VitisHls } from "../src/VitisHls.js";

const files: FileJp[] = [];
for (const file of Query.search(FileJp)) {
    files.push(file);
}

const config = new VitisHlsConfig("foo")
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
const report = vitis.synthesize(true, false, true);

console.log(report);