import { jest } from "@jest/globals";
import { registerSourceCodes } from "@specs-feup/lara/jest/jestHelpers.js";
import { FileJp } from "@specs-feup/clava/api/Joinpoints.js";
import Query from "@specs-feup/lara/api/weaver/Query.js";
import { AmdPlatform, ClockUnit, FlowTarget, OutputFormat, UncertaintyUnit, VitisHlsConfig } from "../src/VitisHlsConfig.js";

describe("VitisHlsConfig", () => {
    registerSourceCodes({ "a.cpp": "int a() { return 1; }", "b.cpp": "int b() { return 2; }" });

    it("generates a config file from its settings", () => {
        const files = Query.search(FileJp).get() as FileJp[];
        const log = jest.spyOn(console, "log").mockImplementation(() => { });
        const cfg = new VitisHlsConfig("top")
            .setPlatform(AmdPlatform.ZCU102)
            .setClock({ value: 100, unit: ClockUnit.MEGAHERTZ })
            .setUncertainty({ value: 2, unit: UncertaintyUnit.NANOSECOND })
            .setFlowTarget(FlowTarget.VITIS)
            .setOutputFormat(OutputFormat.VITIS_XO)
            .addSources(files)
            .generateConfigFile();
        log.mockRestore();

        expect(cfg).toContain("part=xczu9eg-ffvb1156-2-e");
        expect(cfg).toContain("clock=100MHz");
        expect(cfg).toContain("clock_uncertainty=2ns");
        expect(cfg).toContain("flow_target=vitis");
        expect(cfg).toContain("package.output.format=xo");
        expect(cfg).toContain("syn.top=top");
        for (const f of files) {
            expect(cfg).toContain(`syn.file=${f.filename}`);
        }
    });

    it("does not duplicate sources", () => {
        const [first] = Query.search(FileJp).get() as FileJp[];
        const cfg = new VitisHlsConfig("top").addSource(first).addSource(first);
        expect(cfg.getSources()).toHaveLength(1);
    });

    it("adds every program file with addDefaultSources", () => {
        const cfg = new VitisHlsConfig("top").addDefaultSources();
        expect(cfg.getSources().map(f => f.name).sort()).toEqual(expect.arrayContaining(["a.cpp", "b.cpp"]));
    });
});
