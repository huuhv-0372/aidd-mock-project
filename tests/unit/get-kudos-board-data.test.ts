import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { fetchKudosFeed, fetchKudosSpotlight, getKudosBoardData, type ServerClient } from "@/lib/kudos/get-kudos-board-data";
import { EMPTY_USER_ID, kudosCatalog, kudosRpc } from "@/tests/e2e/support/kudos-fixtures.mjs";

const SUB = "6f1c1c3e-3b0f-4a53-9a55-2f3d2a1f9b11";

type Override = { data: unknown; error?: unknown };

/** Fake of `rpc()` and `from().select().order()`, served by the same fixtures the fake Supabase uses. */
function fakeClient(sub: string | undefined, overrides: Record<string, Override | "throw"> = {}) {
  const answer = (key: string, build: () => unknown) => {
    const override = overrides[key];
    if (override === "throw") throw new Error("boom");
    return Promise.resolve(override ? { error: null, ...override } : { data: build(), error: null });
  };
  const rpc = vi.fn((name: string, args: Record<string, unknown> = {}) =>
    answer(name, () => kudosRpc(name, args, sub)),
  );
  const from = vi.fn((table: string) => ({
    select: () => ({ order: () => answer(table, () => kudosCatalog(table)) }),
  }));
  // Cast (tests only): only rpc/from(...).select().order() are implemented, not the whole client.
  return { client: { rpc, from } as unknown as ServerClient, rpc };
}

describe("getKudosBoardData", () => {
  let errorSpy: MockInstance;
  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => errorSpy.mockRestore());

  it("loads every block for a signed-in user", async () => {
    const { client } = fakeClient(SUB);
    const data = await getKudosBoardData({}, client);
    expect(data.filters).toEqual({});
    expect(data.hashtags).toHaveLength(13);
    expect(data.departments).toHaveLength(50);
    expect(data.highlight).toHaveLength(5);
    expect(data.feed?.items).toHaveLength(10);
    expect(data.feed?.nextCursor).toEqual({
      created_at: data.feed?.items[9].created_at,
      id: data.feed?.items[9].id,
    });
    expect(data.myStats?.sent).toBeGreaterThan(0);
    expect(data.gifts).toHaveLength(10);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("applies known URL filters to highlight and feed only", async () => {
    const { client, rpc } = fakeClient(SUB);
    const data = await getKudosBoardData({ hashtag: "dedicated", department: "CEVC1" }, client);
    expect(data.filters).toEqual({ hashtag: "dedicated", department: "CEVC1" });
    const filtered = { p_hashtag: "dedicated", p_department: "CEVC1" };
    expect(rpc).toHaveBeenCalledWith("kudos_highlight", filtered);
    expect(rpc).toHaveBeenCalledWith("kudos_feed", expect.objectContaining(filtered));
    // The Spotlight streams on its own (fetchKudosSpotlight): the board read must not fetch it twice.
    expect(rpc.mock.calls.map(([name]) => name)).not.toContain("kudos_spotlight");
    for (const k of data.feed?.items ?? []) {
      expect(k.hashtags.some((h) => h.slug === "dedicated")).toBe(true);
      expect(k.recipient.department).toBe("CEVC1");
    }
  });

  it("ignores unknown filter values and queries unfiltered", async () => {
    const { client, rpc } = fakeClient(SUB);
    const data = await getKudosBoardData({ hashtag: "nope", department: "XYZ" }, client);
    expect(data.filters).toEqual({});
    expect(rpc).toHaveBeenCalledWith("kudos_highlight", { p_hashtag: null, p_department: null });
  });

  it("returns empty blocks (not errors) for an allowed user with no data", async () => {
    const { client } = fakeClient(EMPTY_USER_ID);
    const data = await getKudosBoardData({}, client);
    expect(data.highlight).toEqual([]);
    expect(data.feed).toEqual({ items: [], nextCursor: null });
    expect(data.myStats).toMatchObject({ received: 0, sent: 0 });
    expect(data.gifts).toEqual([]);
  });

  it("maps the not-allowed shape (no stats row) to a null block", async () => {
    const { client } = fakeClient(undefined);
    const data = await getKudosBoardData({}, client);
    expect(data.myStats).toBeNull();
    expect(data.feed).toEqual({ items: [], nextCursor: null });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("nulls only the block that failed (RPC error, thrown) and logs it", async () => {
    const { client } = fakeClient(SUB, {
      kudos_highlight: { data: null, error: { message: "db down" } },
      kudos_my_stats: "throw",
    });
    const data = await getKudosBoardData({}, client);
    expect(data.highlight).toBeNull();
    expect(data.myStats).toBeNull();
    expect(data.feed?.items).toHaveLength(10);
    expect(data.gifts).toHaveLength(10);
    expect(errorSpy).toHaveBeenCalledTimes(2);
  });

  it("drops URL filters when the catalogs failed to load", async () => {
    const { client } = fakeClient(SUB, {
      hashtags: { data: null, error: { message: "x" } },
      departments: { data: null, error: { message: "x" } },
    });
    const data = await getKudosBoardData({ hashtag: "dedicated", department: "CEVC1" }, client);
    expect(data.hashtags).toBeNull();
    expect(data.departments).toBeNull();
    expect(data.filters).toEqual({});
  });
});

describe("fetchKudosSpotlight", () => {
  let errorSpy: MockInstance;
  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => errorSpy.mockRestore());

  it("returns the Spotlight block with its recipients and ticker", async () => {
    const { client, rpc } = fakeClient(SUB);
    const spotlight = await fetchKudosSpotlight(client);
    expect(spotlight?.total).toBe(388);
    expect(spotlight?.recipients.length).toBeGreaterThan(0);
    expect(spotlight?.recent.length).toBeGreaterThan(0);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("kudos_spotlight");
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("returns an empty block (not an error) for an allowed user with no data", async () => {
    const { client } = fakeClient(EMPTY_USER_ID);
    expect(await fetchKudosSpotlight(client)).toEqual({ total: 0, recipients: [], recent: [] });
  });

  it("maps the not-allowed shape (null) to null without logging", async () => {
    const { client } = fakeClient(undefined);
    expect(await fetchKudosSpotlight(client)).toBeNull();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it.each([
    ["an RPC error", { data: null, error: { message: "db down" } }],
    ["malformed data", { data: { total: "many" } }],
    ["a thrown error", "throw" as const],
  ])("returns null and logs once on %s, never rejects", async (_name, override) => {
    const { client } = fakeClient(SUB, { kudos_spotlight: override });
    await expect(fetchKudosSpotlight(client)).resolves.toBeNull();
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });
});

describe("fetchKudosFeed", () => {
  let errorSpy: MockInstance;
  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => errorSpy.mockRestore());

  it("passes the keyset cursor and pages without overlap until the end", async () => {
    const { client } = fakeClient(SUB);
    const page1 = await fetchKudosFeed(client, {}, undefined, 20);
    const page2 = await fetchKudosFeed(client, {}, page1?.nextCursor ?? undefined, 20);
    expect(page1?.items).toHaveLength(20);
    expect(page2?.items).toHaveLength(8);
    expect(page2?.nextCursor).toBeNull();
    const ids = [...(page1?.items ?? []), ...(page2?.items ?? [])].map((k) => k.id);
    expect(new Set(ids).size).toBe(28);
  });

  it("returns null and logs when the RPC errors", async () => {
    const { client } = fakeClient(SUB, { kudos_feed: { data: null, error: { message: "db down" } } });
    expect(await fetchKudosFeed(client, {})).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });
});
