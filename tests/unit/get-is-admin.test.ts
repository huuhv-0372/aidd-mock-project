import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { getAdminDepartmentCodes } from "@/lib/admin/get-admin-department-codes";
import { getIsAdmin } from "@/lib/admin/get-is-admin";
import { requireAdmin } from "@/lib/admin/require-admin";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  rpc: vi.fn(),
  order: vi.fn(),
  select: vi.fn(),
  from: vi.fn(),
  forbidden: vi.fn(() => {
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;403");
  }),
}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.createClient }));
vi.mock("next/navigation", () => ({ forbidden: mocks.forbidden }));

describe("getIsAdmin / requireAdmin", () => {
  let errorSpy: MockInstance;
  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.rpc.mockReset().mockResolvedValue({ data: true, error: null });
    mocks.createClient.mockReset().mockResolvedValue({ rpc: mocks.rpc });
    mocks.forbidden.mockClear();
  });
  afterEach(() => errorSpy.mockRestore());

  it("asks the database (RPC is_admin) and returns its answer", async () => {
    expect(await getIsAdmin()).toBe(true);
    expect(mocks.rpc).toHaveBeenCalledWith("is_admin");
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    expect(await getIsAdmin()).toBe(false);
  });

  it("uses the client it is given", async () => {
    const own = { rpc: vi.fn().mockResolvedValue({ data: true, error: null }) };
    expect(await getIsAdmin(own as never)).toBe(true);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it.each([
    ["an RPC error", { data: null, error: { code: "42501", message: "denied" } }],
    ["a non-boolean answer", { data: "true", error: null }],
    ["a null answer", { data: null, error: null }],
  ])("answers false and logs on %s", async (_name, answer) => {
    mocks.rpc.mockResolvedValue(answer);
    expect(await getIsAdmin()).toBe(false);
    expect(errorSpy).toHaveBeenCalled();
  });

  it("never throws", async () => {
    mocks.createClient.mockRejectedValueOnce(new Error("missing env"));
    expect(await getIsAdmin()).toBe(false);
    mocks.rpc.mockRejectedValueOnce(new Error("socket hang up"));
    expect(await getIsAdmin()).toBe(false);
  });

  it("requireAdmin lets an admin through and calls forbidden() for anyone else", async () => {
    await expect(requireAdmin()).resolves.toBeUndefined();
    expect(mocks.forbidden).not.toHaveBeenCalled();

    mocks.rpc.mockResolvedValue({ data: false, error: null });
    await expect(requireAdmin()).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;403");
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "down" } });
    await expect(requireAdmin()).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;403");
    expect(mocks.forbidden).toHaveBeenCalledTimes(2);
  });
});

describe("getAdminDepartmentCodes", () => {
  let errorSpy: MockInstance;
  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.order.mockReset().mockResolvedValue({ data: [{ code: "CTO", sort_order: 1 }, { code: "SPD" }], error: null });
    mocks.select.mockReset().mockReturnValue({ order: mocks.order });
    mocks.from.mockReset().mockReturnValue({ select: mocks.select });
    mocks.createClient.mockReset().mockResolvedValue({ from: mocks.from });
  });
  afterEach(() => errorSpy.mockRestore());

  it("reads the department codes from the code column, in catalog order", async () => {
    expect(await getAdminDepartmentCodes()).toEqual(["CTO", "SPD"]);
    expect(mocks.from).toHaveBeenCalledWith("departments");
    expect(mocks.select).toHaveBeenCalledWith("code");
    expect(mocks.order).toHaveBeenCalledWith("sort_order");
  });

  it.each([
    ["a query error", { data: null, error: { message: "denied" } }],
    ["a malformed row", { data: [{ code: "" }], error: null }],
    ["a null answer", { data: null, error: null }],
  ])("returns null and logs on %s", async (_name, answer) => {
    mocks.order.mockResolvedValue(answer);
    expect(await getAdminDepartmentCodes()).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("returns null when the client cannot be created", async () => {
    mocks.createClient.mockRejectedValueOnce(new Error("missing env"));
    expect(await getAdminDepartmentCodes()).toBeNull();
  });
});
