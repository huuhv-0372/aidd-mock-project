import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { createKudo } from "@/lib/kudos/create-kudo-action";
import { APP0, EOI, jpeg, SCAN, SOS } from "./support/jpeg-fixtures";

// When may `createKudo` delete the images it uploaded? Only when the database definitively refused the Kudo:
// a Kudo that may exist must never lose its images. Happy paths and validation live in create-kudo-action.test.ts.

const UID = "6f1c1c3e-3b0f-4a53-9a55-2f3d2a1f9b11";
const RECIPIENT = "2a000000-0000-0000-0000-000000000101";
const PUBLIC_BASE = "https://x.supabase.co/storage/v1/object/public/kudo-images/";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getClaims: vi.fn(),
  rpc: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  getPublicUrl: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.createClient }));

function formWithImages(count: number): FormData {
  const data = new FormData();
  data.append("recipientId", RECIPIENT);
  data.append("title", "Hero");
  data.append("content", "Cảm ơn bạn");
  data.append("isAnonymous", "false");
  data.append("hashtags", "dedicated");
  const bytes = jpeg(APP0, SOS, SCAN, EOI);
  for (let i = 0; i < count; i++) data.append("images", new File([bytes as BlobPart], `${i}.jpg`, { type: "image/jpeg" }));
  return data;
}

const uploadedPaths = () => mocks.upload.mock.calls.map((call) => call[0] as string);

describe("createKudo image rollback", () => {
  let errorSpy: MockInstance;
  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    for (const mock of Object.values(mocks)) mock.mockReset();
    mocks.getClaims.mockResolvedValue({ data: { claims: { sub: UID } }, error: null });
    mocks.upload.mockResolvedValue({ data: {}, error: null });
    mocks.remove.mockResolvedValue({ data: [], error: null });
    mocks.getPublicUrl.mockImplementation((path: string) => ({ data: { publicUrl: PUBLIC_BASE + path } }));
    mocks.createClient.mockResolvedValue({
      auth: { getClaims: mocks.getClaims },
      rpc: mocks.rpc,
      storage: { from: () => ({ upload: mocks.upload, remove: mocks.remove, getPublicUrl: mocks.getPublicUrl }) },
    });
  });
  afterEach(() => errorSpy.mockRestore());

  it("keeps the images when the RPC request throws after it was sent (the Kudo may have been committed)", async () => {
    mocks.rpc.mockRejectedValue(new TypeError("fetch failed"));
    expect(await createKudo(formWithImages(2))).toEqual({ ok: false, error: "server" });
    expect(mocks.upload).toHaveBeenCalledTimes(2);
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("keeps the images when the RPC error carries no code (network / timeout, outcome unknown)", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "", message: "TypeError: fetch failed" } });
    expect(await createKudo(formWithImages(1))).toEqual({ ok: false, error: "server" });
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "upstream timeout" } });
    expect(await createKudo(formWithImages(1))).toEqual({ ok: false, error: "server" });
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("removes the uploaded images when building their URLs fails before the RPC is sent", async () => {
    mocks.getPublicUrl.mockImplementation(() => {
      throw new Error("bad storage url");
    });
    expect(await createKudo(formWithImages(2))).toEqual({ ok: false, error: "server" });
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.remove).toHaveBeenCalledTimes(1);
    expect(mocks.remove).toHaveBeenCalledWith(uploadedPaths());
  });

  it("removes the images and maps the field when SQL refuses with 22023", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "22023", message: "invalid_title" } });
    expect(await createKudo(formWithImages(1))).toEqual({ ok: false, error: "validation", fields: { title: "invalid" } });
    expect(mocks.remove).toHaveBeenCalledWith(uploadedPaths());
  });

  it("maps a field only for errcode 22023: the same message under another code is a server error", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "XX000", message: "invalid_title" } });
    expect(await createKudo(formWithImages(1))).toEqual({ ok: false, error: "server" });
    expect(mocks.remove).toHaveBeenCalledTimes(1); // a coded answer is still a definitive refusal
  });

  it.each(["constructor", "toString", "__proto__", "hasOwnProperty"])(
    "treats a 22023 message %j (an Object.prototype key) as a server error",
    async (message) => {
      mocks.rpc.mockResolvedValue({ data: null, error: { code: "22023", message } });
      expect(await createKudo(formWithImages(0))).toEqual({ ok: false, error: "server" });
    },
  );

  it.each([
    ["claims without a subject", { data: { claims: {} }, error: null }],
    ["claims next to an error", { data: { claims: { sub: UID } }, error: { message: "x" } }],
  ])("%s: server error, nothing uploaded, no RPC", async (_name, claims) => {
    mocks.getClaims.mockResolvedValue(claims);
    expect(await createKudo(formWithImages(1))).toEqual({ ok: false, error: "server" });
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
