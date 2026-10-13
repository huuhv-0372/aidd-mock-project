import { isSignedInClaims } from "@/lib/auth/is-signed-in-claims";
import type { createSupabaseServerClient } from "@/lib/supabase/server";

/** The real per-request server client (type-only import: no `next/headers` dependency here). */
type ServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/**
 * True only for a verified session: `getClaims()` checks the JWT signature (never getSession,
 * which trusts the cookie unverified), judged by the same rule as the proxy (`isSignedInClaims`).
 * Any other failure (network, missing env) is logged server-side and treated as a guest. Never throws.
 */
export async function getIsAuthenticated(client?: ServerClient): Promise<boolean> {
  try {
    const supabase = client ?? (await createDefaultClient());
    return isSignedInClaims(await supabase.auth.getClaims(), "auth");
  } catch (err) {
    console.error("[auth] unexpected failure reading session", err);
    return false;
  }
}

/** Lazy import keeps `next/headers` out of the module graph until a real request needs it. */
async function createDefaultClient(): Promise<ServerClient> {
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  return createSupabaseServerClient();
}
