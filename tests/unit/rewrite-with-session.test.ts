import { NextRequest, NextResponse } from "next/server";
import { describe, expect, it } from "vitest";
import { rewriteWithSession } from "@/lib/supabase/update-session";

const target = new URL("http://localhost/en/awards-information");

/** What updateSession returns after Supabase refreshed the session (cookie + no-store headers). */
function refreshedSession(request: NextRequest) {
  request.cookies.set("sb-token", "fresh");
  const from = NextResponse.next({ request });
  from.cookies.set("sb-token", "fresh", { path: "/" });
  from.headers.set("cache-control", "private, no-cache, no-store, must-revalidate, max-age=0");
  return from;
}

describe("rewriteWithSession", () => {
  it("rewrites to the localised path and keeps the refreshed session for browser and page", () => {
    const request = new NextRequest("http://localhost/awards-information");
    const res = rewriteWithSession(request, refreshedSession(request), target);

    expect(res.headers.get("x-middleware-rewrite")).toBe(target.toString());
    expect(res.headers.get("set-cookie")).toContain("sb-token=fresh");
    expect(res.headers.get("x-middleware-request-cookie")).toContain("sb-token=fresh");
    expect(res.headers.get("cache-control")).toContain("no-store");
  });

  it("marks a response without a session refresh private so no shared cache stores it", () => {
    const request = new NextRequest("http://localhost/awards-information");
    const res = rewriteWithSession(request, NextResponse.next({ request }), target);

    expect(res.headers.get("cache-control")).toBe("private, no-cache");
    expect(res.headers.get("set-cookie")).toBeNull();
  });
});
