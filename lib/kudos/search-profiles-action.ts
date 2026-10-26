"use server";

import { runSunnerSearch, type SearchSunnersResult } from "@/lib/kudos/run-sunner-search";
import { profileSearchQuerySchema } from "@/lib/validation/profile-search";

/**
 * Live-board "Tìm kiếm profile Sunner" type-ahead: name or email, up to 10 Sunners (never the caller, never an email).
 * Input is untrusted (trimmed, 1-100 chars); invalid input never reaches the database, any failure is `{ ok: false }`.
 */
export async function searchProfiles(query: string): Promise<SearchSunnersResult> {
  const parsed = profileSearchQuerySchema.safeParse(query);
  if (!parsed.success) return { ok: false };
  return runSunnerSearch(parsed.data, { nameOnly: false });
}
