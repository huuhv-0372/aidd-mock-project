import { SUGGEST_OPTION, SUGGEST_PANEL } from "@/components/kudos-compose/compose-field-styles";
import { RecipientOptionContent } from "@/components/kudos-compose/recipient-option-content";
import type { SunnerOption } from "@/components/kudos-compose/write-kudo-types";

type Props = {
  listId: string;
  listLabel: string;
  items: SunnerOption[];
  open: boolean;
  active: number;
  /** Status line text for "no Sunner found" / the generic error; "" keeps the live region empty. */
  statusText: string;
  onHover: (index: number) => void;
  onPick: (item: SunnerOption) => void;
};

/** Option id used by the combobox `aria-activedescendant`. */
export const profileOptionId = (listId: string, index: number) => `${listId}-${index}`;

/*
 * Dropdown under the profile search pill (hashtag dropdown look p9zO-c4a4x via SUGGEST_PANEL / SUGGEST_OPTION): up to
 * 10 rows with avatar + name + department, no email. Presentational only. The status row is always mounted so screen
 * readers register the live region before its text appears; it is `sr-only` while empty.
 */
export function ProfileSearchResults({ listId, listLabel, items, open, active, statusText, onHover, onPick }: Props) {
  return (
    <>
      {open && items.length > 0 && (
        <ul id={listId} role="listbox" aria-label={listLabel} className={`${SUGGEST_PANEL} max-h-[440px] overflow-y-auto`}>
          {items.map((item, index) => (
            <li
              key={item.id}
              id={profileOptionId(listId, index)}
              role="option"
              aria-selected={index === active}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => onHover(index)}
              onClick={() => onPick(item)}
              className={SUGGEST_OPTION}
            >
              <RecipientOptionContent item={item} />
            </li>
          ))}
        </ul>
      )}
      <div role="status" className={statusText ? SUGGEST_PANEL : "sr-only"}>
        {statusText && (
          <p className="flex min-h-11 items-center px-4 text-base leading-6 font-bold tracking-[0.15px] text-kudos-muted md:min-h-10">
            {statusText}
          </p>
        )}
      </div>
    </>
  );
}
