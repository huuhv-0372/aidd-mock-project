import { describe, expect, it } from "vitest";
import { getClockOffsetMs, getCorrectedNowMs } from "@/lib/countdown/server-clock-offset";

describe("server clock offset", () => {
  it("computes server minus client", () => {
    expect(getClockOffsetMs(5_000, 2_000)).toBe(3_000);
    expect(getClockOffsetMs(2_000, 5_000)).toBe(-3_000);
  });

  it("round-trips: corrected now equals server now at sample time", () => {
    const offset = getClockOffsetMs(1_700_000_005_000, 1_700_000_000_000);
    expect(getCorrectedNowMs(offset, 1_700_000_000_000)).toBe(1_700_000_005_000);
    expect(getCorrectedNowMs(offset, 1_700_000_010_000)).toBe(1_700_000_015_000);
  });
});
