import type { Locale } from "@/lib/i18n/locales";

export type KudoHeartsCopy = {
  /** Accessible name template, `{count}` is replaced by the number: "{count} lượt thả tim". */
  label: string;
};

/*
 * Heart count of a Kudo card (Figma Hearts: count 24/32 + 32px heart). Display only in #11: the heart is red when the
 * viewer liked the Kudo and grey otherwise; the toggle belongs to #13, which turns this span into a button.
 * `data-own` marks the viewer's own Kudo (#13 disables the heart there).
 */
export function KudoHearts({
  count,
  liked,
  own,
  locale,
  copy,
}: {
  count: number;
  liked: boolean;
  own: boolean;
  locale: Locale;
  copy: KudoHeartsCopy;
}) {
  return (
    // mm:I2940:13465;335:9462
    <span
      data-testid="kudo-hearts"
      data-liked={liked}
      data-own={own}
      aria-label={copy.label.replace("{count}", String(count))}
      role="img"
      className="inline-flex items-center gap-1"
    >
      {/* mm:I2940:13465;335:9463 */}
      <span aria-hidden className="text-2xl leading-8 font-bold text-login-bg">
        {new Intl.NumberFormat(locale === "en" ? "en-US" : "vi-VN").format(count)}
      </span>
      {/* mm:I2940:13465;335:9464 */}
      <span aria-hidden className={`kudos-icon kudos-icon-heart size-8 ${liked ? "text-kudos-heart" : "text-kudos-muted"}`} />
    </span>
  );
}
