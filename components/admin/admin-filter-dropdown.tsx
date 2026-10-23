"use client";

import { useCallback, useId, useRef, useState, type KeyboardEvent } from "react";
import { useDismissable } from "@/components/site-shell/use-dismissable";
import { FOCUS_ON_GREY } from "./admin-class-names";
import { IconDropdownArrow } from "./admin-icons";

export type AdminFilterOption = { value: string; label: string };

type Props = {
  /** `unit` | `level` | `role`: the suffix of every data-testid of this dropdown (`admin-filter-<name>...`). */
  name: string;
  /** Visible label above the field (Figma "Unit" / "Level" / "Role"). */
  label: string;
  placeholder: string;
  listLabel: string;
  /** The "all" option first (value `all`), then the real ones. */
  options: readonly AdminFilterOption[];
  /** Selected option value, or null when the filter is off. */
  value: string | null;
  /** `null` = the "all" option, i.e. clear this filter. */
  onChange: (value: string | null) => void;
  /** Width classes of the field (Figma: Unit 259, Level 136 (min, hugs its text), Role 123; the placeholder fills 16 + text + 24 + 8 exactly, so the text clips, never ellipsizes). */
  widthClass: string;
};

const OPTION =
  "flex min-h-11 w-full cursor-pointer items-center rounded px-3 text-left text-sm leading-5 font-medium whitespace-nowrap text-white outline-none hover:bg-[rgb(255_234_158/0.1)] focus-visible:bg-[rgb(255_234_158/0.1)] aria-selected:bg-[rgb(255_234_158/0.1)] aria-selected:text-login-accent motion-safe:transition-colors motion-safe:duration-200";

/*
 * Filter field of Figma 773:26408: white 48px box, 1px #2E3940 border, 16px grey placeholder (the chosen option label once set),
 * black drop-down triangle on the right. Opens a listbox (Figma frames hb4kPwSKkk / GLgos3fOmz / eFStQCJZaQ have no spec: the
 * list reuses the Kudos filter list look). Arrow keys / Home / End move between options (roving tabindex), Escape closes and
 * returns focus to the field. Choosing writes nothing itself: the parent owns the URL.
 */
export function AdminFilterDropdown({ name, label, placeholder, listLabel, options, value, onChange, widthClass }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const labelId = useId();
  const selectedValue = value ?? "all";
  const selected = options.find((option) => option.value === value);
  const tabStop = active ?? selectedValue;

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  }, []);
  useDismissable(open, rootRef, close);

  const optionButtons = () => Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? []);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (!next) return;
    setActive(null);
    // Focus lands once the list is mounted: the selected option, else the first one.
    requestAnimationFrame(() => {
      const items = optionButtons();
      (items.find((item) => item.getAttribute("aria-selected") === "true") ?? items[0])?.focus();
    });
  }

  function choose(optionValue: string) {
    close(true);
    onChange(optionValue === "all" ? null : optionValue);
  }

  function onListKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const items = optionButtons();
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    const target =
      event.key === "ArrowDown" ? items[(at + 1) % items.length]
      : event.key === "ArrowUp" ? items[(at - 1 + items.length) % items.length]
      : event.key === "Home" ? items[0]
      : event.key === "End" ? items[items.length - 1]
      : undefined;
    if (!target) return;
    event.preventDefault();
    target.focus();
  }

  return (
    <div className={`flex flex-col ${widthClass}`}>
      {/* mm:773:26411 label */}
      <span id={labelId} className="mb-0.5 text-base leading-6 font-medium text-login-bg">
        {label}
      </span>
      <div ref={rootRef} className="relative">
        <button
          ref={buttonRef}
          type="button"
          data-testid={`admin-filter-${name}`}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-labelledby={`${labelId} ${listId}-trigger`}
          id={`${listId}-trigger`}
          onClick={toggle}
          className={`flex h-12 w-full min-w-11 cursor-pointer items-center justify-between rounded border border-login-divider bg-white pr-2 pl-4 text-left text-sm leading-5 font-medium tracking-[0.1px] motion-safe:transition-colors motion-safe:duration-200 hover:bg-white/90 ${selected ? "text-login-bg" : "text-[#999]"} ${FOCUS_ON_GREY}`}
        >
          <span className="min-w-0 overflow-hidden text-clip whitespace-nowrap">{selected?.label ?? placeholder}</span>
          <IconDropdownArrow className={`shrink-0 text-black motion-safe:transition-transform motion-safe:duration-200 ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <div
            ref={listRef}
            id={listId}
            role="listbox"
            data-testid={`admin-filter-${name}-listbox`}
            aria-label={listLabel}
            onKeyDown={onListKeyDown}
            className="absolute top-full left-0 z-40 mt-2 max-h-[348px] min-w-full max-w-[calc(100vw_-_2rem)] overflow-y-auto rounded-lg border border-home-border bg-kudos-panel p-1.5"
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                data-testid={`admin-filter-${name}-option-${option.value}`}
                aria-selected={option.value === selectedValue}
                tabIndex={option.value === tabStop ? 0 : -1}
                onFocus={() => setActive(option.value)}
                onClick={() => choose(option.value)}
                className={OPTION}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
