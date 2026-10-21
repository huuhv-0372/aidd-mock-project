"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/locales";

/*
 * not-found.tsx / forbidden.tsx receive no params, so the client leaf reads the locale segment itself and
 * picks from the small per-locale slices passed in (falls back to the default locale when the segment is unknown).
 * The static metadata title is the default locale's; align document.title with the rendered language.
 */
export function useErrorCopy<T extends { metaTitle: string }>(copy: Record<Locale, T>): T {
  const { locale } = useParams<{ locale?: string }>();
  const text = copy[isLocale(locale) ? locale : DEFAULT_LOCALE];

  useEffect(() => {
    document.title = text.metaTitle;
  }, [text.metaTitle]);

  return text;
}
