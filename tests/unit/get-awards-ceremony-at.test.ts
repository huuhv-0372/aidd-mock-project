import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAwardsCeremonyAt } from "@/lib/event/get-awards-ceremony-at";

const LOG = "[home-countdown] AWARDS_CEREMONY_AT missing or invalid";

describe("getAwardsCeremonyAt", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    errorSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it("parses an ISO value with +07:00 offset", () => {
    expect(getAwardsCeremonyAt("2026-12-26T18:30:00+07:00")).toBe(Date.UTC(2026, 11, 26, 11, 30, 0));
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("parses a Z value", () => {
    expect(getAwardsCeremonyAt("2026-12-26T11:30:00Z")).toBe(Date.UTC(2026, 11, 26, 11, 30, 0));
  });

  it.each([
    ["undefined", undefined],
    ["empty", ""],
    ["garbage", "not-a-date"],
    ["no offset", "2026-12-26T18:30:00"],
    ["impossible date", "2026-02-30T18:30:00+07:00"],
  ])("returns null and logs once for %s", (_name, raw) => {
    expect(getAwardsCeremonyAt(raw)).toBeNull();
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(LOG);
  });

  it("reads process.env.AWARDS_CEREMONY_AT by default", () => {
    vi.stubEnv("AWARDS_CEREMONY_AT", "2026-12-26T11:30:00Z");
    expect(getAwardsCeremonyAt()).toBe(Date.UTC(2026, 11, 26, 11, 30, 0));
  });
});
