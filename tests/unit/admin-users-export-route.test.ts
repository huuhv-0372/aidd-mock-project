import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { GET } from "@/app/[locale]/admin/users/export/route";
import { rpcRow } from "./support/admin-user-rpc-row";

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.createClient }));

const URL_BASE = "http://localhost/vi/admin/users/export";
type Answer = { data: unknown; error: unknown };
type ListArgs = { p_limit: number; p_offset: number };
type List = Answer | ((args: ListArgs) => Answer);

/** is_admin answers `admin`; admin_list_users answers `list` (or what `list(args)` returns for that window). */
function rpcAnswers(admin: Answer, list: List = { data: [rpcRow], error: null }) {
  mocks.rpc.mockImplementation(async (name: string, args: ListArgs) =>
    name === "is_admin" ? admin : typeof list === "function" ? list(args) : list,
  );
}

const userId = (n: number) => `a1000000-0000-0000-0000-${String(n).padStart(12, "0")}`;

/** A `total`-row filtered result served window by window, never more than `maxRows` at once (PostgREST db-max-rows). */
const windowsOf =
  (total: number, maxRows = 1000) =>
  ({ p_limit, p_offset }: ListArgs): Answer => ({
    data: Array.from({ length: Math.max(0, Math.min(p_limit, maxRows, total - p_offset)) }, (_, i) => ({
      ...rpcRow,
      user_id: userId(p_offset + i + 1),
      row_no: p_offset + i + 1,
      total_count: total,
    })),
    error: null,
  });

const listCalls = () =>
  mocks.rpc.mock.calls.filter(([name]) => name === "admin_list_users").map(([, args]) => args as ListArgs);
const csvRows = (text: string) => text.split("\r\n").slice(1, -1);

