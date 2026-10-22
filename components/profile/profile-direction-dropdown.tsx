"use client";

import Image from "next/image";
import { useCallback, useId, useRef, useState, type KeyboardEvent } from "react";
import { FOCUS_RING } from "@/components/site-shell/shell-class-names";
import { useDismissable } from "@/components/site-shell/use-dismissable";
import type { ProfileKudosDirection } from "@/lib/profiles/profile-types";

export type DirectionOption = { value: ProfileKudosDirection; label: string };

const OPTION =
  "flex min-h-14 w-full cursor-pointer items-center rounded px-4 text-left text-base leading-6 font-bold tracking-[0.15px] whitespace-nowrap text-white outline-none hover:bg-[rgb(255_234_158/0.1)] focus-visible:bg-[rgb(255_234_158/0.1)] aria-selected:bg-[rgb(255_234_158/0.1)] aria-selected:[text-shadow:0_4px_4px_rgb(0_0_0/0.25),0_0_6px_#fae287] motion-safe:transition-colors motion-safe:duration-200";

/*
 * Direction control of the KUDOS header (Figma `mms_C.3_Button` 362:5089: 16x24 padding, 1px home-border outline, 10% gold tint,
 * 4px radius, label + chevron, 64 tall). Same listbox pattern as the board's KudosFilterDropdown (roles, arrow keys / Home / End with a
 * roving tabindex, Escape returns focus to the button) but driven by client state: `value` is the current direction, `onSelect`
 * is called only for the other option, picking the current one just closes the list. `testId` goes on the trigger.
 */
export function ProfileDirectionDropdown({
  value,
  options,
  listLabel,
  testId,
  onSelect,
}: {
  value: ProfileKudosDirection;
  options: readonly DirectionOption[];
  /** Accessible name of the option list. */
  listLabel: string;
  testId: string;
  onSelect: (next: ProfileKudosDirection) => void;
}) {
  const [open, setOpen] = useState(false);
  // Roving tabindex: the focused option is the list's single Tab stop (the current one until focus moves).
  const [active, setActive] = useState<ProfileKudosDirection | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const tabStop = active ?? value;
  const current = options.find((option) => option.value === value) ?? options[0];

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
      // Focus lands once the list is mounted: the current option.
      requestAnimationFrame(() => {
        const items = optionButtons();
        (items.find((item) => item.getAttribute("aria-selected") === "true") ?? items[0])?.focus();
      });
    }
  }

  function choose(next: ProfileKudosDirection) {
    close(true);
    if (next !== value) onSelect(next);
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
    <div ref={rootRef} className="relative">
      {/* mm:362:5089 */}
      <button
        ref={buttonRef}
        type="button"
        data-testid={testId}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={toggle}
        className={`flex min-h-16 min-w-11 cursor-pointer items-center gap-2 rounded border border-home-border bg-[rgb(255_234_158/0.1)] px-6 py-4 text-base leading-6 font-bold tracking-[0.15px] text-white hover:bg-[rgb(255_234_158/0.2)] aria-expanded:bg-[rgb(255_234_158/0.2)] motion-safe:transition-colors motion-safe:duration-200 ${FOCUS_RING}`}
      >
        {current.label}
        {/* mm:I362:5089;186:2761 */}
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
          className="absolute top-full right-0 z-40 mt-2 min-w-full max-w-[calc(100vw_-_2rem)] overflow-y-auto rounded-lg border border-home-border bg-kudos-panel p-1.5"
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
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
  );
}
