"use server";

import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  sunnerQuerySchema,
  sunnerSchema,
  sunnerSearchOptionsSchema,
  type Sunner,
} from "@/lib/validation/write-kudo";

export type SearchSunnersResult = { ok: true; items: Sunner[] } | { ok: false };
export type SearchSunnersOptions = { nameOnly?: boolean };

const SEARCH_LIMIT = 10;
const sunnersSchema = z.array(sunnerSchema);

/**
 * Recipient / `@mention` suggestions. The RPC ignores accents, drops the caller, caps at 10 and never returns an email.
 * An empty query lists the first Sunners by name; `nameOnly` ("@ + tên") skips the email match. Input is untrusted
 * (trimmed, 0-50 chars, strict options); any failure is logged and surfaced as `{ ok: false }`.
 */
export async function searchSunners(query: string, options?: SearchSunnersOptions): Promise<SearchSunnersResult> {
  const parsed = sunnerQuerySchema.safeParse(query);
  const opts = sunnerSearchOptionsSchema.safeParse(options);
  if (!parsed.success || !opts.success) return { ok: false };

  try {
    const client = await createSupabaseServerClient();
    const { data, error } = await client.rpc("kudos_search_sunners", {
      p_query: parsed.data,
      p_limit: SEARCH_LIMIT,
      p_name_only: opts.data?.nameOnly ?? false,
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
