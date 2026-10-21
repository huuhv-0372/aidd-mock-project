import Link from "next/link";
import { FOCUS_RING } from "@/components/site-shell/shell-class-names";
import type { Locale } from "@/lib/i18n/locales";
import type { KudoHashtag } from "@/lib/kudos/kudo-types";
import { buildKudosFilterHref } from "@/lib/kudos/kudos-filter-href";
import type { KudosFilters } from "@/lib/validation/kudos";

const MAX_TAGS = 5;

/*
 * Hashtag line of a Kudo card (Figma B.4.3 / C.4): at most 5 tags on one line, an overflow becomes "...".
 * `wrap` (View Kudo, Figma 520:18779) lets the tags run onto more lines instead, so none is cut.
 * Each tag links to `/sun-kudos?hashtag=<slug>` (keeping the department filter), so clicking it replaces the
 * Hashtag filter with that tag. A link rather than a button: it works before hydration and is a real URL change.
 */
export function KudoHashtagList({
  tags,
  filters,
  locale,
  wrap = false,
}: {
  tags: readonly KudoHashtag[];
  filters: KudosFilters;
  locale: Locale;
  wrap?: boolean;
}) {
  if (tags.length === 0) return null;
  return (
    // mm:I2940:13465;335:9458
    // py/-my on the line and the links: 44px touch box, layout still one 24px line (the `truncate` clip needs the room).
    <p
      className={`-my-2.5 w-full py-2.5 text-base leading-6 font-bold tracking-[0.5px] text-kudos-heart ${wrap ? "" : "truncate"}`}
    >
      {tags.slice(0, MAX_TAGS).map((tag) => (
        <Link
          key={tag.slug}
          href={buildKudosFilterHref(filters, { hashtag: tag.slug })}
          scroll={false}
          data-testid="kudo-hashtag"
          className={`-my-2.5 mr-2 inline-block rounded py-2.5 hover:underline ${FOCUS_RING}`}
        >
          #{locale === "en" ? tag.name_en : tag.name_vi}
        </Link>
      ))}
    </p>
  );
}
