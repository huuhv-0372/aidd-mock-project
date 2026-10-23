// Contracts shared by the Viết Kudo modal components. The server actions are built by another plan (phase 03) and
// reach the dialog as props, so only their TYPES live here (no zod, no server-only import).

import type { KudoRow } from "@/lib/kudos/kudo-types";

export type WriteKudoLocale = "vi" | "en";

export type SunnerOption = { id: string; full_name: string | null; avatar_url: string | null; department: string | null };
export type HashtagOption = { slug: string; name_vi: string; name_en: string };

export type SearchSunnersResult = { ok: true; items: SunnerOption[] } | { ok: false };
export type HashtagOptionsResult = { ok: true; items: HashtagOption[] } | { ok: false };
export type CreateKudoResult =
  | { ok: true; id: string }
  | { ok: false; error: "validation" | "server"; fields?: Record<string, string> };
/** `not_found`: the Kudo is gone or not the caller's (the RPC does not tell the two apart). `kudo` is the row as saved. */
export type UpdateKudoResult =
  | { ok: true; kudo: KudoRow }
  | { ok: false; error: "validation" | "server" | "not_found"; fields?: Record<string, string> };

export type WriteKudoActions = {
  /** `nameOnly`: "@ + tên" matches names only; without it the query also matches email. "" lists the first Sunners. */
  searchSunners: (query: string, options?: { nameOnly?: boolean }) => Promise<SearchSunnersResult>;
  getHashtagOptions: () => Promise<HashtagOptionsResult>;
  createKudo: (formData: FormData) => Promise<CreateKudoResult>;
  /**
   * Edit mode (plans/261022-edit-kudo). FormData: kudoId, title, content (Markdown), hashtags (repeated slug),
   * anonymousName (only for an anonymous Kudo, when not blank), keepImages (repeated URL of a kept image, in order),
   * images (repeated new File, in order). The recipient and the anonymous state are never sent: they cannot change.
   */
  updateKudo: (formData: FormData) => Promise<UpdateKudoResult>;
};

export type RecipientChoice = { id: string; name: string };

/** A Kudo the viewer sent, as the edit modal pre-fills it (built from a KudoRow with is_mine). */
export type EditableKudo = {
  id: string;
  recipient: RecipientChoice;
  title: string;
  /** Markdown as stored; the form turns it into the editor document. */
  content: string;
  hashtagSlugs: string[];
  /** Image URLs by position (1..5). */
  images: string[];
  isAnonymous: boolean;
  anonymousName: string | null;
};

/** Limits mirrored from the spec / clarifications (the server re-checks every one of them). */
export const KUDO_LIMITS = {
  titleMax: 100,
  aliasMax: 50,
  /** Characters of the serialized Markdown, as the server counts them (KUDO_CONTENT_MAX in lib/validation/write-kudo.ts, which a client file must not import: it drags zod in). */
  contentMax: 5000,
  hashtagsMax: 5,
  imagesMax: 5,
  imageBytesMax: 5 * 1024 * 1024,
  imageTypes: ["image/jpeg", "image/png", "image/webp"],
} as const;
