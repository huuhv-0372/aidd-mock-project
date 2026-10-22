"use server";

import { fetchProfileKudos } from "@/lib/profiles/fetch-profile-kudos";
import type { LoadMoreProfileKudosResult } from "@/lib/profiles/profile-types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { KUDOS_PAGE_SIZE } from "@/lib/validation/kudos";
import { loadMoreProfileKudosInputSchema } from "@/lib/validation/profile";

/**
 * A page of a profile's KUDOS list: the next page (infinite scroll), or the first one after the direction changes
 * (`cursor: null`). Read-only. Input is untrusted, so it is validated first and nothing is queried when it fails.
 * The client's `direction` is not trusted either: `kudos_profile_feed` answers `sent` only for the caller's own
 * profile. Failures are logged in full and surface only as a generic error.
 */
export async function loadMoreProfileKudos(input: unknown): Promise<LoadMoreProfileKudosResult> {
  const parsed = loadMoreProfileKudosInputSchema.safeParse(input);
  if (!parsed.success) {
    console.error("[profiles] load-more rejected invalid input");
    return { error: "generic" };
  }
  const { profileId, direction, cursor } = parsed.data;

  try {
    const client = await createSupabaseServerClient();
    const page = await fetchProfileKudos(client, profileId, direction, cursor, KUDOS_PAGE_SIZE);
    return page ?? { error: "generic" };
  } catch (err) {
    console.error("[profiles] load-more unexpected failure", err);
    return { error: "generic" };
  }
}
