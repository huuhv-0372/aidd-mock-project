/* Class strings shared by several homepage components (DRY, no behaviour). */

/* Figma text-shadow on hover/active nav labels (0 4px 4px #00000040, 0 0 6px #FAE287).
 * Variant-prefixed classes must stay literal strings so Tailwind can see them. */
export const GLOW_ON_HOVER = "hover:[text-shadow:0_4px_4px_rgb(0_0_0/0.25),0_0_6px_#fae287]";
export const GLOW_WHEN_CURRENT =
  "aria-[current=page]:[text-shadow:0_4px_4px_rgb(0_0_0/0.25),0_0_6px_#fae287]";

/** Figma elevation of the widget button and award tiles. */
export const GLOW_SHADOW = "shadow-[0_4px_4px_rgb(0_0_0/0.25),0_0_6px_#fae287]";

/** Hover state of the gold primary CTAs (hero "ABOUT AWARDS", kudos "Chi tiết"). */
export const PRIMARY_CTA_HOVER =
  "hover:bg-[#fff3c4] hover:shadow-[0_4px_4px_rgb(0_0_0/0.25),0_0_6px_#fae287]";

export const FOCUS_RING =
  "outline-offset-2 focus-visible:outline-2 focus-visible:outline-login-accent";

/** Row inside the account menu (Profile link and the Sign out submit button). */
export const MENU_ITEM =
  "flex min-h-11 w-full cursor-pointer items-center px-4 text-left text-base leading-6 font-bold tracking-[0.15px] text-white outline-none hover:bg-white/10 focus-visible:bg-white/10 focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-login-accent motion-safe:transition-colors motion-safe:duration-200";

/** Floating panel under a header button (account menu, notification panel). */
export const HEADER_PANEL =
  "absolute top-full right-0 z-40 mt-2 min-w-48 overflow-hidden rounded border border-login-divider bg-login-bg py-1 font-montserrat";

/** 40px icon button of the header (bell, profile); 44px touch target below lg. */
export const HEADER_ICON_BUTTON =
  "flex size-11 cursor-pointer items-center justify-center rounded text-white hover:bg-white/10 aria-expanded:bg-white/10 lg:size-10 motion-safe:transition-colors motion-safe:duration-200";
