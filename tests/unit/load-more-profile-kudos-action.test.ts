import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { loadMoreProfileKudos } from "@/lib/profiles/load-more-profile-kudos-action";
import { KUDOS } from "@/tests/e2e/support/kudos-fixtures.mjs";
import { BUSY_PROFILE, profileRpc } from "@/tests/e2e/support/profile-fixtures.mjs";

const SUB = "6f1c1c3e-3b0f-4a53-9a55-2f3d2a1f9b11";
const CURSOR = { created_at: "2026-10-12T21:00:00.000Z", id: BUSY_PROFILE.kudoIds[3] };
const SELF_SENT = KUDOS.filter((k) => k.sender_key === "viewer").map((k) => String(k.id));

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.createClient }));

describe("loadMoreProfileKudos", () => {
  let errorSpy: MockInstance;
  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.rpc.mockReset();
    mocks.rpc.mockImplementation(async (name: string, args: Record<string, unknown>) => ({
      data: profileRpc(name, args, SUB),
      error: null,
    }));
    mocks.createClient.mockReset();
    mocks.createClient.mockResolvedValue({ rpc: mocks.rpc });
  });
  afterEach(() => errorSpy.mockRestore());

  it("loads a full page of received Kudos after the cursor, with the next cursor", async () => {
    const page1 = await loadMoreProfileKudos({ profileId: BUSY_PROFILE.id, direction: "received", cursor: null });
    if (!("items" in page1) || !page1.nextCursor) throw new Error(`expected a full page, got ${JSON.stringify(page1)}`);
    expect(page1.items.map((k) => k.id)).toEqual(BUSY_PROFILE.kudoIds.slice(0, 10));
    expect(mocks.rpc).toHaveBeenLastCalledWith("kudos_profile_feed", {
      p_profile: BUSY_PROFILE.id,
      p_direction: "received",
      p_cursor_created_at: null,
      p_cursor_id: null,
      p_limit: 10,
    });

    const page2 = await loadMoreProfileKudos({ profileId: BUSY_PROFILE.id, direction: "received", cursor: page1.nextCursor });
    expect(mocks.rpc).toHaveBeenLastCalledWith("kudos_profile_feed", expect.objectContaining({
      p_cursor_created_at: page1.nextCursor.created_at,
      p_cursor_id: page1.nextCursor.id,
    }));
    expect(page2).toEqual({ items: expect.any(Array), nextCursor: null });
    if ("items" in page2) expect(page2.items.map((k) => k.id)).toEqual(BUSY_PROFILE.kudoIds.slice(10));
  });

  it("passes the sent direction through; the RPC decides what the caller may see", async () => {
    const mine = await loadMoreProfileKudos({ profileId: SUB, direction: "sent", cursor: null });
    expect("items" in mine && mine.items.map((k) => k.id)).toEqual(SELF_SENT);
    const theirs = await loadMoreProfileKudos({ profileId: BUSY_PROFILE.id, direction: "sent", cursor: CURSOR });
    expect(theirs).toEqual({ items: [], nextCursor: null });
    expect(mocks.rpc).toHaveBeenLastCalledWith("kudos_profile_feed", expect.objectContaining({ p_direction: "sent" }));
  });

  it.each([
    ["null", null],
    ["a string", "received"],
    ["an empty object", {}],
    ["a malformed profile id", { profileId: "not-a-uuid", direction: "received", cursor: null }],
    ["an unknown direction", { profileId: SUB, direction: "all", cursor: null }],
    ["a missing cursor key", { profileId: SUB, direction: "received" }],
    ["a malformed cursor", { profileId: SUB, direction: "received", cursor: { created_at: "x", id: "y" } }],
    ["an extra key (strict)", { profileId: SUB, direction: "received", cursor: null, limit: 20 }],
  ])("rejects %s without touching the database", async (_name, input) => {
    expect(await loadMoreProfileKudos(input)).toEqual({ error: "generic" });
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["an RPC error", { data: null, error: { message: "secret db detail" } }],
    ["rows that fail parsing", { data: [{ id: BUSY_PROFILE.kudoIds[0], title: 1 }], error: null }],
  ])("returns only a generic error on %s and logs the cause", async (_name, answer) => {
    mocks.rpc.mockResolvedValue(answer);
    const result = await loadMoreProfileKudos({ profileId: SUB, direction: "received", cursor: null });
    expect(result).toEqual({ error: "generic" });
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(errorSpy).toHaveBeenCalled();
  });

  it("returns a generic error when the client cannot be created", async () => {
    mocks.createClient.mockRejectedValue(new Error("missing env"));
    expect(await loadMoreProfileKudos({ profileId: SUB, direction: "received", cursor: null })).toEqual({ error: "generic" });
    expect(errorSpy).toHaveBeenCalled();
  });
});
