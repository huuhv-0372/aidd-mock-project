import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { setLocale } from "@/lib/i18n/set-locale-action";

const cookieSet = vi.hoisted(() => vi.fn());
vi.mock("next/headers", () => ({ cookies: async () => ({ set: cookieSet }) }));

describe("setLocale", () => {
  let errorSpy: MockInstance;
  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    cookieSet.mockReset();
  });
  afterEach(() => errorSpy.mockRestore());

  it("stores a supported locale in NEXT_LOCALE for a year, site-wide", async () => {
    await setLocale("en");
    expect(cookieSet).toHaveBeenCalledWith(
      "NEXT_LOCALE",
      "en",
      expect.objectContaining({ path: "/", maxAge: 31536000, sameSite: "lax", httpOnly: true }),
    );
  });

  it.each(["jp", "EN", "", null, { locale: "en" }])("ignores unsupported input %j", async (value) => {
    await expect(setLocale(value)).resolves.toBeUndefined();
    expect(cookieSet).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("logs and swallows a cookie write failure instead of surfacing it", async () => {
    cookieSet.mockImplementation(() => {
      throw new Error("internal detail");
    });
    await expect(setLocale("vi")).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
  });
});
