import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { loadMoreKudos } from "@/lib/kudos/load-more-kudos-action";
import { kudosRpc } from "@/tests/e2e/support/kudos-fixtures.mjs";

const SUB = "6f1c1c3e-3b0f-4a53-9a55-2f3d2a1f9b11";
const CURSOR = { created_at: "2026-10-14T03:00:00.000Z", id: "c1000000-0000-4000-8000-000000000003" };

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.createClient }));

describe("loadMoreKudos", () => {
  let errorSpy: MockInstance;
  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.rpc.mockReset();
    mocks.rpc.mockImplementation(async (name: string, args: Record<string, unknown>) => ({
      data: kudosRpc(name, args, SUB),
      error: null,
    }));
    mocks.createClient.mockReset();
    mocks.createClient.mockResolvedValue({ rpc: mocks.rpc });
  });
  afterEach(() => errorSpy.mockRestore());

  it("returns the next page and a cursor from the validated input", async () => {
    const result = await loadMoreKudos({ cursor: CURSOR, hashtag: "dedicated" });
    expect(mocks.rpc).toHaveBeenCalledWith("kudos_feed", {
      p_hashtag: "dedicated",
      p_department: null,
      p_cursor_created_at: CURSOR.created_at,
      p_cursor_id: CURSOR.id,
      p_limit: 10,
    });
    expect("items" in result).toBe(true);
    if ("items" in result) {
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items.every((k) => Date.parse(k.created_at) <= Date.parse(CURSOR.created_at))).toBe(true);
    }
  });

  it("passes a valid custom limit through", async () => {
    await loadMoreKudos({ cursor: CURSOR, limit: 20 });
    expect(mocks.rpc).toHaveBeenCalledWith("kudos_feed", expect.objectContaining({ p_limit: 20 }));
  });

  it.each([
    ["wrong cursor", { cursor: { created_at: "x", id: "y" } }],
    ["missing cursor", {}],
    ["limit above 20", { cursor: CURSOR, limit: 21 }],
    ["non-object", "kudos"],
    ["null", null],
  ])("rejects %s without touching the database", async (_name, input) => {
    expect(await loadMoreKudos(input)).toEqual({ error: "generic" });
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("returns only a generic error when the RPC fails and logs the cause", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "secret db detail" } });
    const result = await loadMoreKudos({ cursor: CURSOR });
    expect(result).toEqual({ error: "generic" });
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(errorSpy).toHaveBeenCalled();
  });

  it("returns a generic error when the client cannot be created", async () => {
    mocks.createClient.mockRejectedValue(new Error("missing env"));
    expect(await loadMoreKudos({ cursor: CURSOR })).toEqual({ error: "generic" });
    expect(errorSpy).toHaveBeenCalled();
  });
});
