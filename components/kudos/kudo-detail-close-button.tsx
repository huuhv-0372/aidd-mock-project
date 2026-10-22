"use client";

import { useRouter } from "next/navigation";
import { LOGIN_PATH } from "@/lib/auth/constants";
import { SUN_KUDOS_PATH } from "@/lib/navigation/routes";
import { KUDO_CARD_FOCUS_RING } from "./kudo-card-focus-ring";

type NavigationEntryLike = { url: string | null; index: number };
type NavigationLike = { currentEntry: NavigationEntryLike | null; entries(): NavigationEntryLike[] };

/** A same-site page worth going back to: not the login page (after Google sign-in the hop back to the Kudo follows it). */
function isBackTarget(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const target = new URL(url);
    return target.origin === window.location.origin && target.pathname !== LOGIN_PATH;
  } catch {
    return false;
  }
}

/*
 * Is there an earlier same-site page to go back to? The Navigation API lists only same-origin entries of this tab, so a fresh
 * tab or a link opened from elsewhere has no previous entry, and client-side navigations (which never update
 * `document.referrer`) are counted. Without that API (older browsers) only the referrer of the first load is left to go by,
 * and a new tab keeps a same-site referrer with nothing to go back to, hence the history length check.
 */
function canGoBackInSite(): boolean {
  const navigation = (window as Window & { navigation?: NavigationLike }).navigation;
  if (navigation) {
    const current = navigation.currentEntry;
    return current !== null && current.index > 0 && isBackTarget(navigation.entries()[current.index - 1]?.url);
  }
  return window.history.length > 1 && isBackTarget(document.referrer);
}

/*
 * "Dong" of the View Kudo frame (Figma 520:18779, the same 56px text button as "Copy Link"): back to the page the viewer came
 * from, or to the board when the page was opened directly.
 */
export function KudoDetailCloseButton({ label }: { label: string }) {
  const router = useRouter();

  function close() {
    if (canGoBackInSite()) router.back();
    else router.push(SUN_KUDOS_PATH);
  }

  return (
    <button
      type="button"
      onClick={close}
      className={`inline-flex min-h-14 min-w-11 cursor-pointer items-center rounded p-4 text-base leading-6 font-bold tracking-[0.15px] text-login-bg hover:bg-black/5 motion-safe:transition-colors motion-safe:duration-200 ${KUDO_CARD_FOCUS_RING}`}
    >
      {label}
    </button>
  );
}
