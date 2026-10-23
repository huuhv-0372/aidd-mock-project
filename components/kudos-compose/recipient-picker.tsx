"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { ChevronDownIcon } from "./compose-icons";
import { FieldLabel } from "./compose-field-label";
import { ERROR_FLOAT, INPUT } from "./compose-field-styles";
import { RecipientOptionContent } from "./recipient-option-content";
import type { WriteKudoCopy } from "./write-kudo-copy";
import type { RecipientChoice, SunnerOption, WriteKudoActions } from "./write-kudo-types";

type Props = {
  copy: WriteKudoCopy;
  searchSunners: WriteKudoActions["searchSunners"];
  value: RecipientChoice | null;
  /** Text shown on mount for a recipient chosen beforehand: no search runs and the list stays closed. */
  initialText?: string;
  onChange: (value: RecipientChoice | null) => void;
  /** Leaving the field: the form decides whether to show the required error. */
  onBlur: () => void;
  /** Whether the input holds text (after trim): the form words the required error differently when it does. */
  onTypedChange: (typed: boolean) => void;
  error: string | null;
  /** Edit mode: the recipient of a sent Kudo cannot change. The field shows the name read-only, with no suggestions and no arrow. */
  locked?: boolean;
};

const SEARCH_DELAY_MS = 150;

// Dropdown panel reuses the hashtag dropdown look (p9zO-c4a4x): #00070C panel, white bold text. Rows carry avatar + name + department.
const PANEL = "absolute top-full right-0 left-0 z-20 mt-1 rounded-lg border border-home-border bg-kudos-panel p-1.5";
const OPTION =
  "flex min-h-11 md:min-h-10 w-full cursor-pointer items-center gap-3 rounded-sm py-2 pr-4 pl-2.5 text-left text-base leading-6 font-bold tracking-[0.15px] text-white hover:bg-[rgb(255_234_158/0.1)] aria-selected:bg-[rgb(255_234_158/0.2)]";

/*
 * Người nhận (B / B.1 / B.2, mm:520:9871): autocomplete over Sunners. Typing (after trim) asks the server action for
 * <=10 matches by name or email ("@" first: by name only, as in the editor); choosing one fills the field with the full name and hands {id, name} to the form.
 * Editing the text afterwards drops the choice again, so the form only ever holds a recipient the user actually picked.
 * No match (or a failed search) shows a muted status row in the dropdown: not an option, announced politely.
 */
export function RecipientPicker({ copy, searchSunners, value, initialText = "", onChange, onBlur, onTypedChange, error, locked = false }: Props) {
  const [text, setText] = useState(initialText);
  const [items, setItems] = useState<SunnerOption[]>([]);
  const [open, setOpen] = useState(false);
  const [noResult, setNoResult] = useState(false);
  const [active, setActive] = useState(-1);
  const latest = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inputId = useId();
  const listId = useId();
  const errorId = useId();

  useEffect(() => () => clearTimeout(timer.current), []);

  function onInput(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    const query = next.trim();
    setText(next);
    onTypedChange(query.length > 0);
    if (value) onChange(null);
    clearTimeout(timer.current);
    latest.current += 1;
    const mine = latest.current;
    setItems([]);
    setActive(-1);
    setOpen(false);
    setNoResult(false);
    if (!query) return;
    // "@ + tên": a leading "@" searches names only, without the "@" ("@" alone lists the first Sunners).
    const nameOnly = query.startsWith("@");
    const search = nameOnly ? query.slice(1).trim() : query;
    timer.current = setTimeout(async () => {
      let result: Awaited<ReturnType<typeof searchSunners>>;
      try {
        result = await searchSunners(search, { nameOnly });
      } catch (err) {
        console.error("[kudos] recipient search failed", err); // shown as the no-result row; typing again retries
        result = { ok: false };
      }
      if (mine !== latest.current) return; // a newer keystroke or a pick superseded this answer
      const found = result.ok ? result.items.filter((item) => item.full_name) : [];
      setItems(found);
      setOpen(found.length > 0);
      setNoResult(found.length === 0);
    }, SEARCH_DELAY_MS);
  }

  function pick(item: SunnerOption) {
    latest.current += 1;
    clearTimeout(timer.current);
    const name = item.full_name ?? "";
    setText(name);
    setItems([]);
    setOpen(false);
    setNoResult(false);
    setActive(-1);
    onChange({ id: item.id, name });
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (event.key === "Escape" && noResult) {
        event.preventDefault(); // closes the status row only, not the whole modal
        setNoResult(false);
      }
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((at) => (at + step + items.length) % items.length);
    } else if (event.key === "Enter" && active >= 0) {
      event.preventDefault();
      pick(items[active]);
    } else if (event.key === "Escape") {
      event.preventDefault(); // closes the list only, not the whole modal
      setOpen(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      {/* mm:I520:11647;520:9872 */}
      <FieldLabel htmlFor={inputId} required className="sm:min-w-[146px]">
        {copy.recipient.label}
      </FieldLabel>
      <div className="relative min-w-0 flex-1">
        {/* mm:I520:11647;520:9873 */}
        <input
          id={inputId}
          type="text"
          role="combobox"
          autoComplete="off"
          value={text}
          readOnly={locked}
          placeholder={copy.recipient.placeholder}
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={onInput}
          onKeyDown={onKeyDown}
          onBlur={() => {
            // Drop a search still in its debounce or in flight: its answer must not reopen the list after focus left.
            clearTimeout(timer.current);
            latest.current += 1;
            setOpen(false);
            setNoResult(false);
            onBlur();
          }}
          className={`${INPUT} ${locked ? "cursor-default" : "pr-14"}`}
        />
        {/* mm:I520:11647;520:9873;186:2761 */}
        {!locked && (
          <span className="pointer-events-none absolute top-1/2 right-6 -translate-y-1/2 text-login-bg">
            <ChevronDownIcon />
          </span>
        )}
        {open && (
          <ul
            id={listId}
            role="listbox"
            aria-label={copy.recipient.listLabel}
            className={`${PANEL} max-h-60 overflow-y-auto`}
          >
            {items.map((item, index) => (
              <li
                key={item.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActive(index)}
                onClick={() => pick(item)}
                className={OPTION}
              >
                <RecipientOptionContent item={item} />
              </li>
            ))}
          </ul>
        )}
        {/* Always mounted so screen readers register the live region before its text appears. */}
        <div role="status" className={noResult ? PANEL : "sr-only"}>
          {noResult && <p className="flex min-h-11 items-center px-4 text-base leading-6 font-bold tracking-[0.15px] text-kudos-muted md:min-h-10">{copy.recipient.noResult}</p>}
        </div>
        {error && (
          <p id={errorId} data-testid="error-recipient" className={ERROR_FLOAT}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
