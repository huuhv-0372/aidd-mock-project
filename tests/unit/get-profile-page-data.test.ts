import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import type { ServerClient } from "@/lib/kudos/get-kudos-board-data";
import { getProfilePageData } from "@/lib/profiles/get-profile-page-data";
import { KUDOS, personId, viewerStats } from "@/tests/e2e/support/kudos-fixtures.mjs";
import { BUSY_PROFILE, profileRpc } from "@/tests/e2e/support/profile-fixtures.mjs";

// The pages call getProfilePageData(id) with no client: the default one must be created inside the guarded path.
const createServerClient = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: createServerClient }));

const SUB = "6f1c1c3e-3b0f-4a53-9a55-2f3d2a1f9b11";
const OTHER_ID = personId("p01"); // a board person: 3 received Kudos
const UNKNOWN_ID = "c1000000-0000-0000-0000-00000000ffff";
const SELF_RECEIVED = KUDOS.filter((k) => k.recipient_key === "viewer").map((k) => String(k.id));
const FIRST_PAGE = { p_direction: "received", p_cursor_created_at: null, p_cursor_id: null, p_limit: 10 };

type Answer = { data: unknown; error?: unknown } | "throw";
type Opts = { sub?: string | null; claims?: { data: unknown; error: unknown }; answers?: Record<string, Answer> };

/** Fake client: getClaims() + rpc() served by the profile/board fixtures the fake Supabase uses; `answers` override one RPC. */
function fakeClient({ sub = SUB, claims, answers = {} }: Opts = {}) {
  const getClaims = vi.fn(async () => claims ?? { data: sub ? { claims: { sub } } : null, error: null });
  const rpc = vi.fn(async (name: string, args: Record<string, unknown> = {}) => {
    const answer = answers[name];
    if (answer === "throw") throw new Error("boom");
    if (answer) return { error: null, ...answer };
    const profiled = profileRpc(name, args, sub ?? undefined); // undefined only for a non-profile RPC; null is a real answer
    return { data: profiled === undefined ? kudosBoardRpc(name, sub) : profiled, error: null };
  });
  // Cast (tests only): only getClaims() and rpc() are implemented, not the whole client.
  return { client: { auth: { getClaims }, rpc } as unknown as ServerClient, rpc, getClaims };
}

/** kudos_my_stats for an allowed caller (the only board RPC the loader uses). */
const kudosBoardRpc = (name: string, sub: string | null) =>
  name === "kudos_my_stats" && sub ? [viewerStats()] : undefined;

const calledNames = (rpc: ReturnType<typeof fakeClient>["rpc"]) => rpc.mock.calls.map(([name]) => name);

