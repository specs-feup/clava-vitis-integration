import { FunctionJp, Loop, Pragma } from "@specs-feup/clava/api/Joinpoints.js";
import Query from "@specs-feup/lara/api/weaver/Query.js";
import { HlsUnroll } from "../src/directives/HlsUnroll.js";
import { HlsInline, InlineTypes } from "../src/directives/HlsInline.js";


for (const loop of Query.search(Loop)) {
    const unroll = new HlsUnroll(4, true, false);
    unroll.attach(loop);
}

for (const fun of Query.search(FunctionJp)) {
    const inline = new HlsInline(InlineTypes.RECURSIVE);
    inline.attach(fun);
}