import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { setUserRole } from "@/lib/admin/set-user-role-action";

// Fixture-style id (not RFC 4122 v4): Postgres accepts any 8-4-4-4-12 hex, and so must the action.
const USER_ID = "a1000000-0000-0000-0000-000000000002";

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.createClient }));

describe("setUserRole", () => {
  let errorSpy: MockInstance;
  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.rpc.mockReset().mockResolvedValue({ data: "ok", error: null });
    mocks.createClient.mockReset().mockResolvedValue({ rpc: mocks.rpc });
  });
  afterEach(() => errorSpy.mockRestore());

  it.each(["admin", "user"] as const)("calls admin_set_user_role and answers ok for role %s", async (role) => {
    expect(await setUserRole({ userId: USER_ID, role })).toEqual({ ok: true });
    expect(mocks.rpc).toHaveBeenCalledWith("admin_set_user_role", { p_user_id: USER_ID, p_role: role });
  });

  it.each([
    ["forbidden", "forbidden"],
    ["self", "self"],
    ["not_found", "not_found"],
    ["invalid", "validation"],
  ])("maps the database answer %s to error %s", async (answer, error) => {
    mocks.rpc.mockResolvedValue({ data: answer, error: null });
    expect(await setUserRole({ userId: USER_ID, role: "admin" })).toEqual({ ok: false, error });
  });

  it.each([
    ["unknown role", { userId: USER_ID, role: "root" }],
    ["non-guid id", { userId: "user-1", role: "admin" }],
    ["extra field", { userId: USER_ID, role: "admin", force: true }],
    ["missing role", { userId: USER_ID }],
    ["null", null],
  ])("rejects %s as validation without touching the database", async (_name, input) => {
    expect(await setUserRole(input as never)).toEqual({ ok: false, error: "validation" });
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["an RPC error with internals", { data: null, error: { code: "XX000", message: "boom-secret-detail" } }],
    ["a network failure", { data: null, error: { message: "fetch failed boom-secret-detail" } }],
    ["an unknown answer", { data: "boom-secret-detail", error: null }],
    ["a null answer", { data: null, error: null }],
  ])("returns only server on %s and logs the cause", async (_name, answer) => {
    mocks.rpc.mockResolvedValue(answer);
    const result = await setUserRole({ userId: USER_ID, role: "user" });
    expect(result).toEqual({ ok: false, error: "server" });
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(errorSpy).toHaveBeenCalled();
  });

  it("returns server when the client cannot be created or the call throws", async () => {
    mocks.createClient.mockRejectedValueOnce(new Error("missing env boom-secret-detail"));
    expect(await setUserRole({ userId: USER_ID, role: "user" })).toEqual({ ok: false, error: "server" });
    mocks.rpc.mockRejectedValueOnce(new Error("socket hang up"));
    expect(await setUserRole({ userId: USER_ID, role: "user" })).toEqual({ ok: false, error: "server" });
    expect(errorSpy).toHaveBeenCalledTimes(2);
  });
});
