import { formatKudoTime } from "@/lib/kudos/format-kudo-time";
import type { SpotlightRecentKudo } from "@/lib/kudos/kudo-types";

type SpotlightTickerProps = {
  /** Newest first, as returned by `kudos_spotlight`. */
  items: SpotlightRecentKudo[];
  suffix: string;
  /** Shown when a recipient has no display name. */
  unknownName: string;
};

/** Fade ramp of the Figma lines, bottom (newest) to top: 1, 0.7, 0.5, 0.3, 0.1. */
const OPACITY_FROM_NEWEST = [1, 0.7, 0.5, 0.3, 0.1];

/** Figma shows `08:30PM`: the 12-hour clock of the Vietnam-time label from `formatKudoTime`. */
function tickerTime(iso: string): string {
  const label = formatKudoTime(iso);
  if (!label) return "";
  const hours = Number(label.slice(0, 2));
  const hour12 = String(hours % 12 || 12).padStart(2, "0");
  return `${hour12}:${label.slice(3, 5)}${hours >= 12 ? "PM" : "AM"}`;
}

/*
 * Figma B.7 bottom-left feed: the latest Kudos, oldest line on top fading in towards the newest.
 * Rows sit 19px apart, 14px bold Montserrat with the recipient name at 16px.
 */
export function SpotlightTicker({ items, suffix, unknownName }: SpotlightTickerProps) {
  const lines = items.slice(0, OPACITY_FROM_NEWEST.length).reverse();
  if (lines.length === 0) return null;
  return (
    <ul
      data-testid="spotlight-ticker"
      className="pointer-events-none absolute bottom-5 left-5 flex max-w-[calc(100%-6rem)] flex-col md:left-[49px]"
    >
      {lines.map((item, index) => (
        // mm:2940:14230
        <li
          key={`${item.created_at}-${index}`}
          className="truncate text-sm leading-[19px] font-bold tracking-[0.1px] whitespace-nowrap text-white"
          style={{ opacity: OPACITY_FROM_NEWEST[lines.length - 1 - index] }}
        >
          <span className="text-white/60">{tickerTime(item.created_at)}</span>{" "}
          <span className="text-base leading-[19px]">{item.recipient_name ?? unknownName}</span> {suffix}
        </li>
      ))}
    </ul>
  );
}
