import { AdjustedType, FunctionJp, Loop, Param, PointerType } from "@specs-feup/clava/api/Joinpoints.js";
import Query from "@specs-feup/lara/api/weaver/Query.js";
import { HlsUnroll } from "../src/directives/HlsUnroll.js";
import { HlsInline, InlineTypes } from "../src/directives/HlsInline.js";
import { HlsPipeline, PipeliningStyle } from "../src/directives/HlsPipeline.js";
import { ArrayPartitionType, HlsArrayPartition } from "../src/directives/HlsArrayPartition.js";

for (const loop of Query.search(Loop)) {
    const unroll = new HlsUnroll(4, true, false);
    unroll.attach(loop);

    const pipeline = new HlsPipeline(1);
    pipeline.setStyle(PipeliningStyle.FLUSHABLE_PIPELINE);
    pipeline.attach(loop);
}

for (const fun of Query.search(FunctionJp)) {
    const inline = new HlsInline(InlineTypes.RECURSIVE);
    inline.attach(fun);

    const pipeline = new HlsPipeline(2);
    pipeline.setStyle(PipeliningStyle.STALL_PIPELINE);
    pipeline.attach(fun);
}

for (const param of Query.search(Param)) {
    if (param.type instanceof PointerType || param.type instanceof AdjustedType) {
        const arraypart = new HlsArrayPartition(param.name, 1, 2, false, ArrayPartitionType.BLOCK);
        arraypart.attach(param);
    }
}