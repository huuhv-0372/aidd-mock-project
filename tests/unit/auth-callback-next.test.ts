import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { GET } from "@/app/auth/callback/route";
import { POST_LOGIN_NEXT_COOKIE } from "@/lib/auth/post-login-next";

const ORIGIN = "https://saa.example";
const KUDO = "/sun-kudos/c1000000-0000-0000-0000-000000000003";
const LOGIN_ERROR = `${ORIGIN}/login?error=auth_failed`;

const mocks = vi.hoisted(() => ({ exchange: vi.fn(), signOut: vi.fn(), cookieSet: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ set: mocks.cookieSet }) }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { exchangeCodeForSession: mocks.exchange, signOut: mocks.signOut },
  }),
}));

function callback(cookie: string | null, query = "code=abc", origin = ORIGIN): NextRequest {
  const headers = new Headers();
  if (cookie !== null) headers.set("cookie", `${POST_LOGIN_NEXT_COOKIE}=${encodeURIComponent(cookie)}`);
  return new NextRequest(`${origin}/auth/callback?${query}`, { headers });
}

/**
 * The clear goes through the cookies() store (Next merges it into the response, keeping Max-Age=0), never
 * through response.cookies: once the store is written Next re-parses the response's own Set-Cookie and drops
 * Max-Age=0 (real-runtime proof: tests/e2e/kudo-detail-login-next.spec.ts). Same attributes as when it was set.
 */
function expectNextCookieCleared(res: Response, secure = false) {
  expect(mocks.cookieSet).toHaveBeenCalledExactlyOnceWith(POST_LOGIN_NEXT_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 0,
  });
  const own = res.headers.getSetCookie().filter((c) => c.startsWith(`${POST_LOGIN_NEXT_COOKIE}=`));
  expect(own, "no second, response-level Set-Cookie that Next would re-parse").toEqual([]);
}

describe("auth callback: post-login next", () => {
  let errorSpy: MockInstance;
  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.exchange.mockReset().mockResolvedValue({ data: { user: { email: "a@sun-asterisk.com" } }, error: null });
    mocks.signOut.mockReset().mockResolvedValue({ error: null });
    mocks.cookieSet.mockReset();
  });
  afterEach(() => errorSpy.mockRestore());

  it("redirects to the stored Kudo after sign-in and clears the cookie", async () => {
    const res = await GET(callback(KUDO));
    expect(mocks.exchange).toHaveBeenCalledExactlyOnceWith("abc");
    expect(res.headers.get("location")).toBe(`${ORIGIN}${KUDO}`);
    expectNextCookieCleared(res);
  });

  it("exchanges the query code and redirects on the request's own origin", async () => {
    const other = "http://localhost:3100";
    const res = await GET(callback(KUDO, "code=other-code", other));
    expect(mocks.exchange).toHaveBeenCalledExactlyOnceWith("other-code");
    expect(res.headers.get("location")).toBe(`${other}${KUDO}`);
  });

  it("clears the cookie with Secure in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    try {
      expectNextCookieCleared(await GET(callback(KUDO)), true);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("falls back to / without a cookie (and still clears it)", async () => {
    const res = await GET(callback(null));
    expect(res.headers.get("location")).toBe(`${ORIGIN}/`);
    expectNextCookieCleared(res);
  });

  // The cookie is re-checked: a tampered value never becomes a redirect target.
  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "%2F%2Fevil.example",
    `https://evil.example${KUDO}`,
    `${KUDO}?x=1`,
    `${KUDO}/`,
    `${KUDO}//evil.example`,
    "/sun-kudos/../x",
    "/profile/c1000000-0000-0000-0000-000000000003",
    "",
  ])("ignores the tampered cookie %j and lands on /", async (value) => {
    const res = await GET(callback(value));
    const location = new URL(res.headers.get("location") ?? "");
    expect(location.origin).toBe(ORIGIN);
    expect(location.pathname + location.search).toBe("/");
    expectNextCookieCleared(res);
  });

  it("ignores a next query param on the callback itself", async () => {
    const res = await GET(callback(null, `code=abc&next=${encodeURIComponent(KUDO)}`));
    expect(res.headers.get("location")).toBe(`${ORIGIN}/`);
  });

  it("clears the cookie when the query is invalid", async () => {
    const res = await GET(callback(KUDO, "error=access_denied"));
    expect(res.headers.get("location")).toBe(LOGIN_ERROR);
    expect(mocks.exchange).not.toHaveBeenCalled();
    expectNextCookieCleared(res);
  });

  it("clears the cookie when the code exchange fails", async () => {
    mocks.exchange.mockResolvedValue({ data: { user: null }, error: new Error("bad code") });
    const res = await GET(callback(KUDO));
    expect(res.headers.get("location")).toBe(LOGIN_ERROR);
    expectNextCookieCleared(res);
  });

  it("clears the cookie and signs out a non-domain account", async () => {
    mocks.exchange.mockResolvedValue({ data: { user: { email: "a@evil.example" } }, error: null });
    const res = await GET(callback(KUDO));
    expect(res.headers.get("location")).toBe(LOGIN_ERROR);
    expect(mocks.signOut).toHaveBeenCalled();
    expectNextCookieCleared(res);
  });

  it("clears the cookie on an unexpected failure", async () => {
    mocks.exchange.mockRejectedValue(new Error("network"));
    const res = await GET(callback(KUDO));
    expect(res.headers.get("location")).toBe(LOGIN_ERROR);
    expectNextCookieCleared(res);
  });
});
