import type { Metadata } from "next";
import { cookies } from "next/headers";
import { NotFoundContent } from "@/components/not-found/not-found-content";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { LOCALE_COOKIE, resolveLocale } from "@/lib/i18n/locales";

const copy = { vi: getDictionary("vi").notFound, en: getDictionary("en").notFound };

/* No params reach a not-found page; the locale cookie is what proxy.ts rewrote this request by,
 * so the title is localised in the first HTML byte instead of flashing the default locale. */
export async function generateMetadata(): Promise<Metadata> {
  const locale = resolveLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  return { title: copy[locale].metaTitle };
}

/* Shared by every route that does not exist (or is not built yet), so no header/footer and no error details.
 * Both locales' copy go to a client leaf that picks by the locale segment. */
export default function NotFound() {
  return <NotFoundContent copy={copy} />;
}
