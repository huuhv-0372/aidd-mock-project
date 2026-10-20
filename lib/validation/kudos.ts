import { z } from "zod";
import { getSupabaseEnv } from "@/lib/supabase/env";
import type {
  Department,
  GiftRecipient,
  Hashtag,
  KudoPerson,
  KudoRow,
  KudosMyStats,
  KudosSpotlight,
} from "@/lib/kudos/kudo-types";

/** Feed page size shown to the user, and the hard ceiling the `kudos_feed` RPC itself enforces. */
export const KUDOS_PAGE_SIZE = 10;
export const KUDOS_MAX_PAGE_SIZE = 20;

const count = z.number().int().nonnegative();
// PostgREST serialises timestamptz as ISO-8601 with an offset; the exact text is not re-parsed here.
const timestamp = z.string().min(1);
// Postgres `uuid` accepts any 8-4-4-4-12 hex (e.g. md5(label)::uuid seed ids), so match that, not RFC 4122.
const pgUuid = z.guid();

export const kudoPersonSchema = z.object({
  id: pgUuid,
  full_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  department: z.string().nullable(),
  kudos_received: count,
  distinct_senders: count,
}) satisfies z.ZodType<KudoPerson>;

export const hashtagSchema = z.object({
  id: z.number().int(),
  slug: z.string().min(1),
  name_vi: z.string(),
  name_en: z.string(),
  sort_order: z.number().int(),
}) satisfies z.ZodType<Hashtag>;

export const departmentSchema = z.object({
  code: z.string().min(1),
  sort_order: z.number().int(),
}) satisfies z.ZodType<Department>;

/** Origin of the Supabase project (where Storage serves Kudo images), or null when the env is unusable. */
function supabaseOrigin(): string | null {
  try {
    return new URL(getSupabaseEnv().url).origin;
  } catch {
    return null;
  }
}

let loggedDroppedImage = false;

/**
 * Read-side allow-list for Kudo images: the DB cannot know the project URL, so any `images` text it returns is
 * untrusted. Only internal `/images/...` paths and URLs on the Supabase origin survive; the rest never reach `<img>`.
 */
function keepAllowedKudoImages(urls: string[]): string[] {
  const origin = supabaseOrigin();
  const allowed = urls.filter((url) => {
    if (url.startsWith("/images/")) return !url.includes("\\") && !url.includes("..");
    try {
      return origin !== null && new URL(url).origin === origin;
    } catch {
      return false;
    }
  });
  if (allowed.length !== urls.length && !loggedDroppedImage) {
    loggedDroppedImage = true;
    console.error("[kudos] dropped Kudo image URLs outside the allowed hosts");
  }
  return allowed;
}

export const kudoRowSchema = z.object({
  id: pgUuid,
  created_at: timestamp,
  title: z.string(),
  content: z.string(),
  is_anonymous: z.boolean(),
  anonymous_name: z.string().nullable(),
  heart_count: count,
  liked_by_me: z.boolean(),
  is_mine: z.boolean(),
  sender: kudoPersonSchema.nullable(),
  recipient: kudoPersonSchema,
  hashtags: z.array(hashtagSchema.pick({ slug: true, name_vi: true, name_en: true })),
  images: z.array(z.string()).transform(keepAllowedKudoImages),
}) satisfies z.ZodType<KudoRow>;

export const spotlightSchema = z.object({
  total: count,
  recipients: z.array(
    z.object({
      id: pgUuid,
      full_name: z.string().nullable(),
      kudos_count: count,
      last_received_at: timestamp,
      last_kudo_id: pgUuid,
    }),
  ),
  recent: z.array(z.object({ recipient_name: z.string().nullable(), created_at: timestamp })),
}) satisfies z.ZodType<KudosSpotlight>;

export const myStatsSchema = z.object({
  received: count,
  sent: count,
  hearts_received: count,
  boxes_opened: count,
  boxes_unopened: count,
}) satisfies z.ZodType<KudosMyStats>;

export const giftRecipientSchema = z.object({
  recipient: kudoPersonSchema,
  gift_name_vi: z.string(),
  gift_name_en: z.string(),
  awarded_at: timestamp,
}) satisfies z.ZodType<GiftRecipient>;

/** Upper bound for a filter value (longest department code is well under this). */
const FILTER_MAX_LENGTH = 100;
const filterValue = z.string().trim().min(1).max(FILTER_MAX_LENGTH);

/** `?hashtag=<slug>&department=<code>` after catalog matching: either key may be absent. */
export const kudosFiltersSchema = z.object({
  hashtag: filterValue.optional(),
  department: filterValue.optional(),
});

export type KudosFilters = z.infer<typeof kudosFiltersSchema>;

/** Keyset cursor: the last row's `(created_at, id)`. `created_at` is ISO-8601 with an offset or `Z`. */
export const kudoFeedCursorSchema = z.object({
  created_at: z.iso.datetime({ offset: true }),
  id: pgUuid,
});

/** Untrusted input of the "load more" Server Action. */
export const loadMoreKudosInputSchema = kudosFiltersSchema.extend({
  cursor: kudoFeedCursorSchema,
  limit: z.number().int().min(1).max(KUDOS_MAX_PAGE_SIZE).optional(),
});

export type LoadMoreKudosInput = z.infer<typeof loadMoreKudosInputSchema>;

/** Untrusted input of the heart Server Action: the desired state, never a count or an award (the database owns both). */
export const setKudoHeartInputSchema = z.object({ kudoId: pgUuid, liked: z.boolean() }).strict();

/** One row answered by `set_kudo_heart`: the caller's real state and the Kudo's count after the triggers. */
export const kudoHeartStateSchema = z.object({ liked: z.boolean(), heart_count: count });
