import {
  AmdPlatform,
  ClockUnit,
  FlowTarget,
  OutputFormat,
  UncertaintyUnit,
  VitisHlsConfig,
} from "./VitisHlsConfig.js";

describe("VitisHlsConfig", () => {
  it("uses the documented defaults", () => {
    const config = new VitisHlsConfig("kernel");

    expect(config.getTopFunction()).toBe("kernel");
    expect(config.getPlatform()).toBe(AmdPlatform.ZCU102);
    expect(config.getClock()).toEqual({ value: 10, unit: ClockUnit.NANOSECOND });
    expect(config.getUncertainty()).toEqual({
      value: 2.5,
      unit: UncertaintyUnit.NANOSECOND,
    });
    expect(config.getFlowTarget()).toBe(FlowTarget.VITIS);
    expect(config.getOutputFormat()).toBe(OutputFormat.VITIS_XO);
    expect(config.isPackagingEnabled()).toBe(false);
    expect(config.getSources()).toEqual([]);
  });

  it("supports fluent configuration", () => {
    const config = new VitisHlsConfig("oldKernel");

    const result = config
      .setTopFunction("newKernel")
      .setPlatform("custom-part")
      .setClock({ value: 250, unit: ClockUnit.MEGAHERTZ })
      .setUncertainty({ value: 10, unit: UncertaintyUnit.PERCENTAGE })
      .setFlowTarget(FlowTarget.VIVADO)
      .setOutputFormat(OutputFormat.RTL)
      .setEnablePackaging(true);

    expect(result).toBe(config);
    expect(config.getTopFunction()).toBe("newKernel");
    expect(config.getPlatform()).toBe("custom-part");
    expect(config.getClock()).toEqual({ value: 250, unit: ClockUnit.MEGAHERTZ });
    expect(config.getUncertainty()).toEqual({
      value: 10,
      unit: UncertaintyUnit.PERCENTAGE,
    });
    expect(config.getFlowTarget()).toBe(FlowTarget.VIVADO);
    expect(config.getOutputFormat()).toBe(OutputFormat.RTL);
    expect(config.isPackagingEnabled()).toBe(true);
  });

  it("generates a Vitis configuration and de-duplicates sources", () => {
    type Source = Parameters<VitisHlsConfig["addSource"]>[0];
    const sourceA = { filename: "kernel.cpp", path: "/src/kernel.cpp" } as Source;
    const sourceB = { filename: "helper.cpp", path: "/src/helper.cpp" } as Source;
    const config = new VitisHlsConfig("kernel")
      .addSource(sourceA)
      .addSources([sourceA, sourceB]);

    const generated = config.generateConfigFile();

    expect(config.getSources()).toEqual([sourceA, sourceB]);
    expect(generated).toContain(`part=${AmdPlatform.ZCU102}`);
    expect(generated).toContain("syn.top=kernel");
    expect(generated).toContain("clock=10ns");
    expect(generated.match(/syn\.file=kernel\.cpp/g)).toHaveLength(1);
    expect(generated).toContain("syn.file=helper.cpp");
  });
});
