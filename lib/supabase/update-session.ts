import { createServerClient } from "@supabase/ssr";
import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
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
    const { data, error } = await supabase.auth.getClaims();
    if (error && !isAuthSessionMissingError(error)) {
      console.error("[supabase] getClaims failed:", error);
    }
    return { response, isAuthenticated: !error && Boolean(data?.claims) };
  } catch (error) {
    console.error("[supabase] getClaims threw:", error);
    return { response, isAuthenticated: false };
  }
}

/** Redirect that keeps the refreshed session cookies and no-store headers from `from`. */
export function redirectWithSession(from: NextResponse, url: URL): NextResponse {
  const redirect = NextResponse.redirect(url, 307);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  ["cache-control", "expires", "pragma"].forEach((key) => {
    const value = from.headers.get(key);
    if (value) redirect.headers.set(key, value);
  });
  return redirect;
}
