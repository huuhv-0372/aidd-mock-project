"use client";

import type { ChangeEvent, FormEvent } from "react";

type SpotlightSearchProps = {
  value: string;
  onChange: (value: string) => void;
  /** Enter or the magnifier: bring the first match to the middle of the frame. */
  onSubmit: () => void;
  label: string;
  /** Short line shown under the pill when a non-empty query matches nothing. */
  statusMessage: string;
};

export const SPOTLIGHT_SEARCH_MAX_LENGTH = 100;

/*
 * Figma B.7.3 `2940:14833`: 219x39 pill, gold hairline border, #FFEA9E at 10%, 16px magnifier + label.
 * The magnifier button and the input are 44px boxes pulled back with negative margins: pill look unchanged.
 */
export function SpotlightSearch({ value, onChange, onSubmit, label, statusMessage }: SpotlightSearchProps) {
  return (
    <div className="pointer-events-auto absolute top-[68px] left-4 flex flex-col gap-2 md:top-[26px] md:left-[25px]">
      {/* mm:2940:14833 */}
      <form
        role="search"
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          onSubmit();
        }}
        className="flex h-11 w-[219px] items-center gap-[5.46px] rounded-[46.4px] border-[0.68px] border-home-border bg-[rgb(255_234_158/0.1)] px-[10.92px] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-login-accent md:h-[39px]"
      >
        {/* mm:I2940:14833;186:2759 */}
        <button
          type="submit"
          aria-label={label}
          className="-mx-3.5 grid size-11 shrink-0 place-items-center text-white hover:text-login-accent focus-visible:outline-2 focus-visible:outline-login-accent"
        >
          <svg width="16" height="16" viewBox="3 3 18 18" fill="none" aria-hidden="true">
            <path
              fill="currentColor"
              d="M9.5 3C11.2239 3 12.8772 3.68482 14.0962 4.90381C15.3152 6.12279 16 7.77609 16 9.5C16 11.11 15.41 12.59 14.44 13.73L14.71 14H15.5L20.5 19L19 20.5L14 15.5V14.71L13.73 14.44C12.59 15.41 11.11 16 9.5 16C7.77609 16 6.12279 15.3152 4.90381 14.0962C3.68482 12.8772 3 11.2239 3 9.5C3 7.77609 3.68482 6.12279 4.90381 4.90381C6.12279 3.68482 7.77609 3 9.5 3ZM9.5 5C7 5 5 7 5 9.5C5 12 7 14 9.5 14C12 14 14 12 14 9.5C14 7 12 5 9.5 5Z"
            />
          </svg>
        </button>
        {/* mm:I2940:14833;186:2760 */}
        <input
          type="search"
          name="spotlight-search"
          value={value}
          maxLength={SPOTLIGHT_SEARCH_MAX_LENGTH}
          autoComplete="off"
          aria-label={label}
          placeholder={label}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
          className="-my-1 h-11 min-w-0 flex-1 bg-transparent text-base leading-4 font-medium tracking-[0.1px] text-white outline-none placeholder:text-white md:text-[10.92px] [&::-webkit-search-cancel-button]:appearance-none"
        />
      </form>
      <p aria-live="polite" aria-atomic="true" className="px-3 text-xs leading-4 font-medium text-white/80">
        {statusMessage}
      </p>
    </div>
  );
}
