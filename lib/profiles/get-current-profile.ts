import { PROFILE_COLUMNS, profileSchema, type Profile } from "@/lib/validation/profile";
import type { createSupabaseServerClient } from "@/lib/supabase/server";

/** The real per-request server client (type-only import: no runtime dependency here). */
type ServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/**
 * Reads the signed-in user's profile. Identity comes from verified JWT claims; RLS lets any
 * authenticated domain user read every row, so the `id` filter here is what scopes the result.
 * Never throws: any failure is logged server-side and yields `null`.
 */
export async function getCurrentProfile(client?: ServerClient): Promise<Profile | null> {
  try {
    const supabase = client ?? (await createDefaultClient());

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
    if (claimsError) {
      console.error("[profiles] getClaims failed", claimsError);
      return null;
    }
    if (!claimsData) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", claimsData.claims.sub)
      .maybeSingle();
    if (error) {
      console.error("[profiles] query failed", error);
      return null;
    }
    if (data === null || data === undefined) return null;

    const parsed = profileSchema.safeParse(data);
    if (!parsed.success) {
      console.error("[profiles] malformed row", parsed.error);
      return null;
    }
    return parsed.data;
  } catch (err) {
    console.error("[profiles] unexpected failure", err);
    return null;
  }
}

/** Lazy import keeps `next/headers` out of the module graph until a real request needs it. */
async function createDefaultClient(): Promise<ServerClient> {
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  return createSupabaseServerClient();
}
