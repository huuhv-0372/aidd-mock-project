import { describe, expect, it } from "vitest";
import { isLocale, resolveLocale } from "@/lib/i18n/locales";
import { localeSchema } from "@/lib/validation/locale";

describe("isLocale", () => {
  it.each([
    ["vi", true],
    ["en", true],
    ["jp", false],
    ["EN", false],
    ["", false],
    [undefined, false],
    [1, false],
  ])("isLocale(%j) -> %s", (value, expected) => {
    expect(isLocale(value)).toBe(expected);
  });
});

describe("resolveLocale", () => {
  it.each([undefined, null, "", "jp", "EN ", "vi-VN"])("falls back to vi for %j", (value) => {
    expect(resolveLocale(value)).toBe("vi");
  });

  it("keeps en and vi", () => {
    expect(resolveLocale("en")).toBe("en");
    expect(resolveLocale("vi")).toBe("vi");
  });
});

describe("localeSchema", () => {
  it.each(["jp", "", 1, "EN", null])("rejects %j", (value) => {
    expect(localeSchema.safeParse(value).success).toBe(false);
  });

  it.each(["vi", "en"])("accepts %j", (value) => {
    expect(localeSchema.safeParse(value).success).toBe(true);
  });
});
