import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { updateKudo } from "@/lib/kudos/update-kudo-action";
import { APP0, EOI, jpeg, SCAN, SOS } from "./support/jpeg-fixtures";
import { IDAT, IEND, IHDR, png } from "./support/png-webp-fixtures";

const UID = "6f1c1c3e-3b0f-4a53-9a55-2f3d2a1f9b11";
const KUDO_ID = "c3000000-0000-0000-0000-000000000001";
const ORIGIN = "https://x.supabase.co";
const PUBLIC_BASE = `${ORIGIN}/storage/v1/object/public/kudo-images/`;
const name = (n: number, ext = "jpg") => `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000.${ext}`;
const url = (n: number, ext = "jpg") => PUBLIC_BASE + name(n, ext);
const JPG = jpeg(APP0, SOS, SCAN, EOI);
const PNG = png(IHDR, IDAT, IEND);
const image = (bytes: Uint8Array | string, type = "image/jpeg") => new File([bytes as BlobPart], "photo", { type });

const person = (id: string) => ({ id, full_name: "A", avatar_url: null, department: null, kudos_received: 1, distinct_senders: 1 });
const ROW = {
  id: KUDO_ID,
  created_at: "2026-10-20T08:00:00+00:00",
  title: "NEW TITLE",
  content: "Cảm ơn **bạn**",
  is_anonymous: false,
  anonymous_name: null,
  heart_count: 7,
  liked_by_me: false,
  is_mine: true,
  sender: person(UID),
  recipient: person("2a000000-0000-0000-0000-000000000101"),
  hashtags: [{ slug: "dedicated", name_vi: "Tận tâm", name_en: "Dedicated" }],
  images: [url(1)],
};

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), getClaims: vi.fn(), rpc: vi.fn(), upload: vi.fn(), remove: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.createClient }));

type RpcAnswer = { data: unknown; error: unknown };
let updateAnswer: RpcAnswer;
let detailAnswer: RpcAnswer;

function form(patch: { keepImages?: string[]; images?: File[]; hashtags?: string[]; [key: string]: unknown } = {}): FormData {
  const { keepImages = [], images = [], hashtags = ["dedicated"], ...fields } = patch;
  const data = new FormData();
  const base: Record<string, unknown> = { kudoId: KUDO_ID, title: " NEW TITLE ", content: "Cảm ơn **bạn**", ...fields };
  for (const [key, value] of Object.entries(base)) if (value !== undefined) data.append(key, String(value));
  hashtags.forEach((slug) => data.append("hashtags", slug));
  keepImages.forEach((kept) => data.append("keepImages", kept));
  images.forEach((file) => data.append("images", file));
  return data;
}

const rpcCalls = (fn: string) => mocks.rpc.mock.calls.filter(([called]) => called === fn).map(([, params]) => params);
const uploadedNames = () => mocks.upload.mock.calls.map((call) => call[0] as string);

