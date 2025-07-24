import { FileJp, FunctionJp } from "@specs-feup/clava/api/Joinpoints.js";
import Query from "@specs-feup/lara/api/weaver/Query.js";
import { AmdPlatform, ClockUnit, OutputFormat, UncertaintyUnit, VitisHlsConfig } from "../src/VitisHlsConfig.js";
import { VitisHls } from "../src/VitisHls.js";

for (const fun of Query.search(FunctionJp, { isImplementation: true })) {
    if (fun.name === "main") {
        console.warn("Skipping main");
        continue;
    }
    const file = fun.getAncestor("file") as FileJp | undefined;
    if (!file) {
        console.warn(`Function ${fun.name} does not have an ancestor file. Skipping...`);
        continue;
    }

    const config = new VitisHlsConfig(fun.name)
        .addSource(file)
        .setClock({ value: 100, unit: ClockUnit.MEGAHERTZ })
        .setUncertainty({ value: 2, unit: UncertaintyUnit.NANOSECOND })
        .setPlatform(AmdPlatform.ZCU102)
        .setOutputFormat(OutputFormat.VITIS_XO);
    const vitis = new VitisHls().setConfig(config);
    const report = vitis.synthesize();

    console.log(report);
}