import { describe, expect, it } from "vitest";
import { fieldErrorsFromIssues, updateKudoSchema, writeKudoSchema } from "@/lib/validation/write-kudo";

const KUDO_ID = "c3000000-0000-0000-0000-000000000001";
const BASE = "https://x.supabase.co/storage/v1/object/public/kudo-images/";
const url = (n: number, ext = "jpg") => `${BASE}${String(n).padStart(8, "0")}-0000-4000-8000-000000000000.${ext}`;
const photo = () => new File([new Uint8Array([0xff, 0xd8, 0xff])], "a.jpg", { type: "image/jpeg" });
const valid = {
  kudoId: KUDO_ID,
  title: "  NGƯỜI TRUYỀN CẢM HỨNG ",
  content: "Cảm ơn **bạn**",
  hashtags: ["dedicated"],
  anonymousName: undefined as string | undefined,
  keepImages: [] as unknown[],
  images: [] as unknown[],
};
const CREATE = { recipientId: KUDO_ID, title: "T", hashtags: ["dedicated"], isAnonymous: false, images: [] };
const parse = (patch: Record<string, unknown> = {}) => updateKudoSchema.safeParse({ ...valid, ...patch });
const fieldsOf = (patch: Record<string, unknown>) => {
  const result = parse(patch);
  return result.success ? null : fieldErrorsFromIssues(result.error.issues);
};

describe("updateKudoSchema", () => {
  it("accepts a valid edit: title trimmed, kept URLs in order, blank or missing alias -> null", () => {
    const result = parse({ keepImages: [url(2), url(1, "png")], images: [photo()] });
    expect(result.success && result.data).toMatchObject({
      kudoId: KUDO_ID,
      title: "NGƯỜI TRUYỀN CẢM HỨNG",
      content: "Cảm ơn **bạn**",
      keepImages: [url(2), url(1, "png")],
      anonymousName: null,
    });
    expect(parse({ anonymousName: "   " }).data?.anonymousName).toBeNull();
    expect(parse({ anonymousName: " Ninja " }).data?.anonymousName).toBe("Ninja");
  });

  it("is strict: the recipient and the anonymous state are never part of an edit", () => {
    expect(parse({ recipientId: "2a000000-0000-0000-0000-000000000101" }).success).toBe(false);
    expect(parse({ isAnonymous: true }).success).toBe(false);
  });

  it("refuses a kudoId that is not a uuid", () => {
    for (const kudoId of ["", "not-a-uuid", undefined, 42]) expect(parse({ kudoId }).success).toBe(false);
  });

  it.each([
    ["blank title", { title: "  " }, "title"],
    ["101-char title", { title: "t".repeat(101) }, "title"],
    ["blank content", { content: " \n " }, "content"],
    ["5001-char content", { content: "c".repeat(5001) }, "content"],
    ["javascript: link", { content: "[x](javascript:alert%281%29)" }, "content"],
    ["no hashtag", { hashtags: [] }, "hashtags"],
    ["6 hashtags", { hashtags: ["a", "b", "c", "d", "e", "f"] }, "hashtags"],
    ["duplicate hashtag", { hashtags: ["a", "a"] }, "hashtags"],
    ["51-char alias", { anonymousName: "n".repeat(51) }, "anonymousName"],
  ])("refuses %s as that field", (_name, patch, field) => {
    expect(fieldsOf(patch)).toEqual({ [field]: "invalid" });
  });

  it.each([
    ["another bucket", "https://x.supabase.co/storage/v1/object/public/avatars/00000001-0000-4000-8000-000000000000.jpg"],
    ["a folder in the path", `${BASE}6f1c1c3e-3b0f-4a53-9a55-2f3d2a1f9b11/00000001-0000-4000-8000-000000000000.jpg`],
    ["a gif", url(1, "gif")],
    ["a javascript: URL", `javascript:${url(1)}`],
    ["no scheme", url(1).replace("https://", "")],
    ["a query string", `${url(1)}?x=1`],
    ["an internal path", "/images/kudos/a.jpg"],
  ])("refuses a kept image that is %s", (_name, kept) => {
    expect(fieldsOf({ keepImages: [kept] })).toEqual({ images: "invalid" });
  });

  it("refuses a kept image listed twice, or one that is not a string", () => {
    expect(fieldsOf({ keepImages: [url(1), url(1)] })).toEqual({ images: "invalid" });
    expect(fieldsOf({ keepImages: [photo()] })).toEqual({ images: "invalid" });
  });

  it.each([
    [5, 0, true],
    [3, 2, true],
    [0, 5, true],
    [4, 2, false],
    [6, 0, false],
    [0, 6, false],
  ])("%i kept + %i new images -> valid=%s", (kept, added, ok) => {
    const result = parse({ keepImages: Array.from({ length: kept }, (_, i) => url(i + 1)), images: Array.from({ length: added }, photo) });
    expect(result.success).toBe(ok);
    if (!ok && !result.success) expect(fieldErrorsFromIssues(result.error.issues)).toEqual({ images: "invalid" });
  });

  // Browsers send multipart text with CRLF line breaks: create and edit both store LF, and the limit counts LF.
  it("stores LF for CRLF / lone CR line breaks, in create and edit, and checks the length after normalising", () => {
    const content = "a\r\n\r\nb\rc";
    expect(parse({ content }).data?.content).toBe("a\n\nb\nc");
    expect(writeKudoSchema.safeParse({ ...CREATE, content }).data?.content).toBe("a\n\nb\nc");
    const atLimit = `${"c".repeat(2500)}\r\n${"c".repeat(2499)}`; // 5001 chars as sent, 5000 once LF
    expect(parse({ content: atLimit }).data?.content).toHaveLength(5000);
    expect(fieldsOf({ content: `${atLimit}c` })).toEqual({ content: "invalid" });
  });

  it("keeps the image size codes of a new file", () => {
    expect(fieldsOf({ images: [new File([], "empty.jpg", { type: "image/jpeg" })] })).toEqual({ images: "format" });
  });
});
