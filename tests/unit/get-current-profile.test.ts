import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { getCurrentProfile } from "@/lib/profiles/get-current-profile";

/** The real server client type the helper accepts; fakes below are cast to it. */
type ServerClient = NonNullable<Parameters<typeof getCurrentProfile>[0]>;

const SUB = "6f1c1c3e-3b0f-4a53-9a55-2f3d2a1f9b11";
const row = {
  id: SUB,
  email: "a@sun-asterisk.com",
  full_name: "Anh A",
  avatar_url: null,
  department: null,
  created_at: "2026-10-12T00:00:00Z",
  updated_at: "2026-10-12T00:00:00Z",
};

type Opts = {
  claims?: { data: { claims: { sub: string } } | null; error: unknown };
  query?: { data: unknown; error: unknown };
};

/** Hand-rolled fake of the `getClaims` + `from().select().eq().maybeSingle()` chain. */
function fakeClient({ claims, query }: Opts) {
  const eq = vi.fn();
  const maybeSingle = vi.fn(async () => query ?? { data: null, error: null });
  eq.mockReturnValue({ maybeSingle });
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  const getClaims = vi.fn(async () => claims ?? { data: null, error: null });
  // Cast (tests only): the fake implements just the getClaims/from chain the helper calls, not the
  // full supabase-js surface, so it cannot structurally satisfy the real client type.
  const client = { auth: { getClaims }, from } as unknown as ServerClient;
  return { client, from, select, eq };
}

const signedIn = { data: { claims: { sub: SUB } }, error: null };

describe("getCurrentProfile", () => {
  let errorSpy: MockInstance;
  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => errorSpy.mockRestore());

  it("returns null without querying when there are no claims", async () => {
    const { client, from } = fakeClient({});
    expect(await getCurrentProfile(client)).toBeNull();
    expect(from).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("returns null and logs when getClaims reports an error", async () => {
    const { client, from } = fakeClient({ claims: { data: null, error: new Error("boom") } });
    expect(await getCurrentProfile(client)).toBeNull();
    expect(from).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it("returns the parsed profile when the row exists", async () => {
    const { client } = fakeClient({ claims: signedIn, query: { data: row, error: null } });
    expect(await getCurrentProfile(client)).toEqual(row);
  });

  it("filters the query by the verified claim sub", async () => {
    const { client, from, eq } = fakeClient({ claims: signedIn, query: { data: row, error: null } });
    await getCurrentProfile(client);
    expect(from).toHaveBeenCalledWith("profiles");
    expect(eq).toHaveBeenCalledWith("id", SUB);
  });

  it("returns null without logging when the row is missing", async () => {
    const { client } = fakeClient({ claims: signedIn, query: { data: null, error: null } });
    expect(await getCurrentProfile(client)).toBeNull();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("returns null and logs on a query error", async () => {
    const { client } = fakeClient({ claims: signedIn, query: { data: null, error: new Error("rls") } });
    expect(await getCurrentProfile(client)).toBeNull();
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it("returns null and logs when the row is malformed", async () => {
    const { client } = fakeClient({
      claims: signedIn,
      query: { data: { ...row, id: "not-a-uuid" }, error: null },
    });
    expect(await getCurrentProfile(client)).toBeNull();
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it("returns null and logs when getClaims throws", async () => {
    const client = {
      auth: { getClaims: vi.fn().mockRejectedValue(new Error("network")) },
      from: vi.fn(),
    } as unknown as ServerClient;
    expect(await getCurrentProfile(client)).toBeNull();
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });
});
