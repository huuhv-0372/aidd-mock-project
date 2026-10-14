"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { FOCUS_RING } from "@/components/site-shell/shell-class-names";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/locales";
import { HOME_PATH } from "@/lib/navigation/routes";
import type { Dictionary } from "@/messages/vi";

type NotFoundCopy = Dictionary["notFound"];

/*
 * not-found.tsx receives no params, so this client leaf reads the locale segment itself and picks
 * from the two small slices passed in (falls back to the default locale when the segment is unknown).
 */
export function NotFoundContent({ copy }: { copy: Record<Locale, NotFoundCopy> }) {
  const { locale } = useParams<{ locale?: string }>();
  const current = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const text = copy[current];

  // The static metadata title is the default locale's; align it with the rendered language.
  useEffect(() => {
    document.title = text.metaTitle;
  }, [text.metaTitle]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-login-bg px-4 py-12 text-center font-montserrat">
      <h1 className="text-3xl leading-10 font-bold text-white md:text-5xl md:leading-[3.5rem]">{text.title}</h1>
      <p className="max-w-md text-base leading-6 text-white/80">{text.body}</p>
      <Link
        href={HOME_PATH}
        className={`flex min-h-11 min-w-11 items-center justify-center rounded bg-login-accent px-6 py-3 text-base leading-6 font-bold text-login-bg hover:bg-[#fff3c4] motion-safe:transition-colors motion-safe:duration-200 ${FOCUS_RING}`}
      >
        {text.homeLink}
      </Link>
    </main>
  );
}
