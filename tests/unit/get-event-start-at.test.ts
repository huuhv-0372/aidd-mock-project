import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getEventStartAt, isEventLaunched } from "@/lib/event/get-event-start-at";

const LOG = "[countdown-gate] EVENT_START_AT missing or invalid";

describe("getEventStartAt", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => errorSpy.mockRestore());

  it("parses an ISO value with +07:00 offset", () => {
    expect(getEventStartAt("2026-11-01T09:00:00+07:00")).toBe(Date.UTC(2026, 10, 1, 2, 0, 0));
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("parses a Z value", () => {
    expect(getEventStartAt("2026-11-01T02:00:00Z")).toBe(Date.UTC(2026, 10, 1, 2, 0, 0));
  });

  it.each([
    ["undefined", undefined],
    ["empty", ""],
    ["garbage", "not-a-date"],
    ["no offset", "2026-11-01T09:00:00"],
    ["impossible date", "2026-02-30T09:00:00+07:00"],
    ["impossible month", "2026-13-01T09:00:00Z"],
  ])("returns null and logs once for %s", (_name, raw) => {
    expect(getEventStartAt(raw)).toBeNull();
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(LOG);
    if (raw) expect(String(errorSpy.mock.calls[0])).not.toContain(raw);
  });

  it("reads process.env.EVENT_START_AT by default", () => {
    vi.stubEnv("EVENT_START_AT", "2026-11-01T02:00:00Z");
    expect(getEventStartAt()).toBe(Date.UTC(2026, 10, 1, 2, 0, 0));
    vi.unstubAllEnvs();
  });
});

describe("isEventLaunched", () => {
  it("is true when start is null (fail-open)", () => expect(isEventLaunched(null, 0)).toBe(true));
  it("is false before start", () => expect(isEventLaunched(1000, 999)).toBe(false));
  it("is true at start", () => expect(isEventLaunched(1000, 1000)).toBe(true));
  it("is true after start", () => expect(isEventLaunched(1000, 1001)).toBe(true));
});
