import { describe, expect, it } from "vitest";
import { formatUnit, splitRemainingTime } from "@/lib/countdown/split-remaining-time";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("formatUnit", () => {
  it.each([
    [0, 99, true, "00"],
    [9, 99, true, "09"],
    [10, 99, true, "10"],
    [31, 99, true, "31"],
    [150, 99, true, "99"],
    [0, 23, false, "00"],
    [9, 23, false, "09"],
    [12, 23, false, "12"],
    [23, 23, false, "23"],
    [-1, 23, false, "00"],
    [25, 23, false, "00"],
    [59, 59, false, "59"],
    [60, 59, false, "00"],
    [-1, 59, false, "00"],
    [Number.NaN, 59, false, "00"],
    [Infinity, 99, true, "00"],
  ])("formatUnit(%s, %s, %s) = %s", (v, max, clamp, out) => {
    expect(formatUnit(v, max, clamp)).toBe(out);
  });
});

describe("splitRemainingTime", () => {
  const now = 1_000_000_000_000;

  it("splits 2d3h4m30s", () => {
    const r = splitRemainingTime(now + 2 * DAY + 3 * HOUR + 4 * MIN + 30_000, now);
    expect(r).toEqual({ days: "02", hours: "03", minutes: "04", isComplete: false });
  });

  it("23h59m gives days 00", () => {
    const r = splitRemainingTime(now + 23 * HOUR + 59 * MIN, now);
    expect(r).toMatchObject({ days: "00", hours: "23", minutes: "59" });
  });

  it("exactly 60000ms is one minute, 59999ms is zero", () => {
    expect(splitRemainingTime(now + MIN, now).minutes).toBe("01");
    expect(splitRemainingTime(now + MIN - 1, now).minutes).toBe("00");
  });

  it("clamps days above 99", () => {
    expect(splitRemainingTime(now + 150 * DAY, now).days).toBe("99");
  });

  it("is complete at and after target, all zeros", () => {
    const zero = { days: "00", hours: "00", minutes: "00", isComplete: true };
    expect(splitRemainingTime(now, now)).toEqual(zero);
    expect(splitRemainingTime(now - 5 * DAY, now)).toEqual(zero);
  });

  it("is not complete 1ms before target", () => {
    expect(splitRemainingTime(now + 1, now).isComplete).toBe(false);
  });
});
