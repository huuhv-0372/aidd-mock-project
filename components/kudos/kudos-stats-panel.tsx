import type { Locale } from "@/lib/i18n/locales";
import type { KudosMyStats } from "@/lib/kudos/kudo-types";
import { FOCUS_RING } from "@/components/site-shell/shell-class-names";
import { KudosEmptyState } from "./kudos-empty-state";

export type KudosStatsCopy = {
  /** Received, sent, hearts, boxes opened, boxes unopened (Figma D.1.2 to D.1.7). */
  labels: readonly [string, string, string, string, string];
  openBox: string;
  /** Generic text shown when the stats block failed to load. */
  error: string; // not from Figma
};

const ROW = "flex min-h-10 items-center justify-between gap-2";
const LABEL = "text-lg leading-7 font-bold text-white md:text-[22px]";
const VALUE = "text-[32px] leading-10 font-bold text-login-accent tabular-nums";

function StatRow({ label, value, locale, badge }: { label: string; value: number; locale: Locale; badge?: boolean }) {
  return (
    <div className={`${ROW} ${badge ? "md:gap-[3px]" : ""}`}>
      <dt className={`min-w-0 ${LABEL} ${badge ? "md:whitespace-nowrap" : ""}`}>{label}</dt>
      {/* Whitespace keeps the row's text readable as "label value" (copy/paste, text search); flex drops it visually. */}
      {" "}
      <dd className={`flex shrink-0 items-center ${badge ? "gap-1 md:w-[111px] md:justify-between" : "gap-1"}`}>
        {badge && (
          // mm:3241:14931 - flame art `image 35` (3241:14932) with the "x2" label on top.
          // The "x2" is a pseudo-element so it stays out of the row's text ("label value").
          <span
            aria-hidden
            className="relative inline-flex h-10 w-[34px] bg-[url(/images/kudos/icon-fire.png)] bg-contain bg-center bg-no-repeat after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:text-[17.5px] after:leading-none after:font-bold after:text-white after:[-webkit-text-stroke:1px_#000] after:content-['x2']"
          />
        )}
        <span className={VALUE}>{new Intl.NumberFormat(locale === "en" ? "en-US" : "vi-VN").format(value)}</span>
      </dd>{" "}
    </div>
  );
}

/*
 * Personal statistics (Figma D.1 `2940:13489`, 422px): five label + number rows, a divider between the hearts and
 * the Secret Box rows, and the "Mở Secret Box" button. The button is display-only for now (the Secret Box plan wires it):
 * `aria-disabled`, no handler, and it looks the same as an enabled button.
 */
export function KudosStatsPanel({ stats, locale, copy }: { stats: KudosMyStats | null; locale: Locale; copy: KudosStatsCopy }) {
  const [received, sent, hearts, opened, unopened] = copy.labels;
  return (
    // mm:2940:13489
    <div
      data-testid="kudos-stats"
      className="box-border flex w-full flex-col gap-4 rounded-[17px] border border-home-border bg-kudos-panel p-6 font-montserrat"
    >
      {stats ? (
        <>
          {/* mm:2940:13490 */}
          <div className="flex flex-col gap-4">
            <dl className="flex flex-col gap-4">
              {/* mm:2940:13491 */}
              <StatRow label={received} value={stats.received} locale={locale} />
              {/* mm:2940:13492 */}
              <StatRow label={sent} value={stats.sent} locale={locale} />
              {/* mm:3241:14882 */}
              <StatRow label={hearts} value={stats.hearts_received} locale={locale} badge />
            </dl>
            {/* mm:2940:13494 */}
            <div aria-hidden className="h-px w-full bg-login-divider" />
            <dl className="flex flex-col gap-4">
              {/* mm:2940:13495 */}
              <StatRow label={opened} value={stats.boxes_opened} locale={locale} />
              {/* mm:2940:13496 */}
              <StatRow label={unopened} value={stats.boxes_unopened} locale={locale} />
            </dl>
          </div>
          {/* mm:2940:13497 */}
          <button
            type="button"
            aria-disabled="true"
            className={`flex min-h-[60px] w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-login-accent p-4 text-lg leading-7 font-bold text-login-bg md:text-[22px] ${FOCUS_RING}`}
          >
            {copy.openBox}
            {/* mm:I2940:13497;186:1766 - placeholder glyph until the Figma export lands */}
            <span aria-hidden className="kudos-icon kudos-icon-gift size-6" />
          </button>
        </>
      ) : (
        <KudosEmptyState message={copy.error} className="py-4" />
      )}
    </div>
  );
}
