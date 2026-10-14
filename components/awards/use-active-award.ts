"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { pickActiveAward } from "@/lib/awards/pick-active-award";
import { parseAwardHash } from "@/lib/awards/parse-award-hash";
import type { AwardSlug } from "@/lib/navigation/routes";

/* Breathing room under the sticky bar so a section counts as reached just before it docks. */
const SPY_GAP_PX = 16;
/* Programmatic smooth scroll ends on `scrollend`; this covers browsers that never fire it. */
const SCROLL_SETTLE_FALLBACK_MS = 1000;

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function scrollToSection(slug: AwardSlug, behavior: ScrollBehavior): void {
  document.getElementById(slug)?.scrollIntoView({ behavior, block: "start" });
}

const scrollMarginTop = (section: Element): number => parseFloat(getComputedStyle(section).scrollMarginTop) || 0;

/*
 * Scroll-spy line = where a section's top lands after scrollIntoView, i.e. its scroll-margin-top, which the
 * sections set to clear whichever sticky bars apply at the current breakpoint (chip bar below lg, header from lg).
 * Reading it from the section keeps the spy in step with the real layout instead of a magic number.
 */
function spyOffset(section: Element): number {
  return scrollMarginTop(section) + SPY_GAP_PX;
}

/* True once `select`'s scroll is over: the section rests at its scroll-margin, or the page cannot scroll further. */
function isAtRest(slug: AwardSlug): boolean {
  const section = document.getElementById(slug);
  if (!section) return true;
  const docked = Math.abs(section.getBoundingClientRect().top - scrollMarginTop(section)) <= 1;
  const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1;
  return docked || atBottom;
}

/**
 * Which award the nav highlights. Starts on the first slug (SSR-safe), follows `#slug` on mount and on
 * `hashchange`, tracks scrolling, and `select` jumps to a section without the spy flickering through the
 * sections in between.
 */
export function useActiveAward(slugs: readonly AwardSlug[]): {
  activeSlug: AwardSlug;
  select: (slug: AwardSlug) => void;
} {
  const [activeSlug, setActiveSlug] = useState<AwardSlug>(slugs[0]);
  const spyPausedRef = useRef(false);
  const cancelSettleRef = useRef<(() => void) | null>(null);
  const measureRef = useRef<() => void>(() => {});
  // Callers may pass a fresh array every render; key on the content so the effect does not re-run needlessly.
  const slugKey = slugs.join(",");

  useEffect(() => {
    const list = slugKey.split(",") as AwardSlug[];

    const activateFromHash = (): void => {
      const slug = parseAwardHash(window.location.hash);
      if (!slug || !list.includes(slug)) return; // unknown hash: leave the current item alone
      setActiveSlug(slug);
      scrollToSection(slug, "instant");
    };

    const measure = (): void => {
      if (spyPausedRef.current) return;
      const sections = list.flatMap((slug) => {
        const el = document.getElementById(slug);
        return el ? [{ slug, top: el.getBoundingClientRect().top, el }] : [];
      });
      if (sections.length === 0) return;
      setActiveSlug(pickActiveAward(sections, spyOffset(sections[0].el)));
    };
    measureRef.current = measure;

    /*
     * Measure on every scroll frame, not on observer crossings: a jump from one gap between cards to another
     * (scrollbar drag, scroll restoration) crosses nothing, and Chrome does not always fire `scrollend`.
     */
    let frame = 0;
    const scheduleMeasure = (): void => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    };

    // Hash first, so the first measurement already sees the section the hash scrolled to.
    activateFromHash();
    measure();
    window.addEventListener("hashchange", activateFromHash);
    window.addEventListener("scroll", scheduleMeasure, { passive: true });
    window.addEventListener("resize", scheduleMeasure);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", activateFromHash);
      window.removeEventListener("scroll", scheduleMeasure);
      window.removeEventListener("resize", scheduleMeasure);
      measureRef.current = () => {};
      cancelSettleRef.current?.();
    };
  }, [slugKey]);

  const select = useCallback((slug: AwardSlug): void => {
    cancelSettleRef.current?.();
    setActiveSlug(slug);
    // replaceState, not pushState: clicking through the nav must not fill the back stack.
    window.history.replaceState(null, "", `#${slug}`);

    spyPausedRef.current = true;
    const settle = (): void => {
      window.clearTimeout(timer);
      window.removeEventListener("scrollend", onScrollEnd);
      spyPausedRef.current = false;
      cancelSettleRef.current = null;
      // Measure now: a smooth scroll the user interrupted ends on the card actually in view.
      measureRef.current();
    };
    // The first `scrollend` can belong to the scroll this click interrupted (a quick second click): only one
    // that leaves the target at rest ends the pause; otherwise the fallback timer does.
    const onScrollEnd = (): void => {
      if (isAtRest(slug)) settle();
    };
    const timer = window.setTimeout(settle, SCROLL_SETTLE_FALLBACK_MS);
    window.addEventListener("scrollend", onScrollEnd);
    cancelSettleRef.current = settle;

    scrollToSection(slug, prefersReducedMotion() ? "instant" : "smooth");
  }, []);

  return { activeSlug, select };
}