describe("getProfilePageData", () => {
  let errorSpy: MockInstance;
  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => errorSpy.mockRestore());

  it("self (no id): card, my stats and the first received page", async () => {
    const { client, rpc } = fakeClient();
    const result = await getProfilePageData(null, client);
    expect(rpc).toHaveBeenCalledWith("profile_card", { p_id: SUB });
    expect(rpc).toHaveBeenCalledWith("kudos_my_stats");
    expect(rpc).toHaveBeenCalledWith("kudos_profile_feed", { p_profile: SUB, ...FIRST_PAGE });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.self).toBe(true);
    expect(result.person.id).toBe(SUB);
    expect(result.stats).toEqual(viewerStats());
    expect(result.feed?.items.map((k) => k.id)).toEqual(SELF_RECEIVED);
    expect(result.feed?.nextCursor).toBeNull(); // 3 rows: not a full page
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("another Sunner: their card and received page, and no stats call", async () => {
    const { client, rpc } = fakeClient();
    const result = await getProfilePageData(OTHER_ID, client);
    expect(calledNames(rpc).sort()).toEqual(["kudos_profile_feed", "profile_card"]);
    expect(rpc).toHaveBeenCalledWith("kudos_profile_feed", { p_profile: OTHER_ID, ...FIRST_PAGE });
    expect(result).toMatchObject({ status: "ok", self: false, stats: null, person: { id: OTHER_ID } });
  });

  it("a full first page carries the last row as the next cursor", async () => {
    const result = await getProfilePageData(BUSY_PROFILE.id, fakeClient().client);
    if (result.status !== "ok" || !result.feed) throw new Error(`expected a feed, got ${JSON.stringify(result)}`);
    expect(result.feed.items.map((k) => k.id)).toEqual(BUSY_PROFILE.kudoIds.slice(0, 10));
    const last = result.feed.items[9];
    expect(result.feed.nextCursor).toEqual({ created_at: last.created_at, id: last.id });
  });

  it.each(["not-a-uuid", "", "42", "11111111-1111-4111-8111", "' or 1=1"])(
    "is not_found for the malformed id %j without any query",
    async (id) => {
      const { client, rpc, getClaims } = fakeClient();
      expect(await getProfilePageData(id, client)).toEqual({ status: "not_found" });
      expect(rpc).not.toHaveBeenCalled();
      expect(getClaims).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["the same case", SUB],
    ["another case", SUB.toUpperCase()],
  ])("is redirect_self for my own id in %s, with no RPC", async (_name, id) => {
    const { client, rpc } = fakeClient();
    expect(await getProfilePageData(id, client)).toEqual({ status: "redirect_self" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([null, OTHER_ID])("is not_found without claims (id %j), with no RPC", async (id) => {
    const { client, rpc } = fakeClient({ sub: null });
    expect(await getProfilePageData(id, client)).toEqual({ status: "not_found" });
    expect(rpc).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("is error and logs when getClaims fails", async () => {
    const { client, rpc } = fakeClient({ claims: { data: null, error: { message: "jwks down" } } });
    expect(await getProfilePageData(null, client)).toEqual({ status: "error" });
    expect(rpc).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledOnce();
  });

  it("is not_found when profile_card answers null, and loads nothing else", async () => {
    const { client, rpc } = fakeClient();
    expect(await getProfilePageData(UNKNOWN_ID, client)).toEqual({ status: "not_found" });
    expect(calledNames(rpc)).toEqual(["profile_card"]);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it.each([
    ["an RPC error", { data: null, error: { message: "secret db detail" } }],
    ["a card that fails the schema", { data: { id: OTHER_ID, full_name: 7 } }],
    ["a card with an email-only shape", { data: { email: "a@sun-asterisk.com" } }],
    ["a thrown error", "throw" as const],
  ])("is error and logs server-side on %s from profile_card", async (_name, answer) => {
    const { client, rpc } = fakeClient({ answers: { profile_card: answer } });
    const result = await getProfilePageData(OTHER_ID, client);
    expect(result).toEqual({ status: "error" });
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(calledNames(rpc)).toEqual(["profile_card"]);
    expect(errorSpy).toHaveBeenCalled();
  });

  it.each([
    ["an RPC error", { data: null, error: { message: "db down" } }],
    ["malformed rows", { data: [{ id: "x" }] }],
    ["a thrown error", "throw" as const],
  ])("keeps the page with feed null on %s from the feed", async (_name, answer) => {
    const result = await getProfilePageData(null, fakeClient({ answers: { kudos_profile_feed: answer } }).client);
    expect(result).toMatchObject({ status: "ok", self: true, feed: null, stats: viewerStats() });
    expect(errorSpy).toHaveBeenCalled();
  });

  it.each([
    ["an RPC error", { data: null, error: { message: "db down" } }],
    ["malformed stats", { data: [{ received: -1 }] }],
    ["no row (a refused caller)", { data: [] }],
  ])("keeps the page with stats null on %s from kudos_my_stats", async (_name, answer) => {
    const result = await getProfilePageData(null, fakeClient({ answers: { kudos_my_stats: answer } }).client);
    expect(result).toMatchObject({ status: "ok", self: true, stats: null });
    if (result.status === "ok") expect(result.feed?.items.map((k) => k.id)).toEqual(SELF_RECEIVED);
  });

  describe("with the default client (as the pages call it)", () => {
    beforeEach(() => {
      createServerClient.mockReset();
    });

    it("is not_found for a malformed id without creating a client", async () => {
      expect(await getProfilePageData("not-a-uuid")).toEqual({ status: "not_found" });
      expect(createServerClient).not.toHaveBeenCalled();
    });

    it("is error and logs when the client cannot be created (broken env)", async () => {
      createServerClient.mockImplementation(async () => {
        throw new Error("Missing Supabase env");
      });
      expect(await getProfilePageData(null)).toEqual({ status: "error" });
      expect(errorSpy).toHaveBeenCalledOnce();
    });

    it("queries through the client it creates", async () => {
      const { client, rpc } = fakeClient();
      createServerClient.mockResolvedValue(client);
      expect((await getProfilePageData(OTHER_ID)).status).toBe("ok");
      expect(rpc).toHaveBeenCalledWith("profile_card", { p_id: OTHER_ID });
    });
  });
});
