import { describe, expect, it } from "vitest";
import { inspectKudoImage, KUDO_IMAGE_MAX_BYTES } from "@/lib/kudos/kudo-image-file";
import { fieldErrorsFromIssues, sunnerQuerySchema, sunnerSchema, writeKudoSchema } from "@/lib/validation/write-kudo";
import { APP0, ascii, EOI, jpeg, SCAN, segment, SOS } from "./support/jpeg-fixtures";
import { IDAT, IEND, IHDR, png, pngChunk, VP8, vp8x, webp, webpChunk } from "./support/png-webp-fixtures";

const RECIPIENT = "2a000000-0000-0000-0000-000000000101";
const valid = {
  recipientId: RECIPIENT,
  title: "NGƯỜI TRUYỀN CẢM HỨNG",
  content: "Cảm ơn bạn đã hỗ trợ team",
  hashtags: ["dedicated"],
  isAnonymous: false,
  anonymousName: undefined as string | undefined,
  images: [] as unknown[],
};
const parse = (patch: Partial<typeof valid> = {}) => writeKudoSchema.safeParse({ ...valid, ...patch });
const slugs = (n: number) => Array.from({ length: n }, (_, i) => `tag-${i}`);

// Smallest structurally valid files: the server walks their headers / chunks to strip metadata.
const JPG = [...jpeg(APP0, SOS, SCAN, EOI)];
const PNG = [...png(IHDR, IDAT, IEND)];
const WEBP = [...webp(VP8)];
const file = (bytes: ArrayLike<number> | string, name: string, type: string) =>
  new File([typeof bytes === "string" ? bytes : Uint8Array.from(bytes)], name, { type });

describe("writeKudoSchema", () => {
  it("accepts a minimal valid Kudo and trims title + content", () => {
    const result = parse({ title: "  Hero  ", content: "  hi  " });
    expect(result.success && result.data).toMatchObject({ title: "Hero", content: "hi", anonymousName: null, images: [] });
  });

  it.each([
    [0, false],
    [1, true],
    [5, true],
    [6, false],
  ])("%i hashtag(s) -> valid=%s", (count, ok) => {
    expect(parse({ hashtags: slugs(count) }).success).toBe(ok);
  });

  it("rejects duplicate hashtags", () => {
    expect(parse({ hashtags: ["a", "a"] }).success).toBe(false);
  });

  it.each([
    ["", false],
    ["   ", false],
    ["x".repeat(100), true],
    ["x".repeat(101), false],
  ])("title of length %#", (title, ok) => {
    expect(parse({ title }).success).toBe(ok);
  });

  it.each([
    ["x".repeat(5000), true],
    ["x".repeat(5001), false],
    ["", false],
    ["  \n  ", false],
    [">", false], // a lone quote marker has no text
  ])("content case %#", (content, ok) => {
    expect(parse({ content }).success).toBe(ok);
  });

  it("accepts mentions and http(s) links but refuses other link targets", () => {
    expect(parse({ content: `Thanks @[An](${RECIPIENT}) see [doc](https://a.com/x)` }).success).toBe(true);
    expect(parse({ content: "[x](javascript:alert(1))" }).success).toBe(false);
    expect(parse({ content: "[x](data:text/html,a)" }).success).toBe(false);
    expect(parse({ content: "@[An](not-an-id)" }).success).toBe(false);
    expect(parse({ content: "Thanks \\[not a link\\](javascript:x)" }).success).toBe(true);
  });

  it("rejects a bad recipient id but accepts a non-v4 Postgres uuid", () => {
    expect(parse({ recipientId: "nope" }).success).toBe(false);
    expect(parse({ recipientId: "2a000000-0000-0000-0000-000000000101" }).success).toBe(true);
  });

  it("keeps the alias only for an anonymous Kudo and treats blank as none", () => {
    expect(parse({ anonymousName: "Ninja" }).data?.anonymousName).toBeNull();
    expect(parse({ isAnonymous: true, anonymousName: "  Ninja " }).data?.anonymousName).toBe("Ninja");
    expect(parse({ isAnonymous: true, anonymousName: "   " }).data?.anonymousName).toBeNull();
    expect(parse({ isAnonymous: true }).data?.anonymousName).toBeNull();
    expect(parse({ isAnonymous: true, anonymousName: "x".repeat(50) }).success).toBe(true);
    expect(parse({ isAnonymous: true, anonymousName: "x".repeat(51) }).success).toBe(false);
  });

  it("allows up to 5 files and rejects 6, non-files, empty files and files over 5 MB", () => {
    const img = () => file(JPG, "a.jpg", "image/jpeg");
    expect(parse({ images: [img(), img(), img(), img(), img()] }).success).toBe(true);
    expect(parse({ images: [img(), img(), img(), img(), img(), img()] }).success).toBe(false);
    expect(parse({ images: ["not a file"] }).success).toBe(false);
    expect(parse({ images: [file([], "e.jpg", "image/jpeg")] }).success).toBe(false);
    const big = file(new Uint8Array(KUDO_IMAGE_MAX_BYTES + 1), "big.jpg", "image/jpeg");
    const result = parse({ images: [big] });
    expect(result.success).toBe(false);
    expect(!result.success && fieldErrorsFromIssues(result.error.issues)).toEqual({ images: "size" });
  });

  it("reports one generic code per field", () => {
    const result = parse({ recipientId: "x", title: "", hashtags: [], anonymousName: "x".repeat(51) });
    expect(!result.success && fieldErrorsFromIssues(result.error.issues)).toEqual({
      recipient: "invalid",
      title: "invalid",
      hashtags: "invalid",
      anonymousName: "invalid",
    });
  });
});

