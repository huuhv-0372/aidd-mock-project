import { SUN_KUDOS_PATH, kudoDetailHref } from "@/lib/navigation/routes";

/** Query param carrying the post-login target: proxy -> /login -> sign-in form. */
export const POST_LOGIN_NEXT_PARAM = "next";
/** Holds the checked target across the Google round trip; the callback reads, re-checks and clears it. */
export const POST_LOGIN_NEXT_COOKIE = "saa_post_login_next";
/** Seconds: long enough for the Google sign-in, short enough that a forgotten target goes stale. */
export const POST_LOGIN_NEXT_MAX_AGE = 600;

/** Longer than any allowed path; refuses huge input before the regex even looks at it. */
const MAX_LENGTH = 64;
const HEX = "[0-9a-fA-F]";
// Anchored, no flags: literal path prefix + guid shape (8-4-4-4-12 hex, any version/variant - DB
// seeds are not v4). JS `$` without `m` matches only at the true end, so a trailing "\n" fails too.
const KUDO_DETAIL = new RegExp(
  `^${SUN_KUDOS_PATH}/(${HEX}{8}-${HEX}{4}-${HEX}{4}-${HEX}{4}-${HEX}{12})$`,
);

/**
 * Allow-list for the post-login redirect, not a sanitiser: returns the canonical path only when
 * `value` is exactly `/sun-kudos/<guid>` (no query, hash, trailing slash, encoding or whitespace);
 * anything else - including every off-site or protocol-relative form - is null.
 */
export function parsePostLoginNext(value: unknown): string | null {
  if (typeof value !== "string" || value.length > MAX_LENGTH) return null;
  const match = KUDO_DETAIL.exec(value);
  return match ? kudoDetailHref(match[1].toLowerCase()) : null;
}

/** Cookie attributes for setting (maxAge = POST_LOGIN_NEXT_MAX_AGE) and clearing (maxAge = 0) alike. */
export function postLoginNextCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  } as const;
}
