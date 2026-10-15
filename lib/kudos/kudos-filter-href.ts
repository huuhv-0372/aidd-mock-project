import { SUN_KUDOS_PATH } from "@/lib/navigation/routes";
import type { KudosFilters } from "@/lib/validation/kudos";

/*
 * Client-safe on purpose: client components (filter dropdown, hashtag links) import it, so it must not pull zod
 * (`lib/validation/kudos` is imported as a type only and is erased at build time).
 */

/** Change one or both filters: `null` clears a filter, `undefined` keeps it. Returns a `/sun-kudos` href. */
export function buildKudosFilterHref(
  current: KudosFilters,
  patch: { hashtag?: string | null; department?: string | null },
): string {
  const next = { ...current, ...patch };
  const query = new URLSearchParams();
  if (next.hashtag) query.set("hashtag", next.hashtag);
  if (next.department) query.set("department", next.department);
  const qs = query.toString();
  return qs ? `${SUN_KUDOS_PATH}?${qs}` : SUN_KUDOS_PATH;
}
