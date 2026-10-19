import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { createKudo } from "@/lib/kudos/create-kudo-action";
import { APP0, ascii, EOI, jpeg, SCAN, segment, SOS } from "./support/jpeg-fixtures";
import { IDAT, IEND, IHDR, png, pngChunk, VP8, vp8x, webp, webpChunk } from "./support/png-webp-fixtures";

const UID = "6f1c1c3e-3b0f-4a53-9a55-2f3d2a1f9b11";
const RECIPIENT = "2a000000-0000-0000-0000-000000000101";
const KUDO_ID = "c2000000-0000-0000-0000-000000000001";
const PUBLIC_BASE = "https://x.supabase.co/storage/v1/object/public/kudo-images/";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getClaims: vi.fn(),
  rpc: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  from: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.createClient }));

// Smallest structurally valid files (the server walks their headers/chunks): JPEG, PNG, WebP.
const EXIF = segment(0xe1, [...ascii("Exif\0\0"), ...ascii("GPS-LAT!")]);
const JPG = jpeg(APP0, SOS, SCAN, EOI);
const JPG_WITH_EXIF = jpeg(APP0, EXIF, SOS, SCAN, EOI);
const PNG = png(IHDR, IDAT, IEND);
const bytesOf = async (body: unknown) => new Uint8Array(await (body as Blob).arrayBuffer());
const image = (bytes: Uint8Array | string, name: string, type: string) => new File([bytes as BlobPart], name, { type });

function form(patch: { images?: File[]; hashtags?: string[]; [key: string]: unknown } = {}): FormData {
  const { images = [], hashtags = ["dedicated"], ...fields } = patch;
  const data = new FormData();
  const base: Record<string, unknown> = {
    recipientId: RECIPIENT,
    title: "  NGƯỜI TRUYỀN CẢM HỨNG ",
    content: "**Cảm ơn** bạn",
    isAnonymous: "false",
    ...fields,
  };
  for (const [key, value] of Object.entries(base)) if (value !== undefined) data.append(key, String(value));
  hashtags.forEach((slug) => data.append("hashtags", slug));
  images.forEach((file) => data.append("images", file));
  return data;
}

