import { z } from "zod";

export const PROFILE_SEARCH_QUERY_MAX = 100;

/** Untrusted profile-search text: trimmed, 1-100 chars. No `.refine` — zod 4 would still run it after `max` fails. */
export const profileSearchQuerySchema = z.string().trim().min(1).max(PROFILE_SEARCH_QUERY_MAX);
