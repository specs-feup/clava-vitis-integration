import { convertTimeUnit, TimeUnit } from "./VitisReports.js";

describe("convertTimeUnit", () => {
  it("converts between supported time units", () => {
    expect(convertTimeUnit(1, TimeUnit.SECOND, TimeUnit.MILLISECOND)).toBeCloseTo(1_000);
    expect(convertTimeUnit(1, TimeUnit.MILLISECOND, TimeUnit.MICROSECOND)).toBeCloseTo(1_000);
    expect(convertTimeUnit(1, TimeUnit.MICROSECOND, TimeUnit.NANOSECOND)).toBeCloseTo(1_000);
  });

  it("converts smaller units to larger units", () => {
    expect(convertTimeUnit(2_500_000, TimeUnit.NANOSECOND, TimeUnit.MILLISECOND)).toBeCloseTo(2.5);
  });

  it("leaves a value unchanged when the units match", () => {
    expect(convertTimeUnit(42, TimeUnit.MICROSECOND, TimeUnit.MICROSECOND)).toBe(42);
  });
});
