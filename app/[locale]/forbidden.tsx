import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AccessDeniedContent } from "@/components/errors/access-denied-content";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { LOCALE_COOKIE, resolveLocale } from "@/lib/i18n/locales";

const copy = { vi: getDictionary("vi").forbidden, en: getDictionary("en").forbidden };

/* Rendered when forbidden() is thrown below the [locale] layout (see /403). Like not-found.tsx it
 * receives no params, so the title follows the locale cookie proxy.ts rewrote this request by. */
export async function generateMetadata(): Promise<Metadata> {
  const locale = resolveLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  return { title: copy[locale].metaTitle };
}

/* No header/footer and no error details; both locales' copy go to a client leaf that picks by locale. */
export default function Forbidden() {
  return <AccessDeniedContent copy={copy} />;
}
