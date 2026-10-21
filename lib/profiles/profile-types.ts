import type { KudosFeedPage } from "@/lib/kudos/get-kudos-board-data";
import type { KudoFeedCursor, KudoPerson, KudosMyStats } from "@/lib/kudos/kudo-types";

/*
 * Contract between the profile route + data layer (app/[locale]/profile, lib/profiles) and the profile UI
 * (components/profile). Plan: plans/261021-profile/plan.md.
 */

/** Which list the KUDOS section shows. `sent` is served only on the caller's own profile (the RPC returns no rows otherwise). */
export type ProfileKudosDirection = "received" | "sent";

export type LoadMoreProfileKudosInput = {
  profileId: string;
  direction: ProfileKudosDirection;
  /** `null` = first page: switching the direction reloads the list from the top. */
  cursor: KudoFeedCursor | null;
};

export type LoadMoreProfileKudosResult = KudosFeedPage | { error: "generic" };

/** The `loadMoreProfileKudos` server action, passed to the client section so it never imports server code. */
export type LoadMoreProfileKudos = (input: LoadMoreProfileKudosInput) => Promise<LoadMoreProfileKudosResult>;

/** What one profile request resolves to. A block that failed on its own is `null`, and the UI shows an error only there. */
export type ProfilePageData =
  | { status: "ok"; self: boolean; person: KudoPerson; stats: KudosMyStats | null; feed: KudosFeedPage | null }
  | { status: "redirect_self" }
  | { status: "not_found" }
  | { status: "error" };
