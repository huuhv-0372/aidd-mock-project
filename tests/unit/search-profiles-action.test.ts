import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { searchProfiles } from "@/lib/kudos/search-profiles-action";
import { PROFILE_SEARCH_QUERY_MAX, profileSearchQuerySchema } from "@/lib/validation/profile-search";

const ID = "2a000000-0000-0000-0000-000000000101";

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.createClient }));

describe("profileSearchQuerySchema", () => {
  it("accepts 1-100 chars and trims", () => {
    expect(profileSearchQuerySchema.safeParse("a").success).toBe(true);
    expect(profileSearchQuerySchema.safeParse("x".repeat(PROFILE_SEARCH_QUERY_MAX)).success).toBe(true);
    expect(profileSearchQuerySchema.parse("  An  ")).toBe("An");
  });

  it.each([["101 chars", "x".repeat(101)], ["empty", ""], ["blank", "   "], ["number", 123], ["null", null]])(
    "rejects %s",
    (_label, value) => {
      expect(profileSearchQuerySchema.safeParse(value).success).toBe(false);
    },
  );
});

describe("searchProfiles", () => {
  let errorSpy: MockInstance;
  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    for (const mock of Object.values(mocks)) mock.mockReset();
    mocks.createClient.mockResolvedValue({ rpc: mocks.rpc });
  });
  afterEach(() => errorSpy.mockRestore());

  it.each([
    ["an empty query", ""],
    ["a blank query", "   "],
    ["a 101-char query", "x".repeat(101)],
    ["a number", 42 as unknown as string],
    ["undefined", undefined as unknown as string],
  ])("rejects %s without creating a client or calling the RPC", async (_label, query) => {
    expect(await searchProfiles(query)).toEqual({ ok: false });
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("searches name or email with the trimmed query and returns validated rows without extra keys", async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ id: ID, full_name: "Nguyễn Văn An", avatar_url: null, department: "CEVC1", email: "an@x.com" }],
      error: null,
    });
    const result = await searchProfiles("  An  ");
    expect(mocks.rpc).toHaveBeenCalledWith("kudos_search_sunners", { p_query: "An", p_limit: 10, p_name_only: false });
    expect(result).toEqual({
      ok: true,
      items: [{ id: ID, full_name: "Nguyễn Văn An", avatar_url: null, department: "CEVC1" }],
    });
  });

  it("returns { ok: false } and logs when the RPC fails, returns junk, or the client throws", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "secret db detail" } });
    expect(await searchProfiles("an")).toEqual({ ok: false });
    mocks.rpc.mockResolvedValue({ data: [{ id: "bad" }], error: null });
    expect(await searchProfiles("an")).toEqual({ ok: false });
    mocks.createClient.mockRejectedValue(new Error("missing env"));
    expect(await searchProfiles("an")).toEqual({ ok: false });
    expect(errorSpy).toHaveBeenCalledTimes(3);
  });
});
