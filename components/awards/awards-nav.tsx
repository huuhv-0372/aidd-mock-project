"use client";

import { useEffect, useMemo, useRef } from "react";
import { FOCUS_RING, GLOW_ON_HOVER } from "@/components/site-shell/shell-class-names";
import type { AwardSlug } from "@/lib/navigation/routes";
import { IconTarget } from "./awards-icons";
import { useActiveAward } from "./use-active-award";

type AwardNavItem = { slug: AwardSlug; label: string };

/* Figma active state: gold label, glow, gold underline. Variant classes must stay literal for Tailwind. */
const ACTIVE =
  "aria-[current=true]:border-login-accent aria-[current=true]:text-login-accent aria-[current=true]:[text-shadow:0_4px_4px_rgb(0_0_0/0.25),0_0_6px_#fae287]";

const ITEM = `flex min-h-11 w-fit max-w-full shrink-0 items-center gap-1 rounded border-b border-transparent px-4 py-2 text-sm leading-5 font-bold tracking-[0.25px] whitespace-nowrap text-white hover:bg-[rgb(255_234_158/0.1)] ${GLOW_ON_HOVER} ${ACTIVE} lg:p-4 lg:whitespace-normal motion-safe:transition-colors motion-safe:duration-200 ${FOCUS_RING}`;

/*
 * Category menu (Figma C). Below lg it is a horizontally scrolling chip bar that sticks to the top of
 * the viewport (the header is not sticky there); from lg it is the left column and sticks under the
 * sticky header (top-28 = header 72px + gap, same value as the sections' scroll-mt).
 */
export function AwardsNav({ items, ariaLabel }: { items: readonly AwardNavItem[]; ariaLabel: string }) {
  const slugs = useMemo(() => items.map((item) => item.slug), [items]);
  const { activeSlug, select } = useActiveAward(slugs);
  const navRef = useRef<HTMLElement>(null);

  // Chip bar (below lg) scrolls sideways: keep the active chip in view. Only the bar scrolls, never the
  // document (scrollIntoView would also move the page and cancel the smooth scroll `select` started).
  useEffect(() => {
    const nav = navRef.current;
    // From lg the nav is a plain column (overflow visible): nothing to scroll there.
    if (!nav || getComputedStyle(nav).overflowX === "visible" || nav.scrollWidth <= nav.clientWidth) return;
    const chip = nav.querySelector<HTMLElement>('[aria-current="true"]');
    if (!chip) return;
    nav.scrollTo({ left: chip.offsetLeft - (nav.clientWidth - chip.offsetWidth) / 2 });
  }, [activeSlug]);

  return (
    // mm:313:8459
    <nav
      ref={navRef}
      aria-label={ariaLabel}
      data-testid="awards-nav"
      className="sticky top-0 z-20 -mx-4 flex gap-2 overflow-x-auto bg-login-bg/90 px-4 backdrop-blur [scrollbar-width:none] md:-mx-12 md:px-12 lg:top-28 lg:mx-0 lg:w-[178px] lg:shrink-0 lg:flex-col lg:gap-4 lg:self-start lg:overflow-visible lg:bg-transparent lg:px-0 lg:backdrop-blur-none"
    >
      {items.map(({ slug, label }) => (
        <a
          key={slug}
          href={`#${slug}`}
          data-testid="awards-nav-item"
          aria-current={slug === activeSlug ? "true" : undefined}
          onClick={(event) => {
            event.preventDefault();
            select(slug);
          }}
          className={ITEM}
        >
          {/* mm:I313:8460;186:1745 */}
          <IconTarget className="size-6 shrink-0" />
          {/* mm:I313:8460;186:1502 */}
          <span>{label}</span>
        </a>
      ))}
    </nav>
  );
}
