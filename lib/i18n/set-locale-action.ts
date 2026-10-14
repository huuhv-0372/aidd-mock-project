"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE } from "@/lib/i18n/locales";
import { localeSchema } from "@/lib/validation/locale";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Stores the chosen UI language; proxy.ts reads it on the next request. The caller follows with
 * a full page reload. Invalid input or a cookie failure is logged and ignored, never returned.
 */
export async function setLocale(locale: unknown): Promise<void> {
  const parsed = localeSchema.safeParse(locale);
  if (!parsed.success) {
    console.error("[set-locale] rejected unsupported locale input");
    return;
  }

  try {
    (await cookies()).set(LOCALE_COOKIE, parsed.data, {
      path: "/",
      maxAge: ONE_YEAR_SECONDS,
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
  } catch (err) {
    console.error("[set-locale] could not write the locale cookie", err);
  }
}
