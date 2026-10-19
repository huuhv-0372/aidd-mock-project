import type { Locale } from "@/lib/i18n/locales";
import type { GiftRecipient, KudoFeedCursor, KudoRow, KudosMyStats } from "@/lib/kudos/kudo-types";
import type { loadMoreKudos } from "@/lib/kudos/load-more-kudos-action";
import type { KudosFilters } from "@/lib/validation/kudos";
import { GiftRecipientsList, type GiftRecipientsCopy } from "./gift-recipients-list";
import type { KudoPostCardCopy } from "./kudo-post-card";
import { KudosEmptyState } from "./kudos-empty-state";
import { KudosFeedList, type KudosFeedCopy } from "./kudos-feed-list";
import { KudosSectionHeader } from "./kudos-section-header";
import { KudosStatsPanel, type KudosStatsCopy } from "./kudos-stats-panel";

export type AllKudosCopy = {
  eyebrow: string;
  title: string;
  /** "Hiện tại chưa có Kudos nào." */
  empty: string;
  /** Generic text shown when the feed block failed to load. */
  error: string; // not from Figma
  feed: KudosFeedCopy;
  card: KudoPostCardCopy;
  stats: KudosStatsCopy;
  gifts: GiftRecipientsCopy;
};

const TITLE_ID = "all-kudos-title";

/*
 * Figma C (2940:13475): header, then the feed (C.2, 680px) with the right column (D, 422px: personal stats and the
 * latest gift recipients) beside it from lg up, below it on smaller screens. Each block takes its own data and
 * shows its own error text when that data is `null`. The feed is keyed by the active filters and its first row, so a filter
 * change or a new top Kudo restarts it from the first page.
 */
export function AllKudosSection({
  initialItems,
  initialCursor,
  filters,
  loadMore,
  stats,
  gifts,
  locale,
  copy,
}: {
  initialItems: readonly KudoRow[] | null;
  initialCursor: KudoFeedCursor | null;
  filters: KudosFilters;
  loadMore: typeof loadMoreKudos;
  stats: KudosMyStats | null;
  gifts: readonly GiftRecipient[] | null;
  locale: Locale;
  copy: AllKudosCopy;
}) {
  // The first row joins the key: after a Kudo is sent, router.refresh() brings a new top row and the feed restarts from it.
  const feedKey = `${filters.hashtag ?? ""}|${filters.department ?? ""}|${initialItems?.[0]?.id ?? ""}`;
  return (
    // mm:2940:13475
    <section
      data-testid="all-kudos"
      aria-labelledby={TITLE_ID}
      className="mx-auto flex w-full max-w-[1512px] flex-col gap-10 px-4 font-montserrat md:px-12 xl:px-36"
    >
      {/* mm:2940:14221 */}
      <KudosSectionHeader eyebrow={copy.eyebrow} title={copy.title} titleId={TITLE_ID} />
      {/* mm:2940:13481 */}
      <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between lg:gap-12">
        <div className="min-w-0 lg:max-w-[680px] lg:flex-1">
          {initialItems === null ? (
            <KudosEmptyState message={copy.error} />
          ) : initialItems.length === 0 ? (
            <KudosEmptyState message={copy.empty} />
          ) : (
            <KudosFeedList
              key={feedKey}
              initialItems={initialItems}
              initialCursor={initialCursor}
              filters={filters}
              loadMore={loadMore}
              locale={locale}
              copy={copy.feed}
              cardCopy={copy.card}
            />
          )}
        </div>
        {/* mm:2940:13488 */}
        <aside className="flex w-full flex-col gap-6 lg:w-[340px] lg:shrink-0 xl:w-[422px]">
          <KudosStatsPanel stats={stats} locale={locale} copy={copy.stats} />
          <GiftRecipientsList gifts={gifts} locale={locale} copy={copy.gifts} />
        </aside>
      </div>
    </section>
  );
}
