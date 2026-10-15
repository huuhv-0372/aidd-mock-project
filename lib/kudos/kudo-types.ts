/**
 * JSON shapes returned by the Sun* Kudos read RPCs and catalog tables
 * (supabase/migrations/20261015100000_create_kudos.sql). Kept in DB snake_case, like
 * `profileSchema` (no mapping layer). Timestamps are ISO-8601 strings with offset, as
 * PostgREST serialises `timestamptz`. Runtime validation (zod) lives in lib/validation/kudos.ts.
 *
 * Every RPC returns "nothing" for a caller failing `is_allowed_account`: set-returning RPCs
 * return `[]`, `kudos_spotlight` returns `null`, `kudos_my_stats` returns `[]` (no row).
 */

/** `public.departments` row. `code` is shown as-is in both languages. */
export type Department = {
  code: string;
  sort_order: number;
};

/** `public.hashtags` row. `slug` is the value used in `?hashtag=`. */
export type Hashtag = {
  id: number;
  slug: string;
  name_vi: string;
  name_en: string;
  sort_order: number;
};

/** Hashtag as embedded in a Kudo row (catalog order). */
export type KudoHashtag = Pick<Hashtag, "slug" | "name_vi" | "name_en">;

/**
 * A profile as embedded in RPC results (`public.kudos_person_json`).
 * `kudos_received` drives the star count; `distinct_senders` drives the Hero tier and excludes
 * anonymous Kudos (counting them would let viewers infer an anonymous sender).
 */
export type KudoPerson = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  department: string | null;
  kudos_received: number;
  distinct_senders: number;
};

/**
 * One row of `kudos_feed` / `kudos_highlight`.
 * Anonymous Kudo: `sender` is `null` and `anonymous_name` may carry the chosen alias;
 * `is_mine` is still true for the real sender (so #13 can disable the heart).
 */
export type KudoRow = {
  id: string;
  created_at: string;
  title: string;
  content: string;
  is_anonymous: boolean;
  anonymous_name: string | null;
  heart_count: number;
  liked_by_me: boolean;
  is_mine: boolean;
  sender: KudoPerson | null;
  recipient: KudoPerson;
  hashtags: KudoHashtag[];
  /** Image URLs ordered by position (1..5). */
  images: string[];
};

/** Keyset cursor for `kudos_feed`: the last row's `(created_at, id)`. */
export type KudoFeedCursor = {
  created_at: string;
  id: string;
};

export type SpotlightRecipient = {
  id: string;
  full_name: string | null;
  kudos_count: number;
  last_received_at: string;
  last_kudo_id: string;
};

export type SpotlightRecentKudo = {
  recipient_name: string | null;
  created_at: string;
};

/** `kudos_spotlight` result. Not filtered by hashtag/department. `total` = all Kudos. */
export type KudosSpotlight = {
  total: number;
  recipients: SpotlightRecipient[];
  /** The 5 latest Kudos, newest first. */
  recent: SpotlightRecentKudo[];
};

/** The single row of `kudos_my_stats` for `auth.uid()`. */
export type KudosMyStats = {
  received: number;
  sent: number;
  hearts_received: number;
  boxes_opened: number;
  boxes_unopened: number;
};

/** One row of `kudos_latest_gift_recipients`, newest award first. */
export type GiftRecipient = {
  recipient: KudoPerson;
  gift_name_vi: string;
  gift_name_en: string;
  awarded_at: string;
};
