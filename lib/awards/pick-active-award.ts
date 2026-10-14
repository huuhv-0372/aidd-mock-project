import type { AwardSlug } from "@/lib/navigation/routes";

/**
 * The active award is the last section whose top edge has reached the offset line
 * (sticky bar bottom plus a gap); before any has, the first one stays active.
 * `sections` must be in document order.
 */
export function pickActiveAward(
  sections: readonly { slug: AwardSlug; top: number }[],
  offset: number,
): AwardSlug {
  let active = sections[0].slug;
  for (const { slug, top } of sections) {
    if (top <= offset) active = slug;
  }
  return active;
}
