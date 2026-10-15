"use client";

import Image from "next/image";
import { Children, useState, type ReactNode } from "react";
import { FOCUS_RING } from "@/components/site-shell/shell-class-names";

export type HighlightCarouselCopy = {
  regionLabel: string;
  /** Bottom controls (B.5): the names the page exposes as "Kudo trước" / "Kudo sau". */
  prev: string;
  next: string;
  /** Side arrows (B.2.1 / B.2.2). Not from Figma: distinct names so each control is unique for assistive tech. */
  slidePrev: string;
  slideNext: string;
};

const ARROW =
  "flex cursor-pointer items-center justify-center rounded text-white enabled:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 motion-safe:transition-colors motion-safe:duration-200";
const FADE = "pointer-events-none absolute inset-y-0 w-12 from-login-bg from-50% to-transparent lg:w-[400px]";
const SIDE_ARROW = `${ARROW} absolute top-1/2 hidden size-11 -translate-y-1/2 lg:flex lg:size-20 ${FOCUS_RING}`;

/*
 * Highlight carousel (Figma B.2 + B.5). Children are the server-rendered cards. The centre slide is raised,
 * the neighbours are dimmed and `inert` (no focus, no clicks, hidden from the a11y tree). The parent gives this
 * component a `key` built from the active filters, so a filter change remounts it back on slide 1.
 * Figma lays the cards out 96px right of the page centre at 1440 (the first card starts at x=0);
 * `--slide-shift` keeps that offset from lg up.
 */
export function HighlightCarousel({ children, copy }: { children: ReactNode; copy: HighlightCarouselCopy }) {
  const slides = Children.toArray(children);
  const total = slides.length;
  const [index, setIndex] = useState(0);
  const atStart = index === 0;
  const atEnd = index >= total - 1;
  const go = (delta: number) => setIndex((i) => Math.min(total - 1, Math.max(0, i + delta)));

  return (
    <div className="flex w-full flex-col gap-10" role="group" aria-roledescription="carousel" aria-label={copy.regionLabel}>
      <div className="relative overflow-hidden [--slide-gap:1.5rem] [--slide-shift:0px] [--slide-w:min(528px,calc(100vw_-_3rem))] lg:[--slide-shift:96px]">
        <div
          className="flex gap-6 pl-[calc(50%_-_var(--slide-w)/2_+_var(--slide-shift))] motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out motion-reduce:transition-none"
          style={{ transform: `translateX(calc(${index} * -1 * (var(--slide-w) + var(--slide-gap))))` }}
        >
          {slides.map((slide, i) => (
            <div
              key={i}
              data-testid="highlight-slide"
              aria-current={i === index ? "true" : undefined}
              inert={i !== index}
              className={`w-(--slide-w) shrink-0 motion-safe:transition-opacity motion-safe:duration-500 ${i === index ? "opacity-100" : "opacity-60"}`}
            >
              {slide}
            </div>
          ))}
        </div>
        {/* mm:2940:13469 and mm:2940:13467: edge fades; the 80px side arrows show from lg up */}
        <div className={`${FADE} left-0 bg-linear-to-r`} />
        <div className={`${FADE} right-0 bg-linear-to-l`} />
        <button type="button" aria-label={copy.slidePrev} disabled={atStart} onClick={() => go(-1)} className={`${SIDE_ARROW} lg:left-[80px]`}>
          {/* mm:I2940:13470;186:1420 */}
          <Image src="/images/kudos/icon-arrow-left.svg" alt="" width={60} height={60} className="size-[60px]" />
        </button>
        <button type="button" aria-label={copy.slideNext} disabled={atEnd} onClick={() => go(1)} className={`${SIDE_ARROW} lg:right-[140px]`}>
          {/* mm:I2940:13468;186:1420 */}
          <Image src="/images/kudos/icon-arrow-right.svg" alt="" width={60} height={60} className="size-[60px]" />
        </button>
      </div>
      {/* mm:2940:13471 */}
      <div className="flex items-center justify-center gap-8">
        {/* mm:2940:13472 */}
        <button type="button" aria-label={copy.prev} disabled={atStart} onClick={() => go(-1)} className={`${ARROW} size-12 ${FOCUS_RING}`}>
          <Image src="/images/kudos/icon-arrow-left.svg" alt="" width={28} height={28} />
        </button>
        {/* mm:2940:13473 */}
        <p data-testid="highlight-page" aria-live="polite" className="text-[28px] leading-9 font-bold text-kudos-muted">
          <span className="text-login-accent">{index + 1}</span>/{total}
        </p>
        {/* mm:2940:13474 */}
        <button type="button" aria-label={copy.next} disabled={atEnd} onClick={() => go(1)} className={`${ARROW} size-12 ${FOCUS_RING}`}>
          <Image src="/images/kudos/icon-arrow-right.svg" alt="" width={28} height={28} />
        </button>
      </div>
    </div>
  );
}
