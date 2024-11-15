import { Call, FileJp, FunctionJp, Loop } from "@specs-feup/clava/api/Joinpoints.js";
import Query from "@specs-feup/lara/api/weaver/Query.js";
import { HlsUnroll } from "../src/directives/HlsUnroll.js";
import { HlsInline, InlineTypes } from "../src/directives/HlsInline.js";
import { HlsPipeline, PipeliningStyle } from "../src/directives/HlsPipeline.js";
import { AmdPlatform, ClockUnit, HlsConfig, OutputFormat, UncertaintyUnit } from "../src/HlsConfig.js";
import { VitisHls } from "../src/VitisHls.js";

const ed = Query.search(FunctionJp, { name: "edge_detect" }).first() as FunctionJp;

const visitedFun = new Set<string>();
const visitedLoop = new Set<string>();

for (const call of Query.searchFrom(ed, Call)) {
    const fun = call.function;

    if (!visitedFun.has(fun.astId)) {
        const inline = new HlsInline(InlineTypes.RECURSIVE);
        inline.attach(fun);
        visitedFun.add(fun.astId);
    }

    for (const loop of Query.searchFrom(fun, Loop)) {
        if (!visitedLoop.has(loop.astId)) {
            const unroll = new HlsUnroll(4, true, false);
            unroll.attach(loop);

            const pipeline = new HlsPipeline(1);
            pipeline.setStyle(PipeliningStyle.FLUSHABLE_PIPELINE);
            pipeline.attach(loop);

            visitedLoop.add(loop.astId);
        }
    }
}

const files: FileJp[] = [];
for (const file of Query.search(FileJp)) {
    files.push(file);
}

const config = new HlsConfig("edge_detect")
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
const report = vitis.synthesize();

console.log(report);