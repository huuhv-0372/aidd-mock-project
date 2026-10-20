import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { setKudoHeart } from "@/lib/kudos/set-kudo-heart-action";

// Fixture-style id (not RFC 4122 v4): Postgres accepts any 8-4-4-4-12 hex, and so must the action.
const KUDO_ID = "c1000000-0000-0000-0000-000000000003";

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.createClient }));

const refusal = (message: string) => ({ data: null, error: { code: "22023", message, details: null, hint: null } });

describe("setKudoHeart", () => {
  let errorSpy: MockInstance;
  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.rpc.mockReset();
    mocks.rpc.mockResolvedValue({ data: [{ liked: true, heart_count: 7 }], error: null });
    mocks.createClient.mockReset();
    mocks.createClient.mockResolvedValue({ rpc: mocks.rpc });
  });
  afterEach(() => errorSpy.mockRestore());

  it.each([true, false])("sends liked=%s and returns the state and count the database answered", async (liked) => {
    mocks.rpc.mockResolvedValue({ data: [{ liked, heart_count: 7 }], error: null });
    expect(await setKudoHeart({ kudoId: KUDO_ID, liked })).toEqual({ ok: true, liked, heartCount: 7 });
    expect(mocks.rpc).toHaveBeenCalledWith("set_kudo_heart", { p_kudo_id: KUDO_ID, p_liked: liked });
  });

  it("trusts the database over the request (idempotent like answers liked=false if the row is gone)", async () => {
    mocks.rpc.mockResolvedValue({ data: [{ liked: false, heart_count: 0 }], error: null });
    expect(await setKudoHeart({ kudoId: KUDO_ID, liked: true })).toEqual({ ok: true, liked: false, heartCount: 0 });
  });

  it.each([
    ["missing liked", { kudoId: KUDO_ID }],
    ["missing kudoId", { liked: true }],
    ["non-guid id", { kudoId: "kudo-1", liked: true }],
    ["string liked", { kudoId: KUDO_ID, liked: "true" }],
    ["extra field (client-sent count)", { kudoId: KUDO_ID, liked: true, heartCount: 99 }],
    ["extra field (client-sent award)", { kudoId: KUDO_ID, liked: true, hearts_awarded: 2 }],
    ["null", null],
    ["non-object", "like"],
  ])("rejects %s without touching the database", async (_name, input) => {
    expect(await setKudoHeart(input)).toEqual({ ok: false, error: "generic" });
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("maps own_kudo to 'own'", async () => {
    mocks.rpc.mockResolvedValue(refusal("own_kudo"));
    expect(await setKudoHeart({ kudoId: KUDO_ID, liked: true })).toEqual({ ok: false, error: "own" });
    expect(errorSpy).toHaveBeenCalled();
  });

  it.each([
    ["forbidden", refusal("forbidden")],
    ["not_found", refusal("not_found")],
    ["own_kudo under another SQLSTATE", { data: null, error: { code: "XX000", message: "own_kudo" } }],
    ["server error with internals", { data: null, error: { code: "XX000", message: "boom-secret-detail" } }],
    ["network failure (no code)", { data: null, error: { message: "fetch failed boom-secret-detail" } }],
    ["empty result", { data: [], error: null }],
    ["null result", { data: null, error: null }],
    ["malformed row", { data: [{ liked: "yes", heart_count: -1 }], error: null }],
  ])("returns only a generic error on %s and logs the cause", async (_name, answer) => {
    mocks.rpc.mockResolvedValue(answer);
    const result = await setKudoHeart({ kudoId: KUDO_ID, liked: true });
    expect(result).toEqual({ ok: false, error: "generic" });
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(errorSpy).toHaveBeenCalled();
  });

  it("returns a generic error when the client cannot be created or the call throws", async () => {
    mocks.createClient.mockRejectedValueOnce(new Error("missing env"));
    expect(await setKudoHeart({ kudoId: KUDO_ID, liked: true })).toEqual({ ok: false, error: "generic" });
    mocks.rpc.mockRejectedValueOnce(new Error("socket hang up"));
    expect(await setKudoHeart({ kudoId: KUDO_ID, liked: true })).toEqual({ ok: false, error: "generic" });
    expect(errorSpy).toHaveBeenCalledTimes(2);
  });
});
