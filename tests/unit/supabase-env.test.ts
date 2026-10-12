import { afterEach, describe, expect, it, vi } from "vitest";
import { getSupabaseEnv, SUPABASE_ENV_ERROR } from "@/lib/supabase/env";

const URL_KEY = "NEXT_PUBLIC_SUPABASE_URL";
const PK_KEY = "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY";
const valid = { [URL_KEY]: "https://abc.supabase.co", [PK_KEY]: "sb_publishable_123" };

describe("getSupabaseEnv", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("returns url and publishable key for valid input", () => {
    expect(getSupabaseEnv(valid)).toEqual({
      url: "https://abc.supabase.co",
      publishableKey: "sb_publishable_123",
    });
  });

  it("accepts a local http url", () => {
    expect(getSupabaseEnv({ ...valid, [URL_KEY]: "http://127.0.0.1:54321" }).url).toBe(
      "http://127.0.0.1:54321",
    );
  });

  it.each([
    ["missing url", { [PK_KEY]: "k" }],
    ["missing key", { [URL_KEY]: "https://abc.supabase.co" }],
    ["non-URL", { ...valid, [URL_KEY]: "not a url" }],
    ["non-http scheme", { ...valid, [URL_KEY]: "javascript:alert(1)" }],
    ["empty key", { ...valid, [PK_KEY]: "" }],
    ["whitespace key", { ...valid, [PK_KEY]: "   " }],
  ])("throws a generic error for %s", (_name, source) => {
    expect(() => getSupabaseEnv(source)).toThrowError(SUPABASE_ENV_ERROR);
  });

  it("does not leak the offending value in the error", () => {
    expect(() => getSupabaseEnv({ ...valid, [URL_KEY]: "secret-ish-value" })).toThrowError(
      expect.objectContaining({ message: expect.not.stringContaining("secret-ish-value") }),
    );
  });

  it("reads process.env at call time by default", () => {
    vi.stubEnv(URL_KEY, valid[URL_KEY]);
    vi.stubEnv(PK_KEY, valid[PK_KEY]);
    expect(getSupabaseEnv().publishableKey).toBe("sb_publishable_123");
  });
});