describe("GET /admin/users/export", () => {
  let errorSpy: MockInstance;
  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-23T18:00:00Z")); // 24/10/2026 01:00 in Vietnam
    mocks.rpc.mockReset();
    mocks.createClient.mockReset().mockResolvedValue({ rpc: mocks.rpc });
    rpcAnswers({ data: true, error: null });
  });
  afterEach(() => {
    vi.useRealTimers();
    errorSpy.mockRestore();
  });

  it("answers an admin with the CSV of the filtered list as a no-store attachment", async () => {
    rpcAnswers({ data: true, error: null }, { data: [{ ...rpcRow, total_count: 1 }], error: null });
    const response = await GET(new Request(`${URL_BASE}?role=admin&q=anh&sort=sent&dir=asc&page=3`));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="users-20261024.csv"');
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    const text = await response.text();
    expect(text.split("\r\n")[0]).toBe("ID,Name,Email,Sent Kudos,Received Kudos,Total Heart,Level,Badges,Time to get 6 Badges,Last Logged in,Role");
    expect(text).toContain("1,Nguyễn Thị Phương Anh,anh@sun-asterisk.com,3,0,10,4,6,20/09/2026 15:15,,Admin");
    expect(mocks.rpc).toHaveBeenCalledWith("admin_list_users", {
      p_department: null,
      p_level: null,
      p_role: "admin",
      p_search: "anh",
      p_sort: "sent",
      p_dir: "asc",
      p_limit: 1000,
      p_offset: 0,
    });
  });

  it("keeps the BOM as the first bytes of the body", async () => {
    rpcAnswers({ data: true, error: null }, windowsOf(1));
    const bytes = new Uint8Array(await (await GET(new Request(URL_BASE))).arrayBuffer());
    expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  });

  it.each([
    ["a non-admin", { data: false, error: null }],
    ["an is_admin failure", { data: null, error: { message: "down" } }],
  ])("answers 403 with a generic body and no list read for %s", async (_name, admin) => {
    rpcAnswers(admin);
    const response = await GET(new Request(URL_BASE));
    expect(response.status).toBe(403);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.text()).not.toMatch(/@|csv/i);
    expect(mocks.rpc).not.toHaveBeenCalledWith("admin_list_users", expect.anything());
  });

  it("reads past the 1000-row PostgREST cap in chunks of 1000 and joins them in row order", async () => {
    rpcAnswers({ data: true, error: null }, windowsOf(2300));
    const response = await GET(new Request(`${URL_BASE}?sort=hearts`));
    expect(response.status).toBe(200);
    expect(listCalls().map(({ p_limit, p_offset }) => [p_limit, p_offset])).toEqual([
      [1000, 0],
      [1000, 1000],
      [1000, 2000],
    ]);
    const ids = csvRows(await response.text()).map((line) => Number(line.split(",")[0]));
    expect(ids).toEqual(Array.from({ length: 2300 }, (_, i) => i + 1));
  });

  it("exports exactly the cap in five chunks", async () => {
    rpcAnswers({ data: true, error: null }, windowsOf(5000));
    const response = await GET(new Request(URL_BASE));
    expect(response.status).toBe(200);
    expect(csvRows(await response.text())).toHaveLength(5000);
    expect(listCalls().map((args) => args.p_offset)).toEqual([0, 1000, 2000, 3000, 4000]);
  });

  it("answers 413 above the export cap after the first chunk only, instead of truncating", async () => {
    rpcAnswers({ data: true, error: null }, windowsOf(5001));
    const response = await GET(new Request(URL_BASE));
    expect(response.status).toBe(413);
    expect(await response.text()).not.toContain("@");
    expect(listCalls()).toHaveLength(1);
  });

  it("answers an empty filtered result with the header only", async () => {
    rpcAnswers({ data: true, error: null }, { data: [], error: null });
    const response = await GET(new Request(URL_BASE));
    expect(response.status).toBe(200);
    expect((await response.text()).split("\r\n").filter(Boolean)).toHaveLength(1);
  });

  it.each([
    ["the server caps a chunk below 1000 rows (2300 rows, 500 a chunk)", windowsOf(2300, 500)],
    ["the server caps the only chunk (800 rows, 500 a chunk)", windowsOf(800, 500)],
    ["a later chunk comes back empty", (a: ListArgs) => (a.p_offset === 0 ? windowsOf(2300)(a) : { data: [], error: null })],
    ["the total changes between chunks", (a: ListArgs) => windowsOf(a.p_offset === 0 ? 2300 : 2299)(a)],
    ["a later chunk fails", (a: ListArgs) => (a.p_offset === 0 ? windowsOf(2300)(a) : { data: null, error: { code: "57014" } })],
    // A write between chunks reorders rows with the same total: row 1000 slides into chunk 2, row 1001 is never read.
    ["the rows reorder between chunks (one user twice, one never)", (a: ListArgs) => {
      const chunk = windowsOf(2300)(a);
      if (a.p_offset !== 1000) return chunk;
      const [first, ...rest] = chunk.data as (typeof rpcRow)[];
      return { ...chunk, data: [{ ...first, user_id: userId(1000) }, ...rest] };
    }],
  ])("answers 500 and never a partial CSV when %s", async (_name, list) => {
    rpcAnswers({ data: true, error: null }, list);
    const response = await GET(new Request(URL_BASE));
    expect(response.status).toBe(500);
    expect(await response.text()).toBe("Export failed");
    expect(errorSpy).toHaveBeenCalled();
    expect(JSON.stringify(errorSpy.mock.calls)).not.toMatch(/@|Nguyễn/);
  });

  it.each([
    ["a list RPC error", { data: null, error: { code: "XX000", message: "boom-secret-detail" } }],
    ["a malformed list", { data: [{ ...rpcRow, role: "root" }], error: null }],
  ])("answers 500 with a generic body on %s", async (_name, list) => {
    rpcAnswers({ data: true, error: null }, list);
    const response = await GET(new Request(URL_BASE));
    expect(response.status).toBe(500);
    expect(await response.text()).not.toMatch(/secret|root|@/);
    expect(errorSpy).toHaveBeenCalled();
  });

  it("answers 500 when the client cannot be created", async () => {
    mocks.createClient.mockRejectedValueOnce(new Error("missing env boom-secret-detail"));
    const response = await GET(new Request(URL_BASE));
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("secret");
  });
});