describe("createKudo", () => {
  let errorSpy: MockInstance;
  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    for (const mock of Object.values(mocks)) mock.mockReset();
    mocks.getClaims.mockResolvedValue({ data: { claims: { sub: UID } }, error: null });
    mocks.rpc.mockResolvedValue({ data: KUDO_ID, error: null });
    mocks.upload.mockResolvedValue({ data: {}, error: null });
    mocks.remove.mockResolvedValue({ data: [], error: null });
    mocks.from.mockReturnValue({
      upload: mocks.upload,
      remove: mocks.remove,
      getPublicUrl: (path: string) => ({ data: { publicUrl: PUBLIC_BASE + path } }),
    });
    mocks.createClient.mockResolvedValue({
      auth: { getClaims: mocks.getClaims },
      rpc: mocks.rpc,
      storage: { from: mocks.from },
    });
  });
  afterEach(() => errorSpy.mockRestore());

  it("calls create_kudo with trimmed, validated params and no images", async () => {
    expect(await createKudo(form())).toEqual({ ok: true, id: KUDO_ID });
    expect(mocks.rpc).toHaveBeenCalledWith("create_kudo", {
      p_recipient_id: RECIPIENT,
      p_title: "NGƯỜI TRUYỀN CẢM HỨNG",
      p_content: "**Cảm ơn** bạn",
      p_hashtag_slugs: ["dedicated"],
      p_image_urls: [],
      p_is_anonymous: false,
      p_anonymous_name: null,
    });
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("never takes the sender from the form", async () => {
    await createKudo(form({ senderId: "someone-else", sender_id: "x" }));
    const params = mocks.rpc.mock.calls[0][1];
    expect(Object.keys(params).sort()).toEqual([
      "p_anonymous_name",
      "p_content",
      "p_hashtag_slugs",
      "p_image_urls",
      "p_is_anonymous",
      "p_recipient_id",
      "p_title",
    ]);
  });

  it("passes the alias only for an anonymous Kudo", async () => {
    await createKudo(form({ isAnonymous: "true", anonymousName: " Ninja " }));
    expect(mocks.rpc.mock.calls[0][1]).toMatchObject({ p_is_anonymous: true, p_anonymous_name: "Ninja" });
    await createKudo(form({ isAnonymous: "false", anonymousName: "Ninja" }));
    expect(mocks.rpc.mock.calls[1][1]).toMatchObject({ p_is_anonymous: false, p_anonymous_name: null });
  });

  it("uploads images under flat {uuid}.{ext} names with the sniffed type and sends their public URLs in order", async () => {
    const result = await createKudo(
      form({ images: [image(JPG, "a.png", "image/jpeg"), image(PNG, "b.jpg", "image/png")], hashtags: ["a", "b"] }),
    );
    expect(result).toEqual({ ok: true, id: KUDO_ID });
    expect(mocks.from).toHaveBeenCalledWith("kudo-images");
    const [first, second] = mocks.upload.mock.calls;
    expect(first[0]).toMatch(/^[0-9a-f-]{36}\.jpg$/);
    expect(second[0]).toMatch(/^[0-9a-f-]{36}\.png$/);
    expect(first[2]).toEqual({ contentType: "image/jpeg", upsert: false });
    expect(second[2]).toEqual({ contentType: "image/png", upsert: false });
    expect(await bytesOf(first[1])).toEqual(JPG);
    expect(await bytesOf(second[1])).toEqual(PNG);
    // supabase-js sends a Blob as multipart and takes the part type from the Blob itself, not from `contentType`.
    expect((first[1] as Blob).type).toBe("image/jpeg");
    expect((second[1] as Blob).type).toBe("image/png");
    expect(mocks.rpc.mock.calls[0][1].p_image_urls).toEqual([PUBLIC_BASE + first[0], PUBLIC_BASE + second[0]]);
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("keeps the sender out of every object name and public URL (anonymous Kudos must not be traceable)", async () => {
    await createKudo(
      form({ isAnonymous: "true", images: [image(JPG, "a.jpg", "image/jpeg"), image(PNG, "b.png", "image/png")] }),
    );
    const paths = mocks.upload.mock.calls.map((call) => call[0] as string);
    expect(paths).toHaveLength(2);
    for (const path of paths) {
      expect(path).not.toContain(UID);
      expect(path).not.toContain("/");
    }
    for (const url of mocks.rpc.mock.calls[0][1].p_image_urls as string[]) {
      expect(url).not.toContain(UID);
      expect(url).toMatch(/\/kudo-images\/[0-9a-f-]{36}\.(jpg|png)$/);
    }
  });

  it("uploads a JPEG without its EXIF/APP1 segment and everything else unchanged", async () => {
    await createKudo(form({ images: [image(JPG_WITH_EXIF, "gps.jpg", "image/jpeg")] }));
    const sent = await bytesOf(mocks.upload.mock.calls[0][1]);
    expect(sent).toEqual(JPG);
    expect(Buffer.from(sent).includes("Exif")).toBe(false);
  });

  it("uploads a PNG without its text / EXIF / time chunks and a WebP without its EXIF and XMP", async () => {
    const dirty = png(IHDR, pngChunk("tEXt", ascii("Author\0Jane")), pngChunk("eXIf", ascii("MM\0*GPS")), IDAT, IEND);
    const dirtyWebp = webp(vp8x(0x0c), VP8, webpChunk("EXIF", ascii("MM\0*GPS")), webpChunk("XMP ", ascii("<x/>")));
    await createKudo(form({ images: [image(dirty, "a.png", "image/png"), image(dirtyWebp, "b.webp", "image/webp")] }));
    const [first, second] = mocks.upload.mock.calls;
    expect(await bytesOf(first[1])).toEqual(PNG);
    expect(await bytesOf(second[1])).toEqual(webp(vp8x(0), VP8));
    expect((first[1] as Blob).type).toBe("image/png");
    expect((second[1] as Blob).type).toBe("image/webp");
  });

  it("inspects images one after the other: never two images' bytes are being read at once", async () => {
    const original = Blob.prototype.arrayBuffer;
    let inFlight = 0;
    let peak = 0;
    const reads = vi.spyOn(Blob.prototype, "arrayBuffer").mockImplementation(async function (this: Blob) {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 2));
      inFlight -= 1;
      return original.call(this);
    });
    try {
      const images = [image(JPG, "a.jpg", "image/jpeg"), image(PNG, "b.png", "image/png"), image(JPG, "c.jpg", "image/jpeg")];
      expect(await createKudo(form({ images, hashtags: ["a", "b"] }))).toEqual({ ok: true, id: KUDO_ID });
    } finally {
      reads.mockRestore();
    }
    expect(peak).toBe(1);
    expect(mocks.upload).toHaveBeenCalledTimes(3);
  });

  it("stops at the first refused image: later ones are not read", async () => {
    const spoof = image("%PDF-1.4\n1 0 obj", "fake.jpg", "image/jpeg");
    const reads = vi.spyOn(Blob.prototype, "arrayBuffer");
    try {
      const result = await createKudo(form({ images: [spoof, image(JPG, "later.jpg", "image/jpeg")] }));
      expect(result).toMatchObject({ fields: { images: "format" } });
      expect(reads).toHaveBeenCalledTimes(1); // only the 12 sniffing bytes of the refused file
    } finally {
      reads.mockRestore();
    }
  });

  it.each([
    ["missing recipient", { recipientId: undefined }, "recipient"],
    ["blank title", { title: "   " }, "title"],
    ["empty content", { content: "" }, "content"],
    ["javascript: link", { content: "[x](javascript:alert(1))" }, "content"],
    ["no hashtag", { hashtags: [] }, "hashtags"],
    ["6 hashtags", { hashtags: ["a", "b", "c", "d", "e", "f"] }, "hashtags"],
  ])("%s: validation error, no client, no Storage, no RPC", async (_name, patch, field) => {
    const result = await createKudo(form(patch));
    expect(result).toMatchObject({ ok: false, error: "validation", fields: { [field]: "invalid" } });
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("refuses a spoofed image (PDF bytes named .jpg) before any upload or RPC", async () => {
    const good = image(JPG, "a.jpg", "image/jpeg");
    const spoof = image("%PDF-1.4\n1 0 obj", "fake.jpg", "image/jpeg");
    expect(await createKudo(form({ images: [good, spoof] }))).toEqual({
      ok: false,
      error: "validation",
      fields: { images: "format" },
    });
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("refuses a JPEG whose header is malformed instead of uploading it", async () => {
    const broken = image(Uint8Array.from([0xff, 0xd8, 0xff, 0xe1, 0xff, 0xff, 1, 2, 3]), "a.jpg", "image/jpeg");
    expect(await createKudo(form({ images: [broken] }))).toEqual({
      ok: false,
      error: "validation",
      fields: { images: "format" },
    });
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("verifies the session right after validation and before reading any image byte", async () => {
    const reads = vi.spyOn(Blob.prototype, "arrayBuffer");
    try {
      await createKudo(form({ images: [image(JPG, "a.jpg", "image/jpeg")] }));
      expect(mocks.getClaims).toHaveBeenCalledTimes(1);
      expect(reads).toHaveBeenCalled();
      expect(mocks.getClaims.mock.invocationCallOrder[0]).toBeLessThan(reads.mock.invocationCallOrder[0]);
    } finally {
      reads.mockRestore();
    }
  });

  it("answers a server error without a session and never reads the image, even a spoofed one", async () => {
    mocks.getClaims.mockResolvedValue({ data: null, error: null });
    const reads = vi.spyOn(Blob.prototype, "arrayBuffer");
    try {
      const spoof = image("%PDF-1.4\n1 0 obj", "fake.jpg", "image/jpeg");
      expect(await createKudo(form({ images: [spoof] }))).toEqual({ ok: false, error: "server" });
      expect(reads).not.toHaveBeenCalled();
    } finally {
      reads.mockRestore();
    }
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("refuses six images and a non-file in the images field", async () => {
    const six = Array.from({ length: 6 }, () => image(JPG, "a.jpg", "image/jpeg"));
    expect(await createKudo(form({ images: six }))).toMatchObject({ error: "validation", fields: { images: "invalid" } });
    const data = form();
    data.append("images", "not a file");
    expect(await createKudo(data)).toMatchObject({ error: "validation", fields: { images: "invalid" } });
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("removes every uploaded image when create_kudo fails and returns only a generic error", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "XX000", message: "secret db detail boom" } });
    const result = await createKudo(form({ images: [image(JPG, "a.jpg", "image/jpeg"), image(PNG, "b.png", "image/png")] }));
    expect(result).toEqual({ ok: false, error: "server" });
    expect(JSON.stringify(result)).not.toContain("secret");
    const uploadedPaths = mocks.upload.mock.calls.map((call) => call[0]);
    expect(mocks.remove).toHaveBeenCalledTimes(1);
    expect(mocks.remove).toHaveBeenCalledWith(uploadedPaths);
    expect(errorSpy).toHaveBeenCalled();
  });

  it.each([
    ["invalid_recipient", "recipient"],
    ["invalid_title", "title"],
    ["invalid_content", "content"],
    ["invalid_hashtags", "hashtags"],
    ["invalid_images", "images"],
    ["invalid_alias", "anonymousName"],
  ])("maps SQL 22023 %s to a validation error on %s (and rolls images back)", async (message, field) => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "22023", message } });
    const result = await createKudo(form({ images: [image(JPG, "a.jpg", "image/jpeg")] }));
    expect(result).toEqual({ ok: false, error: "validation", fields: { [field]: "invalid" } });
    expect(mocks.remove).toHaveBeenCalledTimes(1);
  });

  it("treats 22023 forbidden and unknown codes as a server error", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "22023", message: "forbidden" } });
    expect(await createKudo(form())).toEqual({ ok: false, error: "server" });
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "22023", message: "something else" } });
    expect(await createKudo(form())).toEqual({ ok: false, error: "server" });
  });

  it("keeps uploaded images when the RPC succeeded but returned an odd result", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    expect(await createKudo(form({ images: [image(JPG, "a.jpg", "image/jpeg")] }))).toEqual({ ok: false, error: "server" });
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("deletes the images already stored when a later upload fails, and never calls the RPC", async () => {
    mocks.upload
      .mockResolvedValueOnce({ data: {}, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "storage secret" } });
    const result = await createKudo(form({ images: [image(JPG, "a.jpg", "image/jpeg"), image(PNG, "b.png", "image/png")] }));
    expect(result).toEqual({ ok: false, error: "server" });
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.remove).toHaveBeenCalledTimes(1);
    expect(mocks.remove).toHaveBeenCalledWith([mocks.upload.mock.calls[0][0]]);
  });

  it("does not call remove when no upload succeeded", async () => {
    mocks.upload.mockResolvedValue({ data: null, error: { message: "boom" } });
    expect(await createKudo(form({ images: [image(JPG, "a.jpg", "image/jpeg")] }))).toEqual({ ok: false, error: "server" });
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("survives a failing cleanup", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "XX000", message: "x" } });
    mocks.remove.mockRejectedValue(new Error("network"));
    expect(await createKudo(form({ images: [image(JPG, "a.jpg", "image/jpeg")] }))).toEqual({ ok: false, error: "server" });
  });

  it("is a server error without a verified session, before any upload", async () => {
    mocks.getClaims.mockResolvedValue({ data: null, error: null });
    expect(await createKudo(form({ images: [image(JPG, "a.jpg", "image/jpeg")] }))).toEqual({ ok: false, error: "server" });
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("is a server error when the client cannot be created", async () => {
    mocks.createClient.mockRejectedValue(new Error("missing env"));
    expect(await createKudo(form())).toEqual({ ok: false, error: "server" });
    expect(errorSpy).toHaveBeenCalled();
  });
});
