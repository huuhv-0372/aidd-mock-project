import { z } from "zod";
import { kudoPlainText } from "@/lib/kudos/kudo-plain-text";
import { KUDO_IMAGE_MAX_BYTES, KUDO_IMAGE_MAX_COUNT } from "@/lib/kudos/kudo-image-file";
import { hashtagSchema } from "@/lib/validation/kudos";

export const KUDO_TITLE_MAX = 100;
export const KUDO_CONTENT_MAX = 5000;
export const KUDO_HASHTAGS_MAX = 5;
export const KUDO_ALIAS_MAX = 50;
export const SUNNER_QUERY_MAX = 50;

// Postgres `uuid` accepts any 8-4-4-4-12 hex (seed ids are md5-derived), so z.guid(), not z.uuid().
const pgUuid = z.guid();

/** 0-50 chars after trim: an empty query ("@" alone) asks for the first Sunners by name. */
export const sunnerQuerySchema = z.string().trim().max(SUNNER_QUERY_MAX);
/** `nameOnly`: "@ + tên" searches names only (no email match). */
export const sunnerSearchOptionsSchema = z.strictObject({ nameOnly: z.boolean().optional() }).optional();

/** Row of `kudos_search_sunners`: never carries an email. */
export const sunnerSchema = z.object({
  id: pgUuid,
  full_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  department: z.string().nullable(),
});
export type Sunner = z.infer<typeof sunnerSchema>;

export const hashtagOptionSchema = hashtagSchema.pick({ slug: true, name_vi: true, name_en: true });
export type HashtagOption = z.infer<typeof hashtagOptionSchema>;

const HTTP_URL = /^https?:\/\/\S+$/i;
// `[label](target)` with an optional leading `@` (mention). Labels may hold escaped brackets (`\]`) but no bare `[`:
// a match then starts at the innermost `[`, so an unclosed `[[[…` costs linear time, and `[a[b](t)` still checks `t`.
// The target keeps `[^)]*` (not `[^()]*`): `[x](javascript:alert(1))` must still be found and refused.
const MARKDOWN_LINK = /(@?)\[(?:\\.|[^[\]\\])*\]\(([^)]*)\)/g;

/**
 * Every link target is http(s); every `@[Name](target)` with a non-http target must point at a profile id.
 * Blocks `javascript:` & co. (`@` typed right before a link legitimately serialises to `@[label](https://…)`.)
 */
function hasOnlySafeLinks(markdown: string): boolean {
  // Every link ends with `)`, so text after the last one holds none. Cutting it off keeps the scan linear: each
  // `](` then reaches a `)` and matches, instead of rescanning to the end for every opener of `[](` `[](` ….
  const scanned = markdown.slice(0, markdown.lastIndexOf(")") + 1);
  for (const [, mention, target] of scanned.matchAll(MARKDOWN_LINK)) {
    if (HTTP_URL.test(target)) continue;
    if (!(mention && pgUuid.safeParse(target).success)) return false;
  }
  return true;
}

const content = z
  .string()
  // Browsers send multipart text with CRLF line breaks: store LF (what the editor writes), counted after this.
  .overwrite((markdown) => markdown.replace(/\r\n?/g, "\n"))
  .trim()
  // `abort`: zod 4 still runs later refines after a failed check; an oversized body must never reach them
  // (this parse runs before the session check, so it is reachable without signing in).
  .max(KUDO_CONTENT_MAX, { abort: true })
  .refine((markdown) => kudoPlainText(markdown).length > 0)
  .refine(hasOnlySafeLinks);

const images = z
  .array(z.instanceof(File))
  .max(KUDO_IMAGE_MAX_COUNT)
  .superRefine((files, ctx) => {
    files.forEach((file, index) => {
      if (file.size > KUDO_IMAGE_MAX_BYTES) ctx.addIssue({ code: "custom", path: [index], message: "size" });
      else if (file.size === 0) ctx.addIssue({ code: "custom", path: [index], message: "format" });
    });
  });

