import type { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  Department,
  GiftRecipient,
  Hashtag,
  KudoFeedCursor,
  KudoRow,
  KudosMyStats,
  KudosSpotlight,
} from "@/lib/kudos/kudo-types";
import { parseKudosFilters, type RawSearchParams } from "@/lib/kudos/parse-kudos-filters";
import {
  KUDOS_PAGE_SIZE,
  departmentSchema,
  giftRecipientSchema,
  hashtagSchema,
  kudoRowSchema,
  myStatsSchema,
  spotlightSchema,
  type KudosFilters,
} from "@/lib/validation/kudos";
import { z } from "zod";

/** The real per-request server client (type-only import: no runtime dependency here). */
export type ServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type KudosFeedPage = {
  items: KudoRow[];
  /** `null` when the page was not full, i.e. there is nothing left to load. */
  nextCursor: KudoFeedCursor | null;
};

/** Every block is independent: a failed one is `null` and the UI shows an error only there. The Spotlight is not part of it: it streams on its own (`fetchKudosSpotlight`). */
export type KudosBoardData = {
  /** Filters actually applied (unknown URL values already dropped). */
  filters: KudosFilters;
  hashtags: Hashtag[] | null;
  departments: Department[] | null;
  highlight: KudoRow[] | null;
  feed: KudosFeedPage | null;
  /** `null` also for a caller the RPC refuses (no row). */
  myStats: KudosMyStats | null;
  gifts: GiftRecipient[] | null;
};

type RpcResult = { data: unknown; error: unknown };

/** Validates one query result; any failure is logged in full server-side and becomes `null`. */
async function readBlock<T>(
  name: string,
  query: () => PromiseLike<RpcResult>,
  parse: (data: unknown) => { success: true; data: T } | { success: false; error: unknown },
): Promise<T | null> {
  try {
    const { data, error } = await query();
    if (error) {
      console.error(`[kudos] ${name} failed`, error);
      return null;
    }
    const parsed = parse(data);
    if (!parsed.success) {
      console.error(`[kudos] ${name} returned malformed data`, parsed.error);
      return null;
    }
    return parsed.data;
  } catch (err) {
    console.error(`[kudos] ${name} unexpected failure`, err);
    return null;
  }
}

const rowsSchema = z.array(kudoRowSchema);

/** One page of `kudos_feed` (newest first, keyset). `null` on any failure. */
export async function fetchKudosFeed(
  client: ServerClient,
  filters: KudosFilters,
  cursor?: KudoFeedCursor,
  limit: number = KUDOS_PAGE_SIZE,
): Promise<KudosFeedPage | null> {
  const items = await readBlock(
    "kudos_feed",
    () => client.rpc("kudos_feed", {
      p_hashtag: filters.hashtag ?? null,
      p_department: filters.department ?? null,
      p_cursor_created_at: cursor?.created_at ?? null,
      p_cursor_id: cursor?.id ?? null,
      p_limit: limit,
    }),
    (data) => rowsSchema.safeParse(data),
  );
  if (items === null) return null;
  const last = items[items.length - 1];
  const nextCursor = items.length >= limit && last ? { created_at: last.created_at, id: last.id } : null;
  return { items, nextCursor };
}

/**
 * The Spotlight block (`kudos_spotlight`, not filtered by hashtag/department). `null` on any failure and
 * also for a caller the RPC refuses. Never rejects, so the page may start it without awaiting and hand the
 * promise to a `<Suspense>` child, which keeps the rest of the board from waiting on it.
 */
export function fetchKudosSpotlight(client: ServerClient): Promise<KudosSpotlight | null> {
  return readBlock("kudos_spotlight", () => client.rpc("kudos_spotlight"), (data) =>
    data === null ? { success: true, data: null } : spotlightSchema.safeParse(data),
  );
}

/**
 * Everything the Live board needs in one pass, except the Spotlight (`fetchKudosSpotlight`). Catalogs and the unfiltered blocks start together;
 * the filtered blocks (highlight, feed) start once the URL filters are matched against the catalogs.
 * Never throws. `client` is injectable so tests need no `next/headers`.
 */
export async function getKudosBoardData(
  searchParams: RawSearchParams,
  client?: ServerClient,
): Promise<KudosBoardData> {
  const supabase = client ?? (await createDefaultClient());

  const catalogs = Promise.all([
    readBlock(
      "hashtags",
      () => supabase.from("hashtags").select("id, slug, name_vi, name_en, sort_order").order("sort_order"),
      (data) => z.array(hashtagSchema).safeParse(data),
    ),
    readBlock(
      "departments",
      () => supabase.from("departments").select("code, sort_order").order("sort_order"),
      (data) => z.array(departmentSchema).safeParse(data),
    ),
  ]);
  const unfiltered = Promise.all([
    // One row for an allowed caller, none otherwise.
    readBlock("kudos_my_stats", () => supabase.rpc("kudos_my_stats"), (data) =>
      z.array(myStatsSchema).max(1).transform((rows) => rows[0] ?? null).safeParse(data),
    ),
    readBlock(
      "kudos_latest_gift_recipients",
      () => supabase.rpc("kudos_latest_gift_recipients", { p_limit: 10 }),
      (data) => z.array(giftRecipientSchema).safeParse(data),
    ),
  ]);

  const [hashtags, departments] = await catalogs;
  const filters = parseKudosFilters(searchParams, {
    hashtagSlugs: hashtags?.map((h) => h.slug) ?? null,
    departmentCodes: departments?.map((d) => d.code) ?? null,
  });

  const [highlight, feed, [myStats, gifts]] = await Promise.all([
    readBlock(
      "kudos_highlight",
      () => supabase.rpc("kudos_highlight", {
        p_hashtag: filters.hashtag ?? null,
        p_department: filters.department ?? null,
      }),
      (data) => rowsSchema.safeParse(data),
    ),
    fetchKudosFeed(supabase, filters),
    unfiltered,
  ]);

  return { filters, hashtags, departments, highlight, feed, myStats, gifts };
}

/** Lazy import keeps `next/headers` out of the module graph until a real request needs it. */
async function createDefaultClient(): Promise<ServerClient> {
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  return createSupabaseServerClient();
}
