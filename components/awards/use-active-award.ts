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

/*
 * Scroll-spy line = where a section's top lands after scrollIntoView, i.e. its scroll-margin-top, which the
 * sections set to clear whichever sticky bars apply at the current breakpoint (chip bar below lg, header from lg).
 * Reading it from the section keeps the spy in step with the real layout instead of a magic number.
 */
function spyOffset(section: Element): number {
  return (parseFloat(getComputedStyle(section).scrollMarginTop) || 0) + SPY_GAP_PX;
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

    let observer: IntersectionObserver | null = null;
    /*
     * A 1px band along the spy line: a section enters/leaves it exactly when its edge crosses the line,
     * which is the only moment the active item can change. The callback just re-measures.
     */
    const observe = (): void => {
      observer?.disconnect();
      const first = document.getElementById(list[0]);
      const line = Math.round(first ? spyOffset(first) : SPY_GAP_PX);
      const bottomInset = Math.max(0, window.innerHeight - line - 1);
      observer = new IntersectionObserver(measure, { rootMargin: `-${line}px 0px -${bottomInset}px 0px` });
      for (const slug of list) {
        const el = document.getElementById(slug);
        if (el) observer.observe(el);
      }
    };

    // Hash first: scrolling before the observer exists makes its initial measurement agree with the hash.
    activateFromHash();
    observe();
    window.addEventListener("hashchange", activateFromHash);
    window.addEventListener("resize", observe);

    return () => {
      observer?.disconnect();
      window.removeEventListener("hashchange", activateFromHash);
      window.removeEventListener("resize", observe);
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
      window.removeEventListener("scrollend", settle);
      spyPausedRef.current = false;
      cancelSettleRef.current = null;
    };
    const timer = window.setTimeout(settle, SCROLL_SETTLE_FALLBACK_MS);
    window.addEventListener("scrollend", settle, { once: true });
    cancelSettleRef.current = settle;

    scrollToSection(slug, prefersReducedMotion() ? "instant" : "smooth");
  }, []);

  return { activeSlug, select };
}
