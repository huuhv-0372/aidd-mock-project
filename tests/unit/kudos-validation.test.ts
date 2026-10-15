import { describe, expect, it } from "vitest";
import {
  departmentSchema,
  giftRecipientSchema,
  hashtagSchema,
  kudoRowSchema,
  kudosFiltersSchema,
  loadMoreKudosInputSchema,
  myStatsSchema,
  spotlightSchema,
} from "@/lib/validation/kudos";
// Test-only fixtures that back the fake Supabase in E2E; parsing them here locks the RPC contract.
import { kudosCatalog, kudosRpc } from "@/tests/e2e/support/kudos-fixtures.mjs";

const SUB = "6f1c1c3e-3b0f-4a53-9a55-2f3d2a1f9b11";
const CURSOR = { created_at: "2026-10-14T03:00:00.123456+00:00", id: "c1000000-0000-4000-8000-000000000003" };

describe("kudos schemas vs the E2E fixtures (RPC contract)", () => {
  it("parses every feed and highlight row, including anonymous senders", () => {
    const feed = kudosRpc("kudos_feed", { p_limit: 20 }, SUB) as unknown[];
    const highlight = kudosRpc("kudos_highlight", {}, SUB) as unknown[];
    expect(feed.length).toBeGreaterThan(0);
    for (const row of [...feed, ...highlight]) expect(kudoRowSchema.safeParse(row).success).toBe(true);
    expect(feed.some((row) => (row as { sender: unknown }).sender === null)).toBe(true);
  });

  it("parses spotlight, stats, gift recipients and both catalogs", () => {
    expect(spotlightSchema.safeParse(kudosRpc("kudos_spotlight", {}, SUB)).success).toBe(true);
    const [stats] = kudosRpc("kudos_my_stats", {}, SUB) as unknown[];
    expect(myStatsSchema.safeParse(stats).success).toBe(true);
    const gifts = kudosRpc("kudos_latest_gift_recipients", { p_limit: 10 }, SUB) as unknown[];
    expect(gifts).toHaveLength(10);
    for (const g of gifts) expect(giftRecipientSchema.safeParse(g).success).toBe(true);
    for (const h of kudosCatalog("hashtags") as unknown[]) expect(hashtagSchema.safeParse(h).success).toBe(true);
    for (const d of kudosCatalog("departments") as unknown[]) expect(departmentSchema.safeParse(d).success).toBe(true);
  });
});

describe("kudoRowSchema", () => {
  const row = () => structuredClone((kudosRpc("kudos_feed", { p_limit: 1 }, SUB) as Record<string, unknown>[])[0]);

  it("rejects a row missing a column", () => {
    const rest = row();
    delete rest.heart_count;
    expect(kudoRowSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects wrong types (negative count, non-uuid id)", () => {
    expect(kudoRowSchema.safeParse({ ...row(), heart_count: -1 }).success).toBe(false);
    expect(kudoRowSchema.safeParse({ ...row(), id: "not-a-uuid" }).success).toBe(false);
  });

  // Postgres `uuid` accepts any 8-4-4-4-12 hex; the demo seed derives ids with md5(label)::uuid, whose
  // version/variant nibbles are not RFC 4122 (regression: the whole board failed to parse after seeding).
  it("accepts ids that are valid Postgres uuids but not RFC 4122 (md5-derived seed ids)", () => {
    const seedId = "4cd25feb-16b2-42ba-2a54-f9efcb1dd304"; // md5('kudos-demo-user-1')::uuid
    const base = row();
    const recipient = { ...(base.recipient as object), id: seedId };
    expect(kudoRowSchema.safeParse({ ...base, id: seedId, recipient }).success).toBe(true);
    const cursor = { ...CURSOR, id: seedId };
    expect(loadMoreKudosInputSchema.safeParse({ cursor }).success).toBe(true);
  });
});

describe("kudosFiltersSchema", () => {
  it("trims values and treats both keys as optional", () => {
    expect(kudosFiltersSchema.parse({ hashtag: " dedicated " })).toEqual({ hashtag: "dedicated" });
    expect(kudosFiltersSchema.parse({})).toEqual({});
  });

  it("rejects empty and over-long values", () => {
    expect(kudosFiltersSchema.safeParse({ hashtag: "  " }).success).toBe(false);
    expect(kudosFiltersSchema.safeParse({ department: "x".repeat(101) }).success).toBe(false);
  });
});

describe("loadMoreKudosInputSchema", () => {
  it("accepts a cursor with Z or offset timestamps, filters and a limit up to 20", () => {
    expect(loadMoreKudosInputSchema.safeParse({ cursor: CURSOR, hashtag: "dedicated", limit: 20 }).success).toBe(true);
    expect(
      loadMoreKudosInputSchema.safeParse({ cursor: { ...CURSOR, created_at: "2026-10-14T03:00:00Z" } }).success,
    ).toBe(true);
  });

  it.each([
    ["missing cursor", {}],
    ["bad timestamp", { cursor: { ...CURSOR, created_at: "yesterday" } }],
    ["bad id", { cursor: { ...CURSOR, id: "1; drop table kudos" } }],
    ["limit above 20", { cursor: CURSOR, limit: 21 }],
    ["limit zero", { cursor: CURSOR, limit: 0 }],
    ["fractional limit", { cursor: CURSOR, limit: 1.5 }],
    ["empty filter", { cursor: CURSOR, department: "" }],
  ])("rejects %s", (_name, input) => {
    expect(loadMoreKudosInputSchema.safeParse(input).success).toBe(false);
  });
});
