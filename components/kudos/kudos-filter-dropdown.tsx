"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useId, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { FOCUS_RING } from "@/components/site-shell/shell-class-names";
import { useDismissable } from "@/components/site-shell/use-dismissable";
import { buildKudosFilterHref } from "@/lib/kudos/kudos-filter-href";
import type { KudosFilters } from "@/lib/validation/kudos";

export type KudosFilterOption = { value: string; label: string };

type Props = {
  /** URL parameter this dropdown drives: `?hashtag=` or `?department=`. */
  param: "hashtag" | "department";
  /** Trigger text and accessible name ("Hashtag", "Phòng ban"). */
  label: string;
  /** Accessible name of the option list. */
  listLabel: string;
  options: readonly KudosFilterOption[];
  filters: KudosFilters;
  /** Decorative prefix shown before each label but kept out of the accessible name ("#"). */
  optionPrefix?: string;
};

const OPTION =
  "flex min-h-14 w-full cursor-pointer items-center rounded px-4 text-left text-base leading-6 font-bold tracking-[0.15px] whitespace-nowrap text-white outline-none hover:bg-[rgb(255_234_158/0.1)] focus-visible:bg-[rgb(255_234_158/0.1)] aria-selected:bg-[rgb(255_234_158/0.1)] aria-selected:[text-shadow:0_4px_4px_rgb(0_0_0/0.25),0_0_6px_#fae287] motion-safe:transition-colors motion-safe:duration-200";

/*
 * Filter button + listbox (Figma B.1.1 / B.1.2 and the dropdown frames JWpsISMAaM / WXK5AYB_rG). Choosing an option
 * writes it to the URL (`buildKudosFilterHref`), choosing the selected one clears it; the server re-renders Highlight
 * and All Kudos from the new URL. Arrow keys / Home / End move between options (roving tabindex: Tab leaves the list),
 * Escape closes and returns focus to the button.
 */
export function KudosFilterDropdown({ param, label, listLabel, options, filters, optionPrefix }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  // Roving tabindex: the focused option is the list's single Tab stop (selected one, else the first, until focus moves).
  const [active, setActive] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = filters[param];
  const tabStop = active ?? selected ?? options[0]?.value;

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  }, []);
  useDismissable(open, rootRef, close);

  const optionButtons = () => Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? []);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      setActive(null);
      // Focus lands once the list is mounted: the selected option, else the first one.
      requestAnimationFrame(() => {
        const items = optionButtons();
        (items.find((item) => item.getAttribute("aria-selected") === "true") ?? items[0])?.focus();
      });
    }
  }

  function choose(value: string) {
    close(true);
    startTransition(() => router.push(buildKudosFilterHref(filters, { [param]: value === selected ? null : value }), { scroll: false }));
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
    <div ref={rootRef} className={`relative ${pending ? "opacity-70" : ""}`} aria-busy={pending}>
      {/* mm:2940:13459 / mm:2940:13460 */}
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        data-active={selected ? "" : undefined}
        onClick={toggle}
        className={`flex min-h-14 min-w-11 cursor-pointer items-center gap-2 rounded border border-home-border bg-[rgb(255_234_158/0.1)] p-4 text-base leading-6 font-bold tracking-[0.15px] text-white hover:bg-[rgb(255_234_158/0.2)] aria-expanded:bg-[rgb(255_234_158/0.2)] data-active:border-login-accent motion-safe:transition-colors motion-safe:duration-200 ${FOCUS_RING}`}
      >
        {label}
        {/* mm:I2940:13459;186:2761 */}
        <Image
          src="/images/kudos/icon-chevron-down.svg"
          alt=""
          width={24}
          height={24}
          className={`motion-safe:transition-transform motion-safe:duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={listLabel}
          onKeyDown={onListKeyDown}
          className={`absolute top-full z-40 mt-2 max-h-[348px] min-w-full max-w-[calc(100vw_-_2rem)] overflow-y-auto rounded-lg border border-home-border bg-kudos-panel p-1.5 ${param === "department" ? "right-0" : "left-0"}`}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === selected}
              tabIndex={option.value === tabStop ? 0 : -1}
              onFocus={() => setActive(option.value)}
              onClick={() => choose(option.value)}
              className={OPTION}
            >
              {optionPrefix && <span aria-hidden>{optionPrefix}</span>}
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
