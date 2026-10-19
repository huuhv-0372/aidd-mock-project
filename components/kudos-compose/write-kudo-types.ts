// Contracts shared by the Viết Kudo modal components. The server actions are built by another plan (phase 03) and
// reach the dialog as props, so only their TYPES live here (no zod, no server-only import).

export type WriteKudoLocale = "vi" | "en";

export type SunnerOption = { id: string; full_name: string | null; avatar_url: string | null; department: string | null };
export type HashtagOption = { slug: string; name_vi: string; name_en: string };

export type SearchSunnersResult = { ok: true; items: SunnerOption[] } | { ok: false };
export type HashtagOptionsResult = { ok: true; items: HashtagOption[] } | { ok: false };
export type CreateKudoResult =
  | { ok: true; id: string }
  | { ok: false; error: "validation" | "server"; fields?: Record<string, string> };

export type WriteKudoActions = {
  /** `nameOnly`: "@ + tên" matches names only; without it the query also matches email. "" lists the first Sunners. */
  searchSunners: (query: string, options?: { nameOnly?: boolean }) => Promise<SearchSunnersResult>;
  getHashtagOptions: () => Promise<HashtagOptionsResult>;
  createKudo: (formData: FormData) => Promise<CreateKudoResult>;
};

export type RecipientChoice = { id: string; name: string };

/** Limits mirrored from the spec / clarifications (the server re-checks every one of them). */
export const KUDO_LIMITS = {
  titleMax: 100,
  aliasMax: 50,
  hashtagsMax: 5,
  imagesMax: 5,
  imageBytesMax: 5 * 1024 * 1024,
  imageTypes: ["image/jpeg", "image/png", "image/webp"],
} as const;
