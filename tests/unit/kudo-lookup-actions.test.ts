import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { getHashtagOptions } from "@/lib/kudos/get-hashtag-options-action";
import { searchSunners } from "@/lib/kudos/search-sunners-action";

const ID = "2a000000-0000-0000-0000-000000000101";

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), rpc: vi.fn(), order: vi.fn(), select: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.createClient }));

describe("kudo lookup actions", () => {
  let errorSpy: MockInstance;
  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    for (const mock of Object.values(mocks)) mock.mockReset();
    mocks.select.mockReturnValue({ order: mocks.order });
    mocks.from.mockReturnValue({ select: mocks.select });
    mocks.createClient.mockResolvedValue({ rpc: mocks.rpc, from: mocks.from });
  });
  afterEach(() => errorSpy.mockRestore());

  describe("searchSunners", () => {
    it("sends the trimmed query to kudos_search_sunners and returns validated rows without extra keys", async () => {
      mocks.rpc.mockResolvedValue({
        data: [{ id: ID, full_name: "Nguyễn Văn An", avatar_url: null, department: "CEVC1", email: "an@x.com" }],
        error: null,
      });
      const result = await searchSunners("  Nguyen  ");
      // p_name_only always explicit: name OR email unless the caller asks for "@ + tên"
      expect(mocks.rpc).toHaveBeenCalledWith("kudos_search_sunners", { p_query: "Nguyen", p_limit: 10, p_name_only: false });
      expect(result).toEqual({
        ok: true,
        items: [{ id: ID, full_name: "Nguyễn Văn An", avatar_url: null, department: "CEVC1" }],
      });
    });

    it("passes nameOnly through as p_name_only and sends an empty (or blank) query as '' for the first Sunners", async () => {
      mocks.rpc.mockResolvedValue({ data: [], error: null });
      expect(await searchSunners("Văn An", { nameOnly: true })).toEqual({ ok: true, items: [] });
      expect(mocks.rpc).toHaveBeenLastCalledWith("kudos_search_sunners", { p_query: "Văn An", p_limit: 10, p_name_only: true });
      await searchSunners("   ", { nameOnly: true });
      expect(mocks.rpc).toHaveBeenLastCalledWith("kudos_search_sunners", { p_query: "", p_limit: 10, p_name_only: true });
      await searchSunners("", {});
      expect(mocks.rpc).toHaveBeenLastCalledWith("kudos_search_sunners", { p_query: "", p_limit: 10, p_name_only: false });
    });

    it.each([
      ["a 51-char query", "x".repeat(51), undefined],
      ["an undefined query", undefined as unknown as string, undefined],
      ["a number query", 42 as unknown as string, undefined],
      ["a non-boolean nameOnly", "an", { nameOnly: "yes" } as unknown as { nameOnly: boolean }],
      ["an unknown option", "an", { nameOnly: true, email: true } as unknown as { nameOnly: boolean }],
      ["non-object options", "an", "nameOnly" as unknown as { nameOnly: boolean }],
    ])("rejects %s without touching the database", async (_label, query, options) => {
      expect(await searchSunners(query, options)).toEqual({ ok: false });
      expect(mocks.createClient).not.toHaveBeenCalled();
    });

    it("returns { ok: false } and logs when the RPC fails, returns junk, or the client throws", async () => {
      mocks.rpc.mockResolvedValue({ data: null, error: { message: "secret db detail" } });
      expect(await searchSunners("an")).toEqual({ ok: false });
      mocks.rpc.mockResolvedValue({ data: [{ id: "bad" }], error: null });
      expect(await searchSunners("an")).toEqual({ ok: false });
      mocks.createClient.mockRejectedValue(new Error("missing env"));
      expect(await searchSunners("an")).toEqual({ ok: false });
      expect(errorSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe("getHashtagOptions", () => {
    const rows = [
      { slug: "dedicated", name_vi: "Cống hiến", name_en: "Dedicated" },
      { slug: "professional", name_vi: "Giỏi chuyên môn", name_en: "Professional" },
    ];

    it("reads the catalog in catalog order and keeps only slug + names", async () => {
      mocks.order.mockResolvedValue({ data: rows.map((row, i) => ({ ...row, id: i, sort_order: i })), error: null });
      expect(await getHashtagOptions()).toEqual({ ok: true, items: rows });
      expect(mocks.from).toHaveBeenCalledWith("hashtags");
      expect(mocks.order).toHaveBeenCalledWith("sort_order");
    });

    it("returns { ok: false } on a query error, malformed rows, or a thrown error", async () => {
      mocks.order.mockResolvedValue({ data: null, error: { message: "secret" } });
      expect(await getHashtagOptions()).toEqual({ ok: false });
      mocks.order.mockResolvedValue({ data: [{ slug: "" }], error: null });
      expect(await getHashtagOptions()).toEqual({ ok: false });
      mocks.createClient.mockRejectedValue(new Error("missing env"));
      expect(await getHashtagOptions()).toEqual({ ok: false });
      expect(errorSpy).toHaveBeenCalledTimes(3);
    });
  });
});
