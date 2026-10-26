import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sunnerSchema, type Sunner } from "@/lib/validation/write-kudo";

export type SearchSunnersResult = { ok: true; items: Sunner[] } | { ok: false };

const SEARCH_LIMIT = 10;
const sunnersSchema = z.array(sunnerSchema);

/**
 * Shared RPC call behind `searchSunners` and `searchProfiles`. Callers validate `query` first; any failure is
 * logged server-side and surfaced as `{ ok: false }`. Not a "use server" module, so it is never a public endpoint.
 */
export async function runSunnerSearch(query: string, { nameOnly }: { nameOnly: boolean }): Promise<SearchSunnersResult> {
  try {
    const client = await createSupabaseServerClient();
    const { data, error } = await client.rpc("kudos_search_sunners", {
      p_query: query,
      p_limit: SEARCH_LIMIT,
      p_name_only: nameOnly,
    });
    if (error) {
      console.error("[kudos] kudos_search_sunners failed", error);
      return { ok: false };
    }
    const items = sunnersSchema.safeParse(data);
    if (!items.success) {
      console.error("[kudos] kudos_search_sunners returned malformed data", items.error);
      return { ok: false };
    }
    return { ok: true, items: items.data };
  } catch (err) {
    console.error("[kudos] kudos_search_sunners unexpected failure", err);
    return { ok: false };
  }
}
