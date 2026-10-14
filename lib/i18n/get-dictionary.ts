import { notFound } from "next/navigation";
import { en } from "@/messages/en";
import { vi, type Dictionary } from "@/messages/vi";
import { isLocale, type Locale } from "./locales";

const DICTIONARIES: Record<Locale, Dictionary> = { vi, en };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

/** `params` of an `app/[locale]/**` route: 404 on an unknown locale, else the locale and its dictionary. */
export async function getRouteDictionary(
  params: Promise<{ locale: string }>,
): Promise<{ locale: Locale; dict: Dictionary }> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return { locale, dict: getDictionary(locale) };
}
