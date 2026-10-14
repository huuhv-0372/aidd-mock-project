import { resolveLocale } from "@/lib/i18n/locales";

/** Top-level app/ segments that live outside app/[locale] (route handlers), matched per segment. */
const UNLOCALIZED_SEGMENTS: readonly string[] = ["auth"];

/**
 * Pure proxy decision: the internal path that serves `pathname` in the cookie's locale, or null to
 * leave the request alone. The public URL never carries the locale; a hand-typed `/vi/...` is nested
 * again (`/vi/vi/...`) and 404s, so the internal segment is never a second working URL.
 */
export function resolveLocaleRewrite(
  pathname: string,
  cookieValue: string | undefined | null,
): string | null {
  const firstSegment = pathname.split("/")[1] ?? "";
  if (UNLOCALIZED_SEGMENTS.includes(firstSegment)) return null;
  const locale = resolveLocale(cookieValue);
  return pathname === "/" ? `/${locale}` : `/${locale}${pathname}`;
}
