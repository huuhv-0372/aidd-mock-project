"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { setLocale } from "@/lib/i18n/set-locale-action";
import type { Locale } from "@/lib/i18n/locales";
import { LanguageFlag } from "./language-flags";
import { reloadIntoLocale } from "./locale-change-reload";

/* Option order and visible codes follow the Figma dropdown (A.1 VN, A.2 EN). */
const OPTIONS: readonly { code: string; locale: Locale }[] = [
  { code: "VN", locale: "vi" },
  { code: "EN", locale: "en" },
];

type LanguageSelectorProps = {
  /** Locale currently rendered: drives the trigger flag/code and `aria-selected`. */
  locale: Locale;
  /** Accessible name of the option list. */
  listLabel: string;
};

export function LanguageSelector({ locale, listLabel }: LanguageSelectorProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLLIElement | null)[]>([]);
  const listId = useId();
  const selectedIndex = OPTIONS.findIndex((option) => option.locale === locale);
  const selectedCode = OPTIONS[selectedIndex]?.code ?? OPTIONS[0].code;

  // Focus the selected option when the menu opens.
  useEffect(() => {
    if (open) optionRefs.current[selectedIndex]?.focus();
  }, [open, selectedIndex]);

  // Outside pointer-down closes the menu.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const close = (restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  };

  // Store the choice (cookie via Server Action), then hard-reload every tab into it (a soft refresh
  // across the root [locale] param would leave the old tree mounted). A failed action leaves the page
  // as it is: nothing was stored, so there is nothing to reload into.
  const choose = async (next: Locale) => {
    close(true);
    if (next === locale) return;
    try {
      await setLocale(next);
    } catch (error) {
      console.error("[language-selector] could not switch the language", error);
      return;
    }
    reloadIntoLocale(next);
  };

  const focusOption = (index: number) =>
    optionRefs.current[(index + OPTIONS.length) % OPTIONS.length]?.focus();

  const onListKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const current = optionRefs.current.findIndex((el) => el === document.activeElement);
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusOption(current + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusOption(current - 1);
        break;
      case "Home":
        event.preventDefault();
        focusOption(0);
        break;
      case "End":
        event.preventDefault();
        focusOption(OPTIONS.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (current >= 0) choose(OPTIONS[current].locale);
        else close(true);
        break;
      case "Escape":
        event.preventDefault();
        close(true);
        break;
      case "Tab":
        close(false);
        break;
    }
  };

  return (
    // mm:I662:14391;186:1696
    <div ref={rootRef} className="relative font-montserrat">
      {/* mm:I662:14391;186:1696;186:1821 */}
      <button
        ref={buttonRef}
        type="button"
        data-testid="language-selector"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className="flex h-14 w-27 cursor-pointer items-center justify-between gap-0.5 rounded px-4 text-white outline-offset-0 outline-white hover:bg-white/10 focus-visible:outline-2 aria-expanded:bg-white/10 motion-safe:transition-colors motion-safe:duration-200"
      >
        {/* mm:I662:14391;186:1696;186:1821;186:1937 */}
        <span className="flex items-center gap-1">
          {/* mm:I662:14391;186:1696;186:1821;186:1709 */}
          <LanguageFlag locale={locale} testId="language-flag" />
          {/* mm:I662:14391;186:1696;186:1821;186:1439 */}
          <span className="text-base leading-6 font-bold tracking-[0.15px]">{selectedCode}</span>
        </span>
        {/* mm:I662:14391;186:1696;186:1821;186:1441 */}
        <svg
          data-testid="language-chevron"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className={open ? "rotate-180 motion-safe:transition-transform" : "motion-safe:transition-transform"}
        >
          <path d="M7 10L12 15L17 10H7Z" fill="currentColor" />
        </svg>
      </button>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={listLabel}
          onKeyDown={onListKeyDown}
          className="absolute top-full right-0 z-30 mt-1 w-30.5 overflow-hidden rounded-lg border border-home-border bg-language-list-bg p-1.25"
        >
          {OPTIONS.map((option, index) => (
            <li
              key={option.code}
              ref={(el) => {
                optionRefs.current[index] = el;
              }}
              role="option"
              aria-selected={option.locale === locale}
              tabIndex={-1}
              onClick={() => choose(option.locale)}
              className="flex h-14 cursor-pointer items-center justify-center gap-1 rounded-xs text-base leading-6 font-bold tracking-[0.15px] text-white outline-none hover:bg-login-accent/10 focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-white aria-selected:bg-login-accent/20 aria-selected:hover:bg-login-accent/20"
            >
              {/* mm:I525:11713;362:6085;186:1821;186:1709 (A.1) / mm:I525:11713;362:6128;186:1903;186:1709 (A.2) */}
              <LanguageFlag locale={option.locale} />
              {option.code}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
