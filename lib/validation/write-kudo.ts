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
// `[label](target)` with an optional leading `@` (mention). Labels may hold escaped brackets (`\]`).
const MARKDOWN_LINK = /(@?)\[(?:\\.|[^\]\\])*\]\(([^)]*)\)/g;

/** Every link target is http(s); every `@[Name](target)` mention points at a profile id. Blocks `javascript:` & co. */
function hasOnlySafeLinks(markdown: string): boolean {
  for (const [, mention, target] of markdown.matchAll(MARKDOWN_LINK)) {
    if (HTTP_URL.test(target)) continue;
    if (!(mention && pgUuid.safeParse(target).success)) return false;
  }
  return true;
}

const content = z
  .string()
  .trim()
  .max(KUDO_CONTENT_MAX)
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

/** Untrusted input of `createKudo` after the FormData fields are collected. The sender is never part of it. */
export const writeKudoSchema = z
  .object({
    recipientId: pgUuid,
    title: z.string().trim().min(1).max(KUDO_TITLE_MAX),
    content,
    hashtags: z
      .array(z.string().trim().min(1).max(50))
      .min(1)
      .max(KUDO_HASHTAGS_MAX)
      .refine((slugs) => new Set(slugs).size === slugs.length),
    isAnonymous: z.boolean(),
    anonymousName: z.string().trim().max(KUDO_ALIAS_MAX).optional(),
    images,
  })
  // An alias only exists for an anonymous Kudo; blank means "use the board's default label".
  .transform((data) => ({
    ...data,
    anonymousName: data.isAnonymous ? data.anonymousName || null : null,
  }));

export type WriteKudoInput = z.output<typeof writeKudoSchema>;

export type KudoField = "recipient" | "title" | "content" | "hashtags" | "images" | "anonymousName";
/** `format` / `size` only for images; `invalid` for everything else. */
export type KudoFieldErrors = Partial<Record<KudoField, "invalid" | "format" | "size">>;

const FIELD_BY_KEY: Record<string, KudoField> = {
  recipientId: "recipient",
  title: "title",
  content: "content",
  hashtags: "hashtags",
  images: "images",
  anonymousName: "anonymousName",
};

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
