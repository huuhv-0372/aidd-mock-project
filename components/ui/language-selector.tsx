"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

const OPTIONS = ["VN", "EN"] as const;
/* Default per spec; real locale switching (NEXT_LOCALE) is a separate feature. */
const SELECTED = "VN";

export function LanguageSelector() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLLIElement | null)[]>([]);
  const listId = useId();

  // Focus the selected option when the menu opens.
  useEffect(() => {
    if (open) optionRefs.current[OPTIONS.indexOf(SELECTED)]?.focus();
  }, [open]);

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
          <svg
            data-testid="language-flag"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <rect x="2" y="5" width="20" height="15" fill="#E31D1C" />
            <path d="M12.0396 14.988L8.82029 17.0349L9.9001 13.4517L7.60389 11.1107L10.7696 11.0415L12.1702 7.50412L13.4465 11.0882L16.6047 11.1434L14.2314 13.5273L15.3396 16.9361L12.0396 14.988Z" fill="#FFD221" />
          </svg>
          {/* mm:I662:14391;186:1696;186:1821;186:1439 */}
          <span className="text-base leading-6 font-bold tracking-[0.15px]">{SELECTED}</span>
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
          onKeyDown={onListKeyDown}
          className="absolute top-full right-0 z-30 mt-1 min-w-full overflow-hidden rounded border border-login-divider bg-login-bg py-1"
        >
          {OPTIONS.map((code, index) => (
            <li
              key={code}
              ref={(el) => {
                optionRefs.current[index] = el;
              }}
              role="option"
              aria-selected={code === SELECTED}
              tabIndex={-1}
              onClick={() => close(true)}
              className="flex min-h-11 cursor-pointer items-center px-4 text-base leading-6 font-bold tracking-[0.15px] text-white outline-none hover:bg-white/10 focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-white aria-selected:bg-white/10"
            >
              {code}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