describe("sunner schemas", () => {
  it("trims the query and keeps it within 1-50 characters", () => {
    expect(sunnerQuerySchema.parse("  nguyen ")).toBe("nguyen");
    // empty after trim is allowed: "@" alone asks for the first Sunners by name
    expect(sunnerQuerySchema.parse("   ")).toBe("");
    expect(sunnerQuerySchema.parse("")).toBe("");
    expect(sunnerQuerySchema.parse(`  ${"x".repeat(50)}  `)).toHaveLength(50);
    expect(sunnerQuerySchema.safeParse("x".repeat(51)).success).toBe(false);
  });

  it("strips unknown keys such as an email from RPC rows", () => {
    const row = { id: RECIPIENT, full_name: "An", avatar_url: null, department: "CEVC1", email: "an@x.com" };
    expect(sunnerSchema.parse(row)).not.toHaveProperty("email");
  });
});

describe("inspectKudoImage (magic bytes)", () => {
  it.each([
    ["jpeg", JPG, "image/jpeg", "jpg"],
    ["png", PNG, "image/png", "png"],
    ["webp", WEBP, "image/webp", "webp"],
  ])("accepts a real %s", async (_name, bytes, type, ext) => {
    const result = await inspectKudoImage(file(bytes, `a.${ext}`, type));
    expect(result).toMatchObject({ ok: true, mime: type, ext });
  });

  it("hands back each format without its metadata (what is not metadata stays byte for byte)", async () => {
    const exif = segment(0xe1, [...ascii("Exif" + String.fromCharCode(0, 0)), 1, 2, 3, 4, 5, 6, 7, 8]);
    const bodyOf = async (input: ArrayLike<number>, name: string, type: string) => {
      const result = await inspectKudoImage(file(input, name, type));
      if (!result.ok) throw new Error("expected an accepted image");
      return { bytes: new Uint8Array(await result.body.arrayBuffer()), type: result.body.type };
    };
    expect(await bodyOf(jpeg(APP0, exif, SOS, SCAN, EOI), "gps.jpg", "image/jpeg")).toEqual({ bytes: Uint8Array.from(JPG), type: "image/jpeg" });
    expect(await bodyOf(png(IHDR, pngChunk("tEXt", ascii("a")), IDAT, IEND), "a.png", "image/png")).toEqual({ bytes: Uint8Array.from(PNG), type: "image/png" });
    expect(await bodyOf(webp(vp8x(0x08), VP8, webpChunk("EXIF", [1, 2])), "a.webp", "image/webp")).toEqual({
      bytes: webp(vp8x(0), VP8),
      type: "image/webp",
    });
  });

  it.each([
    ["a JPEG with a broken header", [0xff, 0xd8, 0xff, 0xe1, 0xff, 0xff, 1, 2, 3], "image/jpeg"],
    ["a JPEG that never ends (no EOI)", [...jpeg(APP0, SOS, SCAN)], "image/jpeg"],
    ["a PNG that is only its signature", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], "image/png"],
    ["a PNG without IEND", [...png(IHDR, IDAT)], "image/png"],
    ["a WebP that is only its RIFF header", [0x52, 0x49, 0x46, 0x46, 0x24, 0, 0, 0, 0x57, 0x45, 0x42, 0x50], "image/webp"],
  ])("rejects %s although the magic bytes are right (nothing is uploaded)", async (_name, bytes, type) => {
    expect(await inspectKudoImage(file(bytes, "a.img", type))).toEqual({ ok: false, reason: "format" });
  });

  it("decides type from the bytes, not the declared MIME or name", async () => {
    expect(await inspectKudoImage(file(PNG, "a.jpg", "image/jpeg"))).toMatchObject({ ok: true, mime: "image/png", ext: "png" });
  });

  it.each([
    ["pdf", "%PDF-1.4\n1 0 obj", "doc.jpg"],
    ["mp4", [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d], "clip.jpg"],
    ["txt", "just text", "note.jpg"],
    ["RIFF but not WEBP", [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45], "a.jpg"],
    ["truncated png", [0x89, 0x50], "a.jpg"],
  ])("rejects a %s renamed to .jpg even with an image MIME", async (_name, bytes, name) => {
    expect(await inspectKudoImage(file(bytes, name, "image/jpeg"))).toEqual({ ok: false, reason: "format" });
  });

  it("rejects a declared MIME outside the allow-list even when the bytes are an image", async () => {
    expect(await inspectKudoImage(file(JPG, "a.gif", "image/gif"))).toEqual({ ok: false, reason: "format" });
    expect(await inspectKudoImage(file(JPG, "a.jpg", "constructor"))).toEqual({ ok: false, reason: "format" });
  });

  it("enforces the 5 MB cap (exactly 5 MB passes)", async () => {
    const at = new Uint8Array(KUDO_IMAGE_MAX_BYTES);
    at.set(JPG);
    expect(await inspectKudoImage(file(at, "a.jpg", "image/jpeg"))).toMatchObject({ ok: true });
    expect(await inspectKudoImage(file(new Uint8Array(KUDO_IMAGE_MAX_BYTES + 1), "a.jpg", "image/jpeg"))).toEqual({
      ok: false,
      reason: "size",
    });
  });
});
