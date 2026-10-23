"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useKudosComposer } from "@/components/kudos-compose/kudos-composer-provider";
import { FOCUS_RING } from "@/components/site-shell/shell-class-names";
import type { Locale } from "@/lib/i18n/locales";
import type { KudoFeedCursor, KudoRow } from "@/lib/kudos/kudo-types";
import type { KudosFeedPage } from "@/lib/kudos/get-kudos-board-data";
import type { KudosFilters } from "@/lib/validation/kudos";
import { KudoPostCard, type KudoPostCardCopy } from "./kudo-post-card";

export type KudosFeedCopy = {
  loading: string; // not from Figma
  end: string; // not from Figma
  /** Generic message: the real cause is only logged server-side. */
  error: string; // not from Figma
  retry: string; // not from Figma
};

/** Fetches the page after `cursor`. The board passes its Server Action; the profile passes a closure over its own action. */
export type KudosFeedLoadMore = (input: {
  cursor: KudoFeedCursor;
  hashtag?: string;
  department?: string;
}) => Promise<KudosFeedPage | { error: "generic" }>;

type Status = "idle" | "loading" | "error";

const NOTE = "py-4 text-center text-base leading-6 font-bold text-white";

/*
 * All Kudos feed (Figma C.2 `2940:13482`) with infinite scroll. The parent keys this component by the active filters,
 * so a filter change remounts it with a fresh first page. An IntersectionObserver on a sentinel below the list
 * calls `loadMore` with the last row's cursor; pages are merged by id so a repeated row never shows twice.
 * A failed page stops the auto-loading and shows a retry button instead of looping.
 */
export function KudosFeedList({
  initialItems,
  initialCursor,
  filters,
  loadMore,
  locale,
  copy,
  cardCopy,
}: {
  initialItems: readonly KudoRow[];
  initialCursor: KudoFeedCursor | null;
  filters: KudosFilters;
  loadMore: KudosFeedLoadMore;
  locale: Locale;
  copy: KudosFeedCopy;
  cardCopy: KudoPostCardCopy;
}) {
  const [items, setItems] = useState<readonly KudoRow[]>(initialItems);
  const [cursor, setCursor] = useState<KudoFeedCursor | null>(initialCursor);
  const [status, setStatus] = useState<Status>("idle");
  const { savedKudos } = useKudosComposer(); // a Kudo edited from its pencil shows its saved row here, with no reload
  const sentinel = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);
  const { hashtag, department } = filters;

  const fetchMore = useCallback(async () => {
    if (inFlight.current || !cursor) return;
    inFlight.current = true;
    setStatus("loading");
    try {
      const result = await loadMore({ cursor, hashtag, department });
      if ("error" in result) {
        setStatus("error");
        return;
      }
      setItems((previous) => {
        const seen = new Set(previous.map((item) => item.id));
        return [...previous, ...result.items.filter((item) => !seen.has(item.id))];
      });
      setCursor(result.nextCursor);
      setStatus("idle");
    } catch {
      setStatus("error");
    } finally {
      inFlight.current = false;
    }
  }, [cursor, hashtag, department, loadMore]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !cursor || status !== "idle") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void fetchMore();
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [cursor, status, fetchMore]);

  return (
    // mm:2940:13482
    <div data-testid="kudos-feed" className="flex w-full flex-col gap-6">
      {items.map((kudo) => (
        <KudoPostCard key={kudo.id} kudo={savedKudos.get(kudo.id) ?? kudo} filters={filters} locale={locale} copy={cardCopy} />
      ))}
      <div ref={sentinel} aria-hidden className="h-px w-full" />
      {status === "loading" && (
        <p aria-live="polite" className={NOTE}>
          {copy.loading}
        </p>
      )}
      {status === "error" && (
        <div role="alert" className="flex flex-col items-center gap-3">
          <p className={NOTE}>{copy.error}</p>
          <button
            type="button"
            onClick={() => void fetchMore()}
            className={`min-h-11 min-w-11 cursor-pointer rounded-lg bg-login-accent px-6 py-2 text-base leading-6 font-bold text-login-bg hover:bg-[#fff3c4] motion-safe:transition-colors motion-safe:duration-200 ${FOCUS_RING}`}
          >
            {copy.retry}
          </button>
        </div>
      )}
      {status === "idle" && !cursor && items.length > 0 && <p className={NOTE}>{copy.end}</p>}
    </div>
  );
}
