import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { POST_LOGIN_NEXT_COOKIE } from "@/lib/auth/post-login-next";
import { signInWithGoogle } from "@/lib/auth/sign-in-with-google";

const KUDO = "/sun-kudos/c1000000-0000-0000-0000-000000000003";
const GOOGLE = "https://accounts.google.com/o/oauth2/auth?x=1";
const LOGIN_ERROR = "/login?error=auth_failed";

const mocks = vi.hoisted(() => ({
  origin: "https://saa.example" as string | null,
  cookieSet: vi.fn(),
  signInWithOAuth: vi.fn(),
}));
vi.mock("next/headers", () => ({
  headers: async () => ({ get: (key: string) => (key === "origin" ? mocks.origin : null) }),
  cookies: async () => ({ set: mocks.cookieSet }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ auth: { signInWithOAuth: mocks.signInWithOAuth } }),
}));

function form(next?: string): FormData {
  const data = new FormData();
  if (next !== undefined) data.append("next", next);
  return data;
}

describe("signInWithGoogle: post-login next", () => {
  let errorSpy: MockInstance;
  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.origin = "https://saa.example";
    mocks.cookieSet.mockReset();
    mocks.signInWithOAuth.mockReset().mockResolvedValue({ data: { url: GOOGLE }, error: null });
  });
  afterEach(() => errorSpy.mockRestore());

  it("stores a valid next in a 10-minute httpOnly Lax cookie, then goes to Google", async () => {
    await expect(signInWithGoogle(form(KUDO))).rejects.toThrow(`REDIRECT ${GOOGLE}`);
    expect(mocks.cookieSet).toHaveBeenCalledTimes(1);
    expect(mocks.cookieSet).toHaveBeenCalledWith(POST_LOGIN_NEXT_COOKIE, KUDO, {
      httpOnly: true,
      sameSite: "lax",
      secure: false, // NODE_ENV=test; production is covered in post-login-next.test.ts
      path: "/",
      maxAge: 600,
    });
  });

  it("keeps the OAuth redirectTo the constant callback URL (next never reaches Supabase)", async () => {
    await expect(signInWithGoogle(form(KUDO))).rejects.toThrow("REDIRECT");
    const options = mocks.signInWithOAuth.mock.calls[0][0].options;
    expect(options.redirectTo).toBe("https://saa.example/auth/callback");
    expect(JSON.stringify(mocks.signInWithOAuth.mock.calls[0][0])).not.toContain("sun-kudos");
  });

  it.each([undefined, "", "https://evil.example", "//evil.example", "/\\evil.example", `${KUDO}?x=1`, "/sun-kudos/../x"])(
    "clears any stale cookie when next is %j, then goes to Google",
    async (next) => {
      await expect(signInWithGoogle(form(next))).rejects.toThrow(`REDIRECT ${GOOGLE}`);
      expect(mocks.cookieSet).toHaveBeenCalledTimes(1);
      expect(mocks.cookieSet).toHaveBeenCalledWith(POST_LOGIN_NEXT_COOKIE, "", expect.objectContaining({ maxAge: 0, path: "/" }));
    },
  );

  it("rejects a missing Origin before touching the cookie or Supabase", async () => {
    mocks.origin = null;
    await expect(signInWithGoogle(form(KUDO))).rejects.toThrow(`REDIRECT ${LOGIN_ERROR}`);
    expect(mocks.signInWithOAuth).not.toHaveBeenCalled();
    expect(mocks.cookieSet).not.toHaveBeenCalled();
  });

  it("shows the login error without storing next when Supabase fails", async () => {
    mocks.signInWithOAuth.mockResolvedValue({ data: { url: null }, error: new Error("boom") });
    await expect(signInWithGoogle(form(KUDO))).rejects.toThrow(`REDIRECT ${LOGIN_ERROR}`);
    expect(mocks.cookieSet).not.toHaveBeenCalled();
  });

  it("still goes to Google when the cookie write fails (lands on / after sign-in)", async () => {
    mocks.cookieSet.mockImplementation(() => {
      throw new Error("internal detail");
    });
    await expect(signInWithGoogle(form(KUDO))).rejects.toThrow(`REDIRECT ${GOOGLE}`);
    expect(errorSpy).toHaveBeenCalled();
  });
});
