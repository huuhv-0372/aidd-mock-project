import { AWARD_SLUGS, type AwardSlug } from "@/lib/navigation/routes";

/** Maps a URL hash (`#slug` or `slug`, percent-decoded) to an award slug; anything else is null. */
export function parseAwardHash(hash: string): AwardSlug | null {
  let raw = hash.startsWith("#") ? hash.slice(1) : hash;
  try {
    raw = decodeURIComponent(raw);
  } catch {
    return null; // malformed percent-encoding in a user-controlled URL
  }
  return AWARD_SLUGS.find((slug) => slug === raw) ?? null;
}