const title = z.string().trim().min(1).max(KUDO_TITLE_MAX);
const hashtags = z
  .array(z.string().trim().min(1).max(50))
  .min(1)
  .max(KUDO_HASHTAGS_MAX)
  .refine((slugs) => new Set(slugs).size === slugs.length);
const anonymousName = z.string().trim().max(KUDO_ALIAS_MAX).optional();

/** Untrusted input of `createKudo` after the FormData fields are collected. The sender is never part of it. */
export const writeKudoSchema = z
  .object({ recipientId: pgUuid, title, content, hashtags, isAnonymous: z.boolean(), anonymousName, images })
  // An alias only exists for an anonymous Kudo; blank means "use the board's default label".
  .transform((data) => ({
    ...data,
    anonymousName: data.isAnonymous ? data.anonymousName || null : null,
  }));

export type WriteKudoInput = z.output<typeof writeKudoSchema>;

/**
 * A kept image of an edited Kudo: the public URL of a flat `{uuid}.{ext}` object in `kudo-images`, the shape
 * `create_kudo` / `update_kudo` accept (the RPC also checks it is the Kudo's own image or one the caller uploaded).
 */
export const KUDO_IMAGE_URL = /^https?:\/\/[^/?#@\s]+\/storage\/v1\/object\/public\/kudo-images\/([0-9a-f-]{36}\.(?:jpg|png|webp))$/;
const keepImages = z
  .array(z.string().max(2048).regex(KUDO_IMAGE_URL))
  .max(KUDO_IMAGE_MAX_COUNT)
  .refine((urls) => new Set(urls).size === urls.length);

/**
 * Untrusted input of `updateKudo` (plans/261022-edit-kudo). Strict: a Kudo's recipient and anonymous state never change,
 * so neither is accepted. Kept + new images are at most five. The alias is for an anonymous Kudo only, which
 * `update_kudo` enforces (the form sends it only for one); blank -> null (the board's default label).
 */
export const updateKudoSchema = z
  .strictObject({ kudoId: pgUuid, title, content, hashtags, anonymousName, keepImages, images })
  .refine((data) => data.keepImages.length + data.images.length <= KUDO_IMAGE_MAX_COUNT, { path: ["images"] })
  .transform((data) => ({ ...data, anonymousName: data.anonymousName || null }));

export type UpdateKudoInput = z.output<typeof updateKudoSchema>;

export type KudoField = "recipient" | "title" | "content" | "hashtags" | "images" | "anonymousName";
/** `format` / `size` only for images; `invalid` for everything else. */
export type KudoFieldErrors = Partial<Record<KudoField, "invalid" | "format" | "size">>;

const FIELD_BY_KEY: Record<string, KudoField> = {
  recipientId: "recipient",
  title: "title",
  content: "content",
  hashtags: "hashtags",
  images: "images",
  keepImages: "images",
  anonymousName: "anonymousName",
};

// `create_kudo` / `update_kudo` raise errcode 22023 with one of these short codes as the message.
const RPC_FIELD_BY_CODE: Record<string, KudoField> = {
  invalid_recipient: "recipient",
  invalid_title: "title",
  invalid_content: "content",
  invalid_hashtags: "hashtags",
  invalid_images: "images",
  invalid_alias: "anonymousName",
};

/** The form field a write RPC refused (22023 + field code), or undefined for any other error. */
export function fieldOfRpcError(error: { code?: string; message?: string }): KudoField | undefined {
  const code = error.message ?? "";
  return error.code === "22023" && Object.hasOwn(RPC_FIELD_BY_CODE, code) ? RPC_FIELD_BY_CODE[code] : undefined;
}

/** Collapses zod issues into one generic code per form field (no zod message ever reaches the client). */
export function fieldErrorsFromIssues(issues: readonly z.core.$ZodIssue[]): KudoFieldErrors {
  const fields: KudoFieldErrors = {};
  for (const issue of issues) {
    const field = FIELD_BY_KEY[String(issue.path[0])];
    if (!field) continue;
    const code = field === "images" && (issue.message === "size" || issue.message === "format") ? issue.message : "invalid";
    // A size/format problem is more specific than a count problem on the same field.
    if (!fields[field] || fields[field] === "invalid") fields[field] = code;
  }
  return fields;
}