describe("updateKudo", () => {
  let errorSpy: MockInstance;
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", ORIGIN);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    for (const mock of Object.values(mocks)) mock.mockReset();
    updateAnswer = { data: [], error: null };
    detailAnswer = { data: [ROW], error: null };
    mocks.getClaims.mockResolvedValue({ data: { claims: { sub: UID } }, error: null });
    mocks.rpc.mockImplementation(async (fn: string) => (fn === "update_kudo" ? updateAnswer : fn === "kudo_detail" ? detailAnswer : { data: null, error: { code: "PGRST202" } }));
    mocks.upload.mockResolvedValue({ data: {}, error: null });
    mocks.remove.mockResolvedValue({ data: [], error: null });
    mocks.createClient.mockResolvedValue({
      auth: { getClaims: mocks.getClaims },
      rpc: mocks.rpc,
      storage: {
        from: (bucket: string) => {
          expect(bucket).toBe("kudo-images");
          return { upload: mocks.upload, remove: mocks.remove, getPublicUrl: (path: string) => ({ data: { publicUrl: PUBLIC_BASE + path } }) };
        },
      },
    });
  });
  afterEach(() => {
    errorSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it("refuses a caller without a verified session before reading the form", async () => {
    mocks.getClaims.mockResolvedValue({ data: null, error: { message: "no session" } });
    expect(await updateKudo(form({ images: [image(JPG)] }))).toEqual({ ok: false, error: "server" });
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("answers server when the client cannot even be created", async () => {
    mocks.createClient.mockRejectedValue(new Error("env missing"));
    expect(await updateKudo(form())).toEqual({ ok: false, error: "server" });
  });

  it("refuses invalid input field by field, with nothing uploaded and no RPC", async () => {
    expect(await updateKudo(form({ title: "  ", hashtags: [] }))).toEqual({ ok: false, error: "validation", fields: { title: "invalid", hashtags: "invalid" } });
    expect(await updateKudo(form({ kudoId: "nope" }))).toEqual({ ok: false, error: "validation", fields: {} });
    expect(await updateKudo(form({ keepImages: ["javascript:alert(1)"] }))).toEqual({ ok: false, error: "validation", fields: { images: "invalid" } });
    // A kept image must be on the project's Supabase origin, not just shaped like a Storage URL.
    expect(await updateKudo(form({ keepImages: [url(1), url(2).replace(ORIGIN, "https://evil.example")] }))).toEqual({ ok: false, error: "validation", fields: { images: "invalid" } });
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("refuses more than five images in total (kept + new)", async () => {
    const result = await updateKudo(form({ keepImages: [url(1), url(2), url(3), url(4)], images: [image(JPG), image(PNG, "image/png")] }));
    expect(result).toEqual({ ok: false, error: "validation", fields: { images: "invalid" } });
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("refuses a new file whose bytes are not an allowed image", async () => {
    expect(await updateKudo(form({ images: [image("GIF89a-not-a-jpeg")] }))).toEqual({ ok: false, error: "validation", fields: { images: "format" } });
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("answers server when an upload fails, removes the uploads that landed and never calls the RPC", async () => {
    mocks.upload.mockResolvedValueOnce({ data: {}, error: null }).mockResolvedValueOnce({ data: null, error: { message: "quota" } });
    expect(await updateKudo(form({ images: [image(JPG), image(PNG, "image/png")] }))).toEqual({ ok: false, error: "server" });
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.remove).toHaveBeenCalledExactlyOnceWith([uploadedNames()[0]]);
  });

  it("sends exactly the edit to update_kudo (no recipient, no anonymity) and returns the read-back row", async () => {
    const result = await updateKudo(form({ keepImages: [url(2), url(1)], recipientId: "x", isAnonymous: "true", senderId: "y" }));
    expect(result).toEqual({ ok: true, kudo: ROW });
    expect(rpcCalls("update_kudo")).toEqual([
      { p_id: KUDO_ID, p_title: "NEW TITLE", p_content: "Cảm ơn **bạn**", p_hashtag_slugs: ["dedicated"], p_image_urls: [url(2), url(1)], p_anonymous_name: null },
    ]);
    expect(rpcCalls("kudo_detail")).toEqual([{ p_id: KUDO_ID }]);
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("passes the trimmed alias, or null when blank", async () => {
    await updateKudo(form({ anonymousName: " Ninja " }));
    await updateKudo(form({ anonymousName: "   " }));
    expect(rpcCalls("update_kudo").map((params) => params.p_anonymous_name)).toEqual(["Ninja", null]);
  });

  it("sends the kept URLs in order then the new uploads in order, and deletes the removed images after the update", async () => {
    updateAnswer = { data: [url(3), url(4, "png")], error: null };
    const result = await updateKudo(form({ keepImages: [url(2), url(1)], images: [image(JPG), image(PNG, "image/png")] }));
    expect(result).toEqual({ ok: true, kudo: ROW });
    const [first, second] = uploadedNames();
    expect(first).toMatch(/^[0-9a-f-]{36}\.jpg$/);
    expect(second).toMatch(/^[0-9a-f-]{36}\.png$/);
    expect(rpcCalls("update_kudo")[0].p_image_urls).toEqual([url(2), url(1), PUBLIC_BASE + first, PUBLIC_BASE + second]);
    expect(mocks.remove).toHaveBeenCalledExactlyOnceWith([name(3), name(4, "png")]);
    const [updateOrder, removeOrder] = [mocks.rpc.mock.invocationCallOrder[0], mocks.remove.mock.invocationCallOrder[0]];
    expect(updateOrder).toBeLessThan(removeOrder);
  });

  it("never deletes an image the Kudo still holds, nor anything that is not a flat kudo-images object of this project", async () => {
    const foreign = url(7).replace(ORIGIN, "https://evil.example");
    updateAnswer = { data: [url(1), "/images/kudos/seed.jpg", `${PUBLIC_BASE}folder/${name(5)}`, url(6), foreign], error: null };
    expect(await updateKudo(form({ keepImages: [url(1)] }))).toEqual({ ok: true, kudo: ROW });
    expect(mocks.remove).toHaveBeenCalledExactlyOnceWith([name(6)]);
  });

  it("still succeeds when deleting the removed images fails or throws (logged only)", async () => {
    updateAnswer = { data: [url(3)], error: null };
    mocks.remove.mockResolvedValueOnce({ data: null, error: { message: "denied" } });
    expect(await updateKudo(form())).toEqual({ ok: true, kudo: ROW });
    mocks.remove.mockRejectedValueOnce(new Error("network"));
    expect(await updateKudo(form())).toEqual({ ok: true, kudo: ROW });
    expect(errorSpy).toHaveBeenCalled();
  });

  it("maps not_found and deletes the new uploads", async () => {
    updateAnswer = { data: null, error: { code: "22023", message: "not_found" } };
    expect(await updateKudo(form({ images: [image(JPG)] }))).toEqual({ ok: false, error: "not_found" });
    expect(mocks.remove).toHaveBeenCalledExactlyOnceWith(uploadedNames());
    expect(rpcCalls("kudo_detail")).toEqual([]);
  });

  it.each([
    ["invalid_title", "title"],
    ["invalid_content", "content"],
    ["invalid_hashtags", "hashtags"],
    ["invalid_images", "images"],
    ["invalid_alias", "anonymousName"],
  ])("maps the field code %s and deletes the new uploads", async (code, field) => {
    updateAnswer = { data: null, error: { code: "22023", message: code } };
    expect(await updateKudo(form({ images: [image(JPG)] }))).toEqual({ ok: false, error: "validation", fields: { [field]: "invalid" } });
    expect(mocks.remove).toHaveBeenCalledExactlyOnceWith(uploadedNames());
  });

  it("answers a generic server error for any other coded failure, deletes the new uploads, leaks nothing", async () => {
    for (const error of [
      { code: "XX000", message: "fake: injected update failure boom-secret-detail" },
      { code: "22023", message: "forbidden" },
      { code: "42501", message: "permission denied for function update_kudo" },
    ]) {
      mocks.remove.mockClear();
      updateAnswer = { data: null, error };
      const result = await updateKudo(form({ images: [image(JPG)] }));
      expect(result).toEqual({ ok: false, error: "server" });
      expect(JSON.stringify(result)).not.toContain("boom");
      expect(mocks.remove).toHaveBeenCalledOnce();
    }
  });

  it("keeps the new uploads when the outcome is unknown (no error code, or the request threw)", async () => {
    updateAnswer = { data: null, error: { message: "fetch failed" } };
    expect(await updateKudo(form({ images: [image(JPG)] }))).toEqual({ ok: false, error: "server" });
    mocks.rpc.mockRejectedValueOnce(new TypeError("fetch failed"));
    expect(await updateKudo(form({ images: [image(JPG)] }))).toEqual({ ok: false, error: "server" });
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("answers server when the saved Kudo cannot be read back (no row, error, malformed)", async () => {
    for (const answer of [{ data: [], error: null }, { data: null, error: { code: "XX000", message: "x" } }, { data: [{ id: "x" }], error: null }]) {
      detailAnswer = answer;
      expect(await updateKudo(form())).toEqual({ ok: false, error: "server" });
    }
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("skips the deletions but keeps the save when update_kudo answers something that is not a URL list", async () => {
    updateAnswer = { data: "unexpected", error: null };
    expect(await updateKudo(form())).toEqual({ ok: true, kudo: ROW });
    expect(mocks.remove).not.toHaveBeenCalled();
  });
});
