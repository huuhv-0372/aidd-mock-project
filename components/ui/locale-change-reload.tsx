"use client";

import { useEffect } from "react";
import { isLocale, type Locale } from "@/lib/i18n/locales";

const LOCALE_CHANNEL = "locale";

/* Set once this document reloads itself, so its own channel listener does not reload it twice. */
let reloading = false;

/**
 * Called after the locale cookie is stored: tells other tabs, then hard-reloads this one. The root
 * layout's [locale] param changes, and with cacheComponents a soft refresh keeps the old-locale tree
 * mounted in a hidden <Activity> (display:none) beside the new one.
 */
export function reloadIntoLocale(locale: Locale) {
  reloading = true;
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(LOCALE_CHANNEL);
    channel.postMessage({ locale });
    channel.close();
  }
  window.location.reload();
}

/*
 * Mounted once per page. A tab rendered in one locale must not soft-navigate after the locale
 * changed elsewhere (same hidden-<Activity> problem), so it hard-reloads when another tab announces
 * a different locale, and on any bfcache restore: the cookie is httpOnly, so a restored page cannot
 * tell whether the locale changed while it was cached.
 */
export function LocaleChangeReload({ locale }: { locale: Locale }) {
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", onPageShow);

    const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(LOCALE_CHANNEL);
    if (channel) {
      channel.onmessage = (event: MessageEvent<unknown>) => {
        const next = (event.data as { locale?: unknown } | null)?.locale;
        if (!reloading && isLocale(next) && next !== locale) window.location.reload();
      };
    }

    return () => {
      window.removeEventListener("pageshow", onPageShow);
      channel?.close();
    };
  }, [locale]);

  return null;
}
