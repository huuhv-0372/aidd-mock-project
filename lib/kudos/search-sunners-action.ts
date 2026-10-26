"use server";

import { runSunnerSearch, type SearchSunnersResult } from "@/lib/kudos/run-sunner-search";
import { sunnerQuerySchema, sunnerSearchOptionsSchema } from "@/lib/validation/write-kudo";

export type { SearchSunnersResult };
export type SearchSunnersOptions = { nameOnly?: boolean };

/**
 * Recipient / `@mention` suggestions. The RPC ignores accents, drops the caller, caps at 10 and never returns an email.
 * An empty query lists the first Sunners by name; `nameOnly` ("@ + tên") skips the email match. Input is untrusted
 * (trimmed, 0-50 chars, strict options); any failure is logged and surfaced as `{ ok: false }`.
 */
export async function searchSunners(query: string, options?: SearchSunnersOptions): Promise<SearchSunnersResult> {
  const parsed = sunnerQuerySchema.safeParse(query);
  const opts = sunnerSearchOptionsSchema.safeParse(options);
  if (!parsed.success || !opts.success) return { ok: false };
  return runSunnerSearch(parsed.data, { nameOnly: opts.data?.nameOnly ?? false });
}
