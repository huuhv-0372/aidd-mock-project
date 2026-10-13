import { describe, expect, it } from "vitest";
import { getHomeCountdown } from "@/lib/countdown/get-home-countdown";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const START = Date.UTC(2026, 11, 26, 12, 0, 0);

describe("getHomeCountdown", () => {
  it("shows remaining days/hours/minutes and the label before start", () => {
    const now = START - (2 * DAY + 3 * HOUR + 4 * MINUTE);
    expect(getHomeCountdown(START, now)).toEqual({
      days: "02",
      hours: "03",
      minutes: "04",
      showComingSoon: true,
    });
  });

  it("drops the minutes by one a minute later", () => {
    const now = START - (2 * DAY + 3 * HOUR + 4 * MINUTE);
    expect(getHomeCountdown(START, now + MINUTE).minutes).toBe("03");
  });

  it("pads single digits", () => {
    const result = getHomeCountdown(START, START - (5 * HOUR + 9 * MINUTE));
    expect(result).toMatchObject({ days: "00", hours: "05", minutes: "09" });
  });

  it.each([0, 1, DAY])("shows 00 and hides the label at or after start (+%dms)", (offset) => {
    expect(getHomeCountdown(START, START + offset)).toEqual({
      days: "00",
      hours: "00",
      minutes: "00",
      showComingSoon: false,
    });
  });

  it.each([null, Number.NaN, Number.POSITIVE_INFINITY])(
    "falls back to 00 with the label hidden for start %s",
    (start) => {
      expect(getHomeCountdown(start, START)).toEqual({
        days: "00",
        hours: "00",
        minutes: "00",
        showComingSoon: false,
      });
    },
  );

  it("clamps more than 99 days to 99", () => {
    const result = getHomeCountdown(START, START - 150 * DAY);
    expect(result.days).toBe("99");
    expect(result.showComingSoon).toBe(true);
  });
});
