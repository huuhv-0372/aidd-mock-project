"use client";

import { FOCUS_RING } from "@/components/site-shell/shell-class-names";
import type { Locale } from "@/lib/i18n/locales";
import { useKudoHeart } from "./kudo-hearts-store";

export type KudoHeartsCopy = {
  /** Accessible name template, `{count}` is replaced by the number: "{count} lượt thả tim". */
  label: string;
  /** Toast shown when the server refuses the like and the heart is put back. */
  error: string; // not from Figma
};

/*
 * Heart of a Kudo card (Figma Hearts 101x32: count 24/32 bold + 32px heart), the toggle of #13. Red when the viewer liked
 * the Kudo, grey otherwise (the only two Figma states, so own / pending only change the cursor). State comes from the shared
 * store (`useKudoHeart`) so Highlight and feed copies of one Kudo stay in step. The viewer's own Kudo is `disabled`; while
 * the answer is pending the button is only `aria-disabled` (the store drops the extra clicks), so keyboard focus stays on it.
 * `-my-1.5 py-1.5` grows the touch target to 44px without moving the layout.
 */
export function KudoHearts({
  kudoId,
  count: serverCount,
  liked: serverLiked,
  own,
  locale,
  copy,
}: {
  kudoId: string;
  count: number;
  liked: boolean;
  own: boolean;
  locale: Locale;
  copy: KudoHeartsCopy;
}) {
  const { liked, count, pending, toggle } = useKudoHeart(kudoId, { liked: serverLiked, count: serverCount });
  return (
    // mm:I2940:13465;335:9462
    <button
      type="button"
      data-testid="kudo-hearts"
      data-liked={liked}
      data-own={own}
      aria-pressed={liked}
      aria-label={copy.label.replace("{count}", String(count))}
      disabled={own}
      aria-disabled={pending || undefined}
      onClick={() => toggle(copy.error)}
      className={`-my-1.5 inline-flex min-h-11 min-w-11 cursor-pointer items-center gap-1 rounded py-1.5 disabled:cursor-not-allowed aria-disabled:cursor-not-allowed ${FOCUS_RING}`}
    >
      {/* mm:I2940:13465;335:9463 */}
      <span aria-hidden className="text-2xl leading-8 font-bold text-login-bg">
        {new Intl.NumberFormat(locale === "en" ? "en-US" : "vi-VN").format(count)}
      </span>
      {/* mm:I2940:13465;335:9464 */}
      <span aria-hidden className={`kudos-icon kudos-icon-heart size-8 ${liked ? "text-kudos-heart" : "text-kudos-muted"}`} />
    </button>
  );
}
