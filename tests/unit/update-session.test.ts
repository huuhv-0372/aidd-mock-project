import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { updateSession } from "@/lib/supabase/update-session";

type CookieMethods = {
  setAll: (cookies: { name: string; value: string; options: object }[], headers: Record<string, string>) => void;
};

const createServerClient = vi.hoisted(() => vi.fn());
vi.mock("@supabase/ssr", () => ({ createServerClient }));

/**
 * Fake client whose getClaims() behaves like a refresh in @supabase/ssr: after a network round trip it writes the
 * rotated session through `setAll` (with no-store headers), then resolves with the claims.
 */
function refreshingClient() {
  createServerClient.mockImplementation((_url: string, _key: string, { cookies }: { cookies: CookieMethods }) => ({
    auth: {
      getClaims: async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
        cookies.setAll([{ name: "sb-token", value: "rotated", options: { path: "/" } }], {
          "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
        });
        return { data: { claims: { sub: "user-1" } }, error: null };
      },
    },
  }));
}

describe("updateSession", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    createServerClient.mockReset();
  });

  // Regression: the returned response was read before getClaims() refreshed, so the rotated refresh token never reached
  // the browser; its next use past Supabase's reuse window revoked the session and the proxy sent the user to /login.
  it("returns the response carrying the cookies a refresh rotated during getClaims()", async () => {
    refreshingClient();
    const request = new NextRequest("http://localhost/sun-kudos", { headers: { cookie: "sb-token=spent" } });

    const { response, isAuthenticated } = await updateSession(request);

    expect(isAuthenticated).toBe(true);
    expect(response.headers.get("set-cookie")).toContain("sb-token=rotated");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(request.cookies.get("sb-token")?.value).toBe("rotated");
  });
});
