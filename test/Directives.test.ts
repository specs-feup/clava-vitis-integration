import { jest } from "@jest/globals";
import { registerSourceCode } from "@specs-feup/lara/jest/jestHelpers.js";
import { FunctionJp, Joinpoint, Loop, Pragma } from "@specs-feup/clava/api/Joinpoints.js";
import Query from "@specs-feup/lara/api/weaver/Query.js";
import { HlsUnroll } from "../src/directives/HlsUnroll.js";
import { HlsPipeline, PipeliningStyle } from "../src/directives/HlsPipeline.js";
import { HlsInline, InlineTypes } from "../src/directives/HlsInline.js";
import { ArrayPartitionType, HlsArrayPartition } from "../src/directives/HlsArrayPartition.js";

const code = `
int dotprod(int a[16], int b[16]) {
    int sum = 0;
    for (int i = 0; i < 16; i++) {
        sum += a[i] * b[i];
    }
    return sum;
}
`;

const text = (p: Pragma) => `${p.name} ${p.content}`;

/** Unattached pragmas have no parsed name/content, so the text is read back after inserting into real code. */
function render(directive: { attach(jp: never): Joinpoint | null }, target: Joinpoint): string {
    const inserted = directive.attach(target as never);
    const result = hlsPragmas();
    inserted!.detach();
    expect(result).toHaveLength(1);
    return result[0];
}
const hlsPragmas = () => (Query.search(Pragma).get() as Pragma[]).filter(p => p.name === "HLS").map(text);

describe("HLS directives", () => {
    registerSourceCode(code);

    const fun = () => Query.search(FunctionJp, { name: "dotprod" }).first()!;
    const loop = () => Query.searchFrom(fun(), Loop).first()!;

    describe("pragma text", () => {
        it("unroll", () => {
            expect(render(new HlsUnroll(4), loop())).toBe("HLS unroll factor=4");
            expect(render(new HlsUnroll(4, true), loop())).toBe("HLS unroll factor=4 skip_exit_check");
            expect(render(new HlsUnroll(0), loop())).toBe("HLS unroll");
        });

        it("pipeline", () => {
            expect(render(new HlsPipeline(2), loop())).toBe("HLS pipeline II=2 style=stp");
            expect(render(new HlsPipeline(1, false, true, PipeliningStyle.FLUSHABLE_PIPELINE), loop()))
                .toBe("HLS pipeline II=1 rewind style=flp");
        });

        it("inline", () => {
            expect(render(new HlsInline(), fun())).toBe("HLS inline");
            expect(render(new HlsInline(InlineTypes.RECURSIVE), fun())).toBe("HLS inline recursive");
            expect(render(new HlsInline(InlineTypes.OFF), fun())).toBe("HLS inline off");
        });

        it("array partition", () => {
            expect(render(new HlsArrayPartition("a", 1, 4, false, ArrayPartitionType.CYCLIC), fun().params[0]))
                .toBe("HLS array_partition a type=cyclic factor=4 dim=1");
            expect(render(new HlsArrayPartition("b", 2, 0, false, ArrayPartitionType.COMPLETE), fun().params[0]))
                .toBe("HLS array_partition b type=complete dim=2");
        });
    });

    describe("setters", () => {
        it("reject non-positive factors and keep the previous value", () => {
            const warn = jest.spyOn(console, "warn").mockImplementation(() => { });
            const unroll = new HlsUnroll(4);
            unroll.setFactor(0);
            expect(unroll.getFactor()).toBe(4);
            const pipe = new HlsPipeline(2);
            pipe.setInitiationInterval(-1);
            expect(pipe.getInitiationInterval()).toBe(2);
            const part = new HlsArrayPartition("a", 1, 4);
            part.setFactor(0);
            expect(part.getFactor()).toBe(4);
            expect(warn).toHaveBeenCalledTimes(3);
            warn.mockRestore();
        });
    });

    describe("applyParams", () => {
        it("updates the same object in place", () => {
            const unroll = new HlsUnroll(2);
            unroll.applyParams({ enabled: true, factor: 8, skipExitCheck: true });
            expect(unroll.getFactor()).toBe(8);
            expect(unroll.getSkipExitCheck()).toBe(true);
        });

        it("covers every directive kind", () => {
            const pipe = new HlsPipeline();
            pipe.applyParams({ enabled: true, initiationInterval: 3, rewind: true, style: PipeliningStyle.FREERUNNING_PIPELINE });
            expect([pipe.getInitiationInterval(), pipe.getRewind(), pipe.getStyle()]).toEqual([3, true, PipeliningStyle.FREERUNNING_PIPELINE]);

            const inline = new HlsInline();
            inline.applyParams({ enabled: true, inlineType: InlineTypes.RECURSIVE });
            expect(render(inline, fun())).toBe("HLS inline recursive");

            const part = new HlsArrayPartition("a", 1);
            part.applyParams({ enabled: true, dimension: 2, factor: 8, type: ArrayPartitionType.BLOCK });
            expect([part.getDimension(), part.getFactor(), part.getType()]).toEqual([2, 8, ArrayPartitionType.BLOCK]);
        });
    });

    describe("attach", () => {
        it("inserts the pragma at the start of the loop body and returns the inserted node", () => {
            const inserted = new HlsUnroll(2).attach(loop());
            expect(inserted).not.toBeNull();
            expect(hlsPragmas()).toEqual(["HLS unroll factor=2"]);
            inserted!.detach();
            expect(hlsPragmas()).toEqual([]);
        });

        it("inserts array partitions at the start of the function body", () => {
            const inserted = new HlsArrayPartition("a", 1, 2).attach(fun().params[0]);
            expect(fun().code).toMatch(/int sum = 0;/);
            expect(hlsPragmas()).toEqual(["HLS array_partition a type=cyclic factor=2 dim=1"]);
            inserted!.detach();
        });
    });
});
