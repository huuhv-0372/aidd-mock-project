import { AuthSessionMissingError } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { getIsAuthenticated } from "@/lib/auth/get-is-authenticated";

const createSupabaseServerClient = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient }));

/** The real server client type the helper accepts; fakes below are cast to it. */
type ServerClient = NonNullable<Parameters<typeof getIsAuthenticated>[0]>;

/** Fake exposing only `auth.getClaims`, the single call the helper makes. */
function fakeClient(getClaims: () => Promise<unknown>) {
  // Cast (tests only): the fake implements just getClaims, not the full supabase-js surface.
  return { auth: { getClaims: vi.fn(getClaims) } } as unknown as ServerClient;
}

describe("getIsAuthenticated", () => {
  let errorSpy: MockInstance;
  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    createSupabaseServerClient.mockReset();
  });
  afterEach(() => errorSpy.mockRestore());

  it("returns false without logging when there is no session", async () => {
    const client = fakeClient(async () => ({ data: null, error: null }));
    expect(await getIsAuthenticated(client)).toBe(false);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("returns true for verified claims with a subject", async () => {
    const client = fakeClient(async () => ({ data: { claims: { sub: "user-1" } }, error: null }));
    expect(await getIsAuthenticated(client)).toBe(true);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("returns false for claims without a subject", async () => {
    const client = fakeClient(async () => ({ data: { claims: { sub: "" } }, error: null }));
    expect(await getIsAuthenticated(client)).toBe(false);
  });

  it("returns false without logging when getClaims reports a missing session", async () => {
    const client = fakeClient(async () => ({ data: null, error: new AuthSessionMissingError() }));
    expect(await getIsAuthenticated(client)).toBe(false);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("returns false and logs when getClaims reports an error", async () => {
    const client = fakeClient(async () => ({ data: null, error: new Error("invalid jwt") }));
    expect(await getIsAuthenticated(client)).toBe(false);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it("returns false and logs when getClaims throws", async () => {
    const client = fakeClient(async () => {
      throw new Error("network down");
    });
    expect(await getIsAuthenticated(client)).toBe(false);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it("uses the default server client when none is injected", async () => {
    createSupabaseServerClient.mockResolvedValue(
      fakeClient(async () => ({ data: { claims: { sub: "user-1" } }, error: null })),
    );
    expect(await getIsAuthenticated()).toBe(true);
    expect(createSupabaseServerClient).toHaveBeenCalledTimes(1);
  });

  it("returns false and logs when the server client cannot be created (missing env)", async () => {
    createSupabaseServerClient.mockRejectedValue(new Error("Supabase env missing"));
    expect(await getIsAuthenticated()).toBe(false);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });
});
