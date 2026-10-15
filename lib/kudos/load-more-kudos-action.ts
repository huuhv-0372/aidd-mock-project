"use server";

import { fetchKudosFeed, type KudosFeedPage } from "@/lib/kudos/get-kudos-board-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { KUDOS_PAGE_SIZE, loadMoreKudosInputSchema } from "@/lib/validation/kudos";

export type LoadMoreKudosResult = KudosFeedPage | { error: "generic" };

/**
 * Next page of the All Kudos feed (infinite scroll). Read-only; the RPC itself refuses callers that
 * are not allowed accounts. Input is untrusted, so it is validated first. Failures are logged in
 * full and surfaced only as a generic error.
 */
export async function loadMoreKudos(input: unknown): Promise<LoadMoreKudosResult> {
  const parsed = loadMoreKudosInputSchema.safeParse(input);
  if (!parsed.success) {
    console.error("[kudos] load-more rejected invalid input");
    return { error: "generic" };
  }
  const { cursor, limit, ...filters } = parsed.data;

  try {
    const client = await createSupabaseServerClient();
    const page = await fetchKudosFeed(client, filters, cursor, limit ?? KUDOS_PAGE_SIZE);
    return page ?? { error: "generic" };
  } catch (err) {
    console.error("[kudos] load-more unexpected failure", err);
    return { error: "generic" };
  }
}
