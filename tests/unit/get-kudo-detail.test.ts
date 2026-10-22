import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { getKudoDetail } from "@/lib/kudos/get-kudo-detail";
import type { ServerClient } from "@/lib/kudos/get-kudos-board-data";
import { DETAIL_KUDO, EMPTY_USER_ID, KUDOS, kudosRpc } from "@/tests/e2e/support/kudos-fixtures.mjs";

// The page calls getKudoDetail(id) with no client: the default one must be created inside the guarded path (L1).
const createServerClient = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: createServerClient }));

const SUB = "6f1c1c3e-3b0f-4a53-9a55-2f3d2a1f9b11";
// Seed ids are any 8-4-4-4-12 hex (not RFC 4122 v4): z.guid() must accept them.
const SEED_ID = "c1000000-0000-0000-0000-0000000000d1";

/** Fake `rpc()` served by the fixtures the fake Supabase uses; `override` replaces the answer or throws. */
function fakeClient(sub: string | undefined, override?: { data: unknown; error?: unknown } | "throw") {
  const rpc = vi.fn((name: string, args: Record<string, unknown> = {}) => {
    if (override === "throw") throw new Error("boom");
    return Promise.resolve(override ? { error: null, ...override } : { data: kudosRpc(name, args, sub), error: null });
  });
  // Cast (tests only): only rpc() is implemented, not the whole client.
  return { client: { rpc } as unknown as ServerClient, rpc };
}

describe("getKudoDetail", () => {
  let errorSpy: MockInstance;
  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => errorSpy.mockRestore());

  it("returns the Kudo for an allowed caller", async () => {
    const { client, rpc } = fakeClient(SUB);
    const result = await getKudoDetail(SEED_ID, client);
    expect(rpc).toHaveBeenCalledExactlyOnceWith("kudo_detail", { p_id: SEED_ID });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.kudo.id).toBe(DETAIL_KUDO.id);
    expect(result.kudo.content).toBe(DETAIL_KUDO.content);
    expect(result.kudo.images).toHaveLength(DETAIL_KUDO.images.length);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("keeps the sender hidden for an anonymous Kudo", async () => {
    const anonymous = KUDOS.find((k) => k.is_anonymous);
    if (!anonymous) throw new Error("fixture has no anonymous Kudo");
    const result = await getKudoDetail(String(anonymous.id), fakeClient(SUB).client);
    expect(result.status === "ok" && result.kudo.sender).toBeNull();
  });

  it.each(["not-a-uuid", "", "c1000000-0000-0000-0000-0000000000d1x", "../c1000000-0000-0000-0000-0000000000d1"])(
    "is not_found for the malformed id %j without querying",
    async (id) => {
      const { client, rpc } = fakeClient(SUB);
      expect(await getKudoDetail(id, client)).toEqual({ status: "not_found" });
      expect(rpc).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["an unknown id", SUB, "c1000000-0000-0000-0000-00000000ffff"],
    ["a caller the RPC refuses", undefined, SEED_ID],
    ["an allowed caller with no data", EMPTY_USER_ID, SEED_ID],
  ])("is not_found (no log) for %s", async (_name, sub, id) => {
    expect(await getKudoDetail(id, fakeClient(sub).client)).toEqual({ status: "not_found" });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it.each([
    ["an RPC error", { data: null, error: { message: "db down" } }],
    ["malformed rows", { data: [{ id: SEED_ID, title: 1 }] }],
    ["more than one row", { data: [...kudosRpc("kudo_detail", { p_id: SEED_ID }, SUB), ...kudosRpc("kudo_detail", { p_id: SEED_ID }, SUB)] }],
    ["a thrown error", "throw" as const],
  ])("is error and logs server-side on %s", async (_name, override) => {
    expect(await getKudoDetail(SEED_ID, fakeClient(SUB, override).client)).toEqual({ status: "error" });
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(String(errorSpy.mock.calls[0][0])).toMatch(/^\[kudos\] kudo_detail /);
  });

  describe("with the default client (as the page calls it)", () => {
    // Block body: a function returned from beforeEach is run as a teardown, which would call the mock again.
    beforeEach(() => {
      createServerClient.mockReset();
    });

    it("is not_found for a malformed id without creating a client", async () => {
      expect(await getKudoDetail("not-a-uuid")).toEqual({ status: "not_found" });
      expect(createServerClient).not.toHaveBeenCalled();
    });

    it("is error and logs server-side when the client cannot be created (broken env)", async () => {
      createServerClient.mockImplementation(async () => {
        throw new Error("Missing Supabase env");
      });
      expect(await getKudoDetail(SEED_ID)).toEqual({ status: "error" });
      expect(createServerClient).toHaveBeenCalledOnce();
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(String(errorSpy.mock.calls[0][0])).toMatch(/^\[kudos\] kudo_detail /);
    });

    it("queries through the client it creates", async () => {
      const { client, rpc } = fakeClient(SUB);
      createServerClient.mockResolvedValue(client);
      expect((await getKudoDetail(SEED_ID)).status).toBe("ok");
      expect(rpc).toHaveBeenCalledExactlyOnceWith("kudo_detail", { p_id: SEED_ID });
    });
  });
});
