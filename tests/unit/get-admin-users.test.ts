import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { ADMIN_DEFAULT_FILTERS } from "@/lib/admin/admin-users-href";
import { fetchAdminUsers, getAdminUsers } from "@/lib/admin/get-admin-users";
import type { AdminUserFilters } from "@/lib/admin/admin-user-types";
import { rpcRow } from "./support/admin-user-rpc-row";

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), rpc: vi.fn(), getClaims: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.createClient }));

const VIEWER = "a9000000-0000-0000-0000-000000000009";
const client = () => ({ rpc: mocks.rpc, auth: { getClaims: mocks.getClaims } });
type Client = Parameters<typeof fetchAdminUsers>[2];

const FILTERS: AdminUserFilters = { unit: "CEVC2", level: 3, role: "user", q: "anh", sort: "sent", dir: "asc", page: 3 };

describe("getAdminUsers / fetchAdminUsers", () => {
  let errorSpy: MockInstance;
  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.rpc.mockReset().mockResolvedValue({ data: [rpcRow, { ...rpcRow, row_no: 2, user_id: VIEWER }], error: null });
    mocks.getClaims.mockReset().mockResolvedValue({ data: { claims: { sub: VIEWER } }, error: null });
    mocks.createClient.mockReset().mockResolvedValue(client());
  });
  afterEach(() => errorSpy.mockRestore());

  it("calls admin_list_users with every filter and the page window (20 a page)", async () => {
    await getAdminUsers(FILTERS);
    expect(mocks.rpc).toHaveBeenCalledWith("admin_list_users", {
      p_department: "CEVC2",
      p_level: 3,
      p_role: "user",
      p_search: "anh",
      p_sort: "sent",
      p_dir: "asc",
      p_limit: 20,
      p_offset: 40,
    });
  });

  it("sends nulls for unset filters", async () => {
    await getAdminUsers(ADMIN_DEFAULT_FILTERS);
    expect(mocks.rpc).toHaveBeenCalledWith("admin_list_users", {
      p_department: null,
      p_level: null,
      p_role: null,
      p_search: "",
      p_sort: null,
      p_dir: "desc",
      p_limit: 20,
      p_offset: 0,
    });
  });

  it("maps rows to camelCase, takes the totals from the window columns and adds the viewer id", async () => {
    const page = await getAdminUsers(FILTERS);
    expect(page).toEqual({
      status: "ok",
      total: 45,
      sumSent: 600,
      sumReceived: 590,
      viewerId: VIEWER,
      rows: [
        {
          userId: rpcRow.user_id,
          rowNo: 1,
          fullName: "Nguyễn Thị Phương Anh",
          email: "anh@sun-asterisk.com",
          department: null,
          sent: 3,
          received: 0,
          hearts: 10,
          level: 4,
          badges: 6,
          timeToSixBadges: "2026-09-20T08:15:00+00:00",
          lastSignInAt: null,
          role: "admin",
        },
        expect.objectContaining({ userId: VIEWER, rowNo: 2 }),
      ],
    });
  });

  it("answers an empty page (no rows: filters match nobody, or a page past the end) with zero totals", async () => {
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    expect(await getAdminUsers(FILTERS)).toEqual({
      status: "ok",
      rows: [],
      total: 0,
      sumSent: 0,
      sumReceived: 0,
      viewerId: VIEWER,
    });
  });

  it.each([
    ["an RPC error", { data: null, error: { code: "XX000", message: "boom-secret-detail" } }],
    ["a network error", { data: null, error: { message: "fetch failed" } }],
    ["a malformed row", { data: [{ ...rpcRow, level: 7 }], error: null }],
    ["a non-array answer", { data: { rows: [] }, error: null }],
    ["a null answer", { data: null, error: null }],
  ])("returns status error on %s and logs it", async (_name, answer) => {
    mocks.rpc.mockResolvedValue(answer);
    const page = await getAdminUsers(FILTERS);
    expect(page).toEqual({ status: "error" });
    expect(errorSpy).toHaveBeenCalled();
  });

  it("does not log row values (names, emails) when a row is malformed", async () => {
    mocks.rpc.mockResolvedValue({ data: [{ ...rpcRow, level: 7 }], error: null });
    await getAdminUsers(FILTERS);
    expect(JSON.stringify(errorSpy.mock.calls)).not.toMatch(/sun-asterisk|Phương/);
  });

  it.each([
    ["claims error", { data: null, error: { message: "jwt expired" } }],
    ["no claims", { data: null, error: null }],
  ])("returns status error without a verified viewer (%s)", async (_name, claims) => {
    mocks.getClaims.mockResolvedValue(claims);
    expect(await getAdminUsers(FILTERS)).toEqual({ status: "error" });
  });

  it("never throws: client creation and RPC rejections become status error", async () => {
    mocks.createClient.mockRejectedValueOnce(new Error("missing env"));
    expect(await getAdminUsers(FILTERS)).toEqual({ status: "error" });
    mocks.rpc.mockRejectedValueOnce(new Error("socket hang up"));
    expect(await getAdminUsers(FILTERS)).toEqual({ status: "error" });
  });

  it("fetchAdminUsers uses the given client and window, ignores the page, and returns null on failure", async () => {
    const own = client() as unknown as Client;
    const result = await fetchAdminUsers(FILTERS, { limit: 5000, offset: 0 }, own);
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalledWith("admin_list_users", expect.objectContaining({ p_limit: 5000, p_offset: 0 }));
    expect(result).toMatchObject({ total: 45, sumSent: 600, sumReceived: 590 });
    expect(result?.rows).toHaveLength(2);

    mocks.rpc.mockResolvedValue({ data: null, error: { code: "42501", message: "denied" } });
    expect(await fetchAdminUsers(FILTERS, { limit: 5000, offset: 0 }, own)).toBeNull();
  });
});
