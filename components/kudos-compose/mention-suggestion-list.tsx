import type { CSSProperties } from "react";
import type { SunnerOption } from "./write-kudo-types";

type Props = {
  /** The open "@" popup, or null when no suggestion is active. */
  popup: { items: SunnerOption[]; loading: boolean; style: CSSProperties } | null;
  active: number;
  label: string;
  noResultLabel: string;
  onPick: (item: SunnerOption) => void;
  onHover: (index: number) => void;
};

// Same dropdown look as the hashtag list (p9zO-c4a4x): #00070C panel, 40px rows, white bold text.
const PANEL = "absolute z-30 w-64 rounded-lg border border-home-border bg-kudos-panel p-1.5";
const ROW = "flex min-h-11 w-full items-center rounded-sm px-4 text-left text-base leading-6 font-bold tracking-[0.15px] md:min-h-10";
const OPTION = `${ROW} cursor-pointer text-white aria-selected:bg-[rgb(255_234_158/0.2)]`;

/*
 * "@ + tên" suggestions, drawn under the caret inside the modal. Rows keep editor focus: mousedown is cancelled.
 * A finished search with no match shows a muted status row instead (same copy as Người nhận): not an option, announced
 * politely through a live region that stays mounted so screen readers register it before its text appears.
 */
export function MentionSuggestionList({ popup, active, label, noResultLabel, onPick, onHover }: Props) {
  const items = popup?.items ?? [];
  const noResult = Boolean(popup && !popup.loading && items.length === 0);
  return (
    <>
      {popup && items.length > 0 && (
        <ul
          role="listbox"
          data-testid="mention-list"
          aria-label={label}
          style={popup.style}
          className={`${PANEL} max-h-60 overflow-y-auto`}
        >
          {items.map((item, index) => (
            <li
              key={item.id}
              role="option"
              aria-selected={index === active}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => onHover(index)}
              onClick={() => onPick(item)}
              className={OPTION}
            >
              {item.full_name}
            </li>
          ))}
        </ul>
      )}
      <div role="status" style={noResult ? popup?.style : undefined} className={noResult ? PANEL : "sr-only"}>
        {noResult && <p className={`${ROW} text-kudos-muted`}>{noResultLabel}</p>}
      </div>
    </>
  );
}
