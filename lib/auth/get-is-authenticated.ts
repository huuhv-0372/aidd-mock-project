import type { createSupabaseServerClient } from "@/lib/supabase/server";

/** The real per-request server client (type-only import: no runtime dependency here). */
type ServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/**
 * True only for a verified session: `getClaims()` checks the JWT signature (never getSession,
 * which trusts the cookie unverified). No session -> false silently; any other failure (invalid
 * token, network, missing env) is logged server-side and treated as a guest. Never throws.
 */
export async function getIsAuthenticated(client?: ServerClient): Promise<boolean> {
  try {
    const supabase = client ?? (await createDefaultClient());
    const { data, error } = await supabase.auth.getClaims();
    if (error) {
      console.error("[auth] getClaims failed", error);
      return false;
    }
    return Boolean(data?.claims.sub);
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
