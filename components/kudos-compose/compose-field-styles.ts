// Class strings shared by the Viết Kudo fields (Figma ihQ26W78P2): ink #00101A = login-bg, border #998C5F = home-border,
// gold #FFEA9E = login-accent, grey #999 = kudos-muted. Error red is the required-asterisk red of the frame (#CF1322).

/** Gold outlines vanish on the cream panel, so focus uses the ink color here. */
export const FOCUS = "outline-offset-2 focus-visible:outline-2 focus-visible:outline-login-bg";

/** White 56px field (Figma "text field"): recipient, Danh hiệu, alias, Add link inputs. Figma strokes are inside the box, so 24px padding = 23px + the 1px border. */
export const INPUT =
  "h-14 w-full min-w-0 rounded-lg border border-home-border bg-white px-[23px] py-4 text-base leading-6 font-bold tracking-[0.15px] text-login-bg placeholder:text-kudos-muted outline-none focus-visible:border-login-bg focus-visible:ring-1 focus-visible:ring-login-bg aria-invalid:border-[#cf1322] aria-invalid:ring-1 aria-invalid:ring-[#cf1322] motion-safe:transition-colors motion-safe:duration-200";

/** Per-field error line under a field (in flow: Add link rows, footer). */
export const ERROR_TEXT = "mt-1 text-sm leading-5 font-bold tracking-[0.15px] text-[#cf1322]";

/**
 * Same line, taken out of the flow: it sits in the gap under the field (24-32px) so that an error appearing on blur never
 * shifts the control the user is about to click (mousedown blurs the field, the layout would move before mouseup).
 * The parent must be `relative`.
 */
export const ERROR_FLOAT = "absolute top-full left-0 mt-0.5 max-w-full text-sm leading-5 font-bold tracking-[0.15px] text-[#cf1322]";

/** 22px bold row label ("Người nhận", "Hashtag", "Image"...). */
export const ROW_LABEL = "text-[22px] leading-7 font-bold text-login-bg";

/** Hủy: 60px outlined secondary button (Figma D.1 / H.1): padding 16/40 measured to the outer edge (border drawn inside) -> 39px + 1px border. */
export const BUTTON_SECONDARY =
  "flex min-h-[60px] min-w-11 cursor-pointer items-center justify-center gap-2 rounded border border-home-border bg-[rgb(255_234_158/0.1)] px-[23px] py-4 text-base leading-6 font-bold tracking-[0.15px] text-login-bg hover:bg-[rgb(255_234_158/0.4)] disabled:cursor-not-allowed disabled:opacity-60 sm:px-[39px] motion-safe:transition-colors motion-safe:duration-200";

/** Gửi / Lưu: gold primary button (Figma D.2 / H.2). */
export const BUTTON_PRIMARY =
  "flex min-h-[60px] min-w-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-login-accent p-4 text-[22px] leading-7 font-bold text-login-bg hover:bg-[#fff3c4] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-login-accent motion-safe:transition-colors motion-safe:duration-200";

/**
 * Native <dialog> panel: cream card, 24px radius, dimmed #00101A backdrop (Figma Mask 520:11646). The panel itself is
 * capped at the screen height and clips to its rounded border; only its child scrolls (`open:flex` lets that child shrink).
 * The 12px vertical padding keeps the scrollbar off the rounded corners.
 */
export const DIALOG_PANEL =
  "m-auto max-h-[calc(100dvh_-_2rem)] w-[min(752px,calc(100vw_-_1rem))] max-w-none overflow-hidden outline-none rounded-3xl border-0 bg-kudos-card px-0 py-3 text-login-bg backdrop:bg-login-bg/80 open:flex open:flex-col";

/**
 * Round red remove "x" (hashtag chip, image thumbnail). The <button> is the 44px touch target; the 20px Figma circle is the
 * inner span, so the visible size and the layout stay as designed: callers pull the button back with a -12px margin
 * (chip) or position it by the circle's center (thumbnail). Focus outlines the circle, not the invisible hit area.
 */
export const REMOVE_BUTTON = "group flex size-11 shrink-0 cursor-pointer items-center justify-center outline-none";
export const REMOVE_DOT =
  "flex size-5 items-center justify-center rounded-full bg-[#d4271d] text-white outline-offset-2 group-focus-visible:outline-2 group-focus-visible:outline-login-bg";
