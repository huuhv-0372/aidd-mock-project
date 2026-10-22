"use client";

import { useCallback } from "react";
import { KudosEmptyState } from "@/components/kudos/kudos-empty-state";
import { KudosFeedList, type KudosFeedCopy, type KudosFeedLoadMore } from "@/components/kudos/kudos-feed-list";
import type { KudoPostCardCopy } from "@/components/kudos/kudo-post-card";
import { FOCUS_RING } from "@/components/site-shell/shell-class-names";
import type { Locale } from "@/lib/i18n/locales";
import type { KudoFeedCursor, KudoRow } from "@/lib/kudos/kudo-types";
import type { LoadMoreProfileKudos, ProfileKudosDirection } from "@/lib/profiles/profile-types";
import type { KudosFilters } from "@/lib/validation/kudos";

/** What the KUDOS list currently shows: a loaded first page, a request in flight, or a failed one. */
export type KudosSlot = { direction: ProfileKudosDirection } & (
  | { phase: "ready"; items: readonly KudoRow[]; cursor: KudoFeedCursor | null }
  | { phase: "loading" }
  | { phase: "error" }
);

export type ProfileKudosBodyCopy = {
  emptyReceived: string;
  emptySent: string;
  /** The board's generic list error. */
  listError: string;
  feed: KudosFeedCopy;
  card: KudoPostCardCopy;
};

/* Profile cards carry no board filter: their hashtag links go to the unfiltered board path with just that tag. */
const NO_FILTERS: KudosFilters = {};

/*
 * The list under the KUDOS header (Figma `mms_D_Post all` 362:5091, 680px, 24px between cards). The feed is keyed by direction, so a
 * direction change remounts it on its fresh first page; further pages come from the injected Server Action through
 * `KudosFeedList`'s infinite scroll. Loading and failure of a first page show here, with a retry button for the failure.
 */
export function ProfileKudosBody({
  slot,
  profileId,
  loadMore,
  onRetry,
  locale,
  copy,
}: {
  slot: KudosSlot;
  profileId: string;
  loadMore: LoadMoreProfileKudos;
  onRetry: () => void;
  locale: Locale;
  copy: ProfileKudosBodyCopy;
}) {
  const { direction } = slot;
  const loadPage = useCallback<KudosFeedLoadMore>(
    ({ cursor }) => loadMore({ profileId, direction, cursor }),
    [loadMore, profileId, direction],
  );

  if (slot.phase === "loading") {
    return (
      <p aria-live="polite" className="py-8 text-center text-base leading-6 font-bold text-white">
        {copy.feed.loading}
      </p>
    );
  }
  if (slot.phase === "error") {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 py-4">
        <KudosEmptyState message={copy.listError} />
        <button
          type="button"
          onClick={onRetry}
          className={`min-h-11 min-w-11 cursor-pointer rounded-lg bg-login-accent px-6 py-2 text-base leading-6 font-bold text-login-bg hover:bg-[#fff3c4] motion-safe:transition-colors motion-safe:duration-200 ${FOCUS_RING}`}
        >
          {copy.feed.retry}
        </button>
      </div>
    );
  }
  if (slot.items.length === 0) {
    return <KudosEmptyState message={direction === "sent" ? copy.emptySent : copy.emptyReceived} />;
  }
  return (
    <KudosFeedList
      key={direction}
      initialItems={slot.items}
      initialCursor={slot.cursor}
      filters={NO_FILTERS}
      loadMore={loadPage}
      locale={locale}
      copy={copy.feed}
      cardCopy={copy.card}
    />
  );
}
