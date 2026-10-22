import { cache } from "react";
import { z } from "zod";
import { readBlock, type ServerClient } from "@/lib/kudos/get-kudos-board-data";
import { fetchProfileKudos } from "@/lib/profiles/fetch-profile-kudos";
import type { ProfilePageData } from "@/lib/profiles/profile-types";
import { kudoPersonSchema, myStatsSchema } from "@/lib/validation/kudos";
import { profileIdSchema } from "@/lib/validation/profile";

// `profile_card` answers one person object, or null (unknown id, or a caller the account rule refuses).
const cardSchema = kudoPersonSchema.nullable();
// `kudos_my_stats` answers one row for an allowed caller, none otherwise.
const myStatsRowsSchema = z.array(myStatsSchema).max(1).transform((rows) => rows[0] ?? null);

/**
 * Everything one profile request needs: `/profile` (`id` null, the caller) or `/profile/{id}`. Wrapped in React
 * `cache()` so `generateMetadata` and the page share one pass per request.
 *
 * - A malformed `id` is `not_found` before any query; the caller's own id (any case) is `redirect_self`.
 * - The caller comes from verified JWT claims (`getClaims`, never `getSession`); no claims is `not_found` (the proxy
 *   already sends guests to /login).
 * - `profile_card` decides existence: null is `not_found`; an RPC failure or a card failing the schema is `error`.
 * - Then, in parallel, the first received page and (own profile only) `kudos_my_stats`; each is `null` on failure
 *   and the UI shows an error only in that block.
 *
 * Never throws: every failure is logged in full server-side and only a status reaches the page. `client` is injectable
 * so tests need no `next/headers`.
 */
export const getProfilePageData = cache(async (id: string | null, client?: ServerClient): Promise<ProfilePageData> => {
  if (id !== null && !profileIdSchema.safeParse(id).success) return { status: "not_found" };
  try {
    const supabase = client ?? (await createDefaultClient());
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
    if (claimsError) {
      console.error("[profiles] getClaims failed", claimsError);
      return { status: "error" };
    }
    const sub = claimsData?.claims.sub;
    if (!sub) return { status: "not_found" };
    if (id !== null && id.toLowerCase() === sub.toLowerCase()) return { status: "redirect_self" };

    const profileId = id ?? sub;
    const { data, error } = await supabase.rpc("profile_card", { p_id: profileId });
    if (error) {
      console.error("[profiles] profile_card failed", error);
      return { status: "error" };
    }
    const card = cardSchema.safeParse(data);
    if (!card.success) {
      console.error("[profiles] profile_card returned malformed data", card.error);
      return { status: "error" };
    }
    if (card.data === null) return { status: "not_found" };

    const self = profileId === sub;
    const [stats, feed] = await Promise.all([
      self
        ? readBlock("kudos_my_stats", () => supabase.rpc("kudos_my_stats"), (rows) => myStatsRowsSchema.safeParse(rows))
        : null,
      fetchProfileKudos(supabase, profileId, "received", null),
    ]);
    return { status: "ok", self, person: card.data, stats, feed };
  } catch (err) {
    console.error("[profiles] profile page unexpected failure", err);
    return { status: "error" };
  }
});

/** Lazy import keeps `next/headers` out of the module graph until a real request needs it. */
async function createDefaultClient(): Promise<ServerClient> {
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  return createSupabaseServerClient();
}
