"use client";

import { useCallback, useRef, useState } from "react";
import { KudosSectionHeader } from "@/components/kudos/kudos-section-header";
import type { Locale } from "@/lib/i18n/locales";
import type { KudosFeedPage } from "@/lib/kudos/get-kudos-board-data";
import type { LoadMoreProfileKudos, ProfileKudosDirection } from "@/lib/profiles/profile-types";
import { fill } from "./fill-template";
import { ProfileDirectionDropdown } from "./profile-direction-dropdown";
import { ProfileKudosBody, type KudosSlot, type ProfileKudosBodyCopy } from "./profile-kudos-body";

export type ProfileKudosCopy = ProfileKudosBodyCopy & {
  eyebrow: string;
  title: string;
  /** Templates with `{count}`. */
  received: string;
  sent: string;
  /** Sent label when the sent total is unknown (the stats block failed). */
  sentNoCount: string;
  /** Other profile: "Đã nhận: {count} Kudos". */
  receivedStatic: string;
  directionList: string;
};

const TITLE_ID = "profile-kudos-title";

/*
 * KUDOS section (Figma `Frame 530` 362:5083, 680px): eyebrow, divider, the gold "KUDOS" title with its control on the right, then
 * the list 40px below. Own profile: a direction dropdown (Received / Sent). The initial list is the server's received page;
 * picking the other direction asks `loadMore` for its first page (`cursor: null`), replaces the list with it, and shows a
 * loading line meanwhile or an error with retry. Picking the current direction does nothing. Another Sunner's profile: a
 * static received count and no control: the Sent side of someone else (anonymous Kudos included) is never offered.
 * `sentCount` is `null` when the stats block failed to load.
 */
export function ProfileKudosSection({
  profileId,
  self,
  receivedCount,
  sentCount,
  feed,
  loadMore,
  locale,
  copy,
}: {
  profileId: string;
  self: boolean;
  receivedCount: number;
  sentCount: number | null;
  feed: KudosFeedPage | null;
  loadMore: LoadMoreProfileKudos;
  locale: Locale;
  copy: ProfileKudosCopy;
}) {
  const [slot, setSlot] = useState<KudosSlot>(
    feed ? { direction: "received", phase: "ready", items: feed.items, cursor: feed.nextCursor } : { direction: "received", phase: "error" },
  );
  // Only the newest request may land: a quick second pick must not be overwritten by the first one's late answer.
  const latest = useRef(0);

  const load = useCallback(
    async (direction: ProfileKudosDirection) => {
      const request = ++latest.current;
      setSlot({ direction, phase: "loading" });
      let next: KudosSlot;
      try {
        const result = await loadMore({ profileId, direction, cursor: null });
        next = "error" in result ? { direction, phase: "error" } : { direction, phase: "ready", items: result.items, cursor: result.nextCursor };
      } catch {
        next = { direction, phase: "error" };
      }
      if (request === latest.current) setSlot(next);
    },
    [loadMore, profileId],
  );

  const options = [
    { value: "received" as const, label: fill(copy.received, "count", receivedCount) },
    { value: "sent" as const, label: sentCount === null ? copy.sentNoCount : fill(copy.sent, "count", sentCount) },
  ];

  return (
    // mm:362:5083
    <section data-testid="profile-kudos" aria-labelledby={TITLE_ID} className="flex w-full flex-col gap-10">
      <KudosSectionHeader eyebrow={copy.eyebrow} title={copy.title} titleId={TITLE_ID}>
        {self ? (
          <ProfileDirectionDropdown
            value={slot.direction}
            options={options}
            listLabel={copy.directionList}
            testId="profile-kudos-filter"
            onSelect={(next) => void load(next)}
          />
        ) : (
          <p className="text-lg leading-7 font-bold text-white md:text-[22px]">{fill(copy.receivedStatic, "count", receivedCount)}</p>
        )}
      </KudosSectionHeader>
      <ProfileKudosBody
        slot={slot}
        profileId={profileId}
        loadMore={loadMore}
        onRetry={() => void load(slot.direction)}
        locale={locale}
        copy={copy}
      />
    </section>
  );
}
