import { registerSourceCode } from "@specs-feup/lara/jest/jestHelpers.js";
import { FunctionJp, Loop, Pragma } from "@specs-feup/clava/api/Joinpoints.js";
import Query from "@specs-feup/lara/api/weaver/Query.js";
import { DseEngine } from "../src/DseEngine.js";

const code = `
int dotprod(int a[16], int b[16]) {
    int sum = 0;
    for (int i = 0; i < 16; i++) {
        sum += a[i] * b[i];
    }
    return sum;
}

int helper(int x) {
    return x + 1;
}
`;

function hlsPragmas(): string[] {
    const pragmas = Query.search(Pragma).get() as Pragma[];
    return pragmas.filter(p => p.name === "HLS").map(p => `${p.name} ${p.content}`);
}

describe("DseEngine on real code", () => {
    registerSourceCode(code);

    it("inserts and removes the directives of each design", () => {
        const fun = Query.search(FunctionJp, { name: "dotprod" }).first()!;
        const loop = Query.searchFrom(fun, Loop).first()!;
        const dse = new DseEngine(fun).on(loop).alias("L1").unroll().withFactors([2, 4]);

        const designs = [...dse.designs()];
        expect(designs).toHaveLength(2);

        dse.applyDesign(designs[0]);
        expect(hlsPragmas()).toEqual(["HLS unroll factor=2"]);
        dse.applyDesign(designs[1]);
        expect(hlsPragmas()).toEqual(["HLS unroll factor=4"]);
        dse.clearDesign();
        expect(hlsPragmas()).toHaveLength(0);
    });

    describe("search space", () => {
        const setup = () => {
            const fun = Query.search(FunctionJp, { name: "dotprod" }).first()!;
            const loop = Query.searchFrom(fun, Loop).first()!;
            return { fun, loop, dse: new DseEngine(fun) };
        };

        it("builds the cartesian product, numbers designs and names them", () => {
            const { dse, loop } = setup();
            dse.on(loop).alias("L1")
                .unroll().withFactors([2, 4]).withSkipExitCheck().withNoSkipExitCheck()
                .pipeline().withInitiationIntervals([1, 2, 3]);
            const designs = [...dse.designs()];
            expect(designs).toHaveLength(12);
            expect(designs.map(d => d.id)).toEqual([...Array(12).keys()]);
            expect(dse.designId(designs[0])).toMatch(/^L1\.unr-f2-sk1\+L1\.pipe-ii1/);
        });

        it("rejects directives on the wrong target type", () => {
            const { fun, dse, loop } = setup();
            expect(() => dse.on(fun.params[0]).unroll()).toThrow(/requires a loop target/);
            expect(() => dse.on(loop).partitionArray()).toThrow(/requires a param target/);
            expect(() => dse.on(loop).inline()).toThrow(/requires a function target/);
        });

        it("rejects modifiers after the wrong directive", () => {
            const { dse, loop } = setup();
            dse.on(loop).pipeline();
            expect(() => dse.withFactors([2])).toThrow(/only valid after/);
        });

        it("ties partition factors to their type", () => {
            const { fun, dse } = setup();
            dse.on(fun.params[0]).partitionArray()
                .withBlockPartitioning([2, 4]).withCyclicPartitioning([8]).withCompletePartitioning();
            expect([...dse.designs()]).toHaveLength(4);
        });
    });
});
