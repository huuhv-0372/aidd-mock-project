import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSignedInClaims } from "@/lib/auth/is-signed-in-claims";
import { getSupabaseEnv } from "@/lib/supabase/env";

export type SessionResult = { response: NextResponse; isAuthenticated: boolean };

/**
 * Proxy helper: refreshes the Supabase session via getClaims(), which verifies the JWT
 * signature (unlike reading the unverified session cookie), and returns a pass-through response carrying any rewritten auth cookies.
 * Missing env or auth failures degrade to "unauthenticated" instead of crashing every route.
 */
export async function updateSession(request: NextRequest): Promise<SessionResult> {
  let response = NextResponse.next({ request });

  let env;
  try {
    env = getSupabaseEnv();
  } catch {
    console.error("[supabase] session refresh skipped: env missing or invalid");
    return { response, isAuthenticated: false };
  }

  const supabase = createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        // No-store headers so a CDN never serves one user's auth cookies to another.
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  try {
    // Await before reading `response`: a token refresh inside getClaims() runs setAll, which swaps in the
    // response carrying the rotated cookies. Reading it first returns the stale one, the browser keeps the
    // spent refresh token, and its next use past Supabase's reuse window revokes the session (-> /login).
    const claims = await supabase.auth.getClaims();
    return { response, isAuthenticated: isSignedInClaims(claims, "supabase") };
  } catch (error) {
    console.error("[supabase] getClaims threw:", error);
    return { response, isAuthenticated: false };
  }
}

/** Copies the refreshed session cookies and no-store headers from `from` onto `to`. */
function copySession(from: NextResponse, to: NextResponse): NextResponse {
  from.cookies.getAll().forEach((cookie) => to.cookies.set(cookie));
  ["cache-control", "expires", "pragma"].forEach((key) => {
    const value = from.headers.get(key);
    if (value) to.headers.set(key, value);
  });
  return to;
}

/** Redirect that keeps the refreshed session cookies and no-store headers from `from`. */
export function redirectWithSession(from: NextResponse, url: URL): NextResponse {
  return copySession(from, NextResponse.redirect(url, 307));
}

/**
 * Rewrite that keeps what updateSession did: refreshed cookies reach the page via `request`
 * (setAll wrote them into request.cookies) and the browser via Set-Cookie copied from `from`.
 * One public URL now renders per cookie (locale, session), so no shared cache may store it: the
 * guard is `Cache-Control: private, no-cache` (or Supabase's stricter no-store when it refreshed).
 * `Vary: Cookie` is not an option here — Next replaces the page response's Vary with its own list.
 */
export function rewriteWithSession(
  request: NextRequest,
  from: NextResponse,
  url: URL,
): NextResponse {
  const rewrite = copySession(from, NextResponse.rewrite(url, { request }));
  if (!rewrite.headers.has("cache-control")) rewrite.headers.set("cache-control", "private, no-cache");
  return rewrite;
}
