"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useDismissable } from "@/components/site-shell/use-dismissable";
import { CheckCircleIcon, CloseTinyIcon, PlusIcon } from "./compose-icons";
import { FieldLabel } from "./compose-field-label";
import { HashtagLoadError } from "./hashtag-load-error";
import { ERROR_FLOAT, FOCUS, REMOVE_BUTTON, REMOVE_DOT } from "./compose-field-styles";
import type { WriteKudoCopy } from "./write-kudo-copy";
import { KUDO_LIMITS, type HashtagOption, type WriteKudoLocale } from "./write-kudo-types";

type Props = {
  copy: WriteKudoCopy;
  locale: WriteKudoLocale;
  options: HashtagOption[];
  /** The catalog could not be loaded: the dropdown explains it and offers a retry instead of the rows. */
  loadFailed: boolean;
  /** Reloads the catalog; resolves to whether it loaded, or null when a newer reload made this answer moot. */
  onRetry: () => Promise<boolean | null>;
  /** Picked catalog slugs, in pick order. */
  selected: string[];
  onChange: (slugs: string[]) => void;
  /** The dropdown just closed (outside click, Esc, toggle): the form shows the required error if nothing is picked. */
  onClosed: () => void;
  error: string | null;
};

// Dropdown rows (Figma p9zO-c4a4x): 40px, 16px bold white on #00070C; picked rows tinted gold 20% with a check.
const ROW =
  "flex min-h-11 md:min-h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-sm px-4 text-left text-base leading-6 font-bold tracking-[0.15px] text-white outline-none hover:bg-[rgb(255_234_158/0.1)] focus-visible:bg-[rgb(255_234_158/0.1)] aria-selected:bg-[rgb(255_234_158/0.2)] aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-transparent motion-safe:transition-colors motion-safe:duration-150";

const CHIP =
  "inline-flex min-h-10 items-center gap-2 rounded-lg border border-home-border bg-white py-1 pr-1.5 pl-3 text-base leading-6 font-bold tracking-[0.15px] text-login-bg";

/*
 * Hashtag (Figma E / E.1 / E.2 + dropdown p9zO-c4a4x): chips of the picked catalog tags + "+ Hashtag". The dropdown is a
 * multi-select listbox that stays open on pick and closes on an outside click; at 5 tags the unpicked rows turn
 * aria-disabled. Tags only come from the catalog (no free text), shown as "#name".
 */
export function HashtagPicker({ copy, locale, options, loadFailed, onRetry, selected, onChange, onClosed, error }: Props) {
  const [open, setOpen] = useState(false);
  const [refocus, setRefocus] = useState<{ onRows: boolean } | null>(null); // a fresh object per settled retry, so the effect below re-runs
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const retryRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const full = selected.length >= KUDO_LIMITS.hashtagsMax;
  const nameOf = (tag: HashtagOption) => (locale === "en" ? tag.name_en : tag.name_vi);
  const picked = selected.flatMap((slug) => options.find((tag) => tag.slug === slug) ?? []);

  const close = useCallback(
    (restoreFocus: boolean) => {
      setOpen(false);
      onClosed();
      if (restoreFocus) triggerRef.current?.focus();
    },
    [onClosed],
  );
  useDismissable(open, rootRef, close);

  const rows = () => Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? []);

  function toggleDropdown() {
    if (open) return close(false);
    setOpen(true);
    requestAnimationFrame(() => rows()[0]?.focus());
  }

  // The panel is replaced while the catalog reloads (the focused Retry button unmounts), so focus is handed back once it settles:
  // to the first row on success, to the new Retry button on failure. Done in an effect, i.e. after the answer is rendered.
  async function retry() {
    const loaded = await onRetry();
    if (loaded !== null) setRefocus({ onRows: loaded });
  }
  useEffect(() => {
    if (!refocus) return;
    const active = document.activeElement;
    if (active && active !== document.body && !rootRef.current?.contains(active)) return; // the user has moved on: keep their focus
    (refocus.onRows ? listRef.current?.querySelector<HTMLButtonElement>('[role="option"]') : retryRef.current)?.focus();
  }, [refocus]);

  function toggleTag(slug: string) {
    if (selected.includes(slug)) onChange(selected.filter((item) => item !== slug));
    else if (!full) onChange([...selected, slug]);
  }

  function onListKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault(); // closes the dropdown only, not the modal
      event.stopPropagation();
      return close(true);
    }
    const items = rows();
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    const target = event.key === "ArrowDown" ? items[(at + 1) % items.length] : event.key === "ArrowUp" ? items[(at - 1 + items.length) % items.length] : null;
    if (!target) return;
    event.preventDefault();
    target.focus();
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
      {/* mm:I520:11647;520:9891 (top-aligned with the tag row, not centered) */}
      <FieldLabel required className="sm:min-w-[108px]">
        {copy.hashtag.label}
      </FieldLabel>
      <div ref={rootRef} className="relative min-w-0 flex-1">
        {/* mm:I520:11647;662:8595 */}
        <div className="flex flex-wrap items-center gap-2">
          {picked.map((tag) => (
            <span key={tag.slug} data-testid="hashtag-chip" className={CHIP}>
              <span>
                <span aria-hidden="true">#</span>
                {nameOf(tag)}
              </span>
              <button
                type="button"
                aria-label={`${copy.hashtag.remove} ${nameOf(tag)}`}
                onClick={() => toggleTag(tag.slug)}
                className={`${REMOVE_BUTTON} -m-3`}
              >
                <span className={REMOVE_DOT}>
                  <CloseTinyIcon size={14} />
                </span>
              </button>
            </span>
          ))}
          <>
            {/* mm:I520:11647;662:8911 */}
            <button
              ref={triggerRef}
              type="button"
              aria-label={copy.hashtag.add}
              aria-haspopup="listbox"
              aria-expanded={open}
              aria-controls={open ? listId : undefined}
              onClick={toggleDropdown}
              className={`flex min-h-12 min-w-11 cursor-pointer items-center gap-1 rounded-lg border border-home-border bg-white px-[7px] py-1 text-left hover:bg-[#fffdf3] motion-safe:transition-colors motion-safe:duration-200 ${FOCUS}`}
            >
              <span className="text-home-border">
                <PlusIcon />
              </span>
              <span className="flex flex-col">
                <span className="text-base leading-[22px] font-bold tracking-[0.15px] text-login-bg">{copy.hashtag.label}</span>
                <span className="text-[11px] leading-4 font-bold tracking-[0.5px] text-kudos-muted">{copy.hashtag.max}</span>
              </span>
            </button>
            {open && loadFailed && <HashtagLoadError id={listId} copy={copy.hashtag} onRetry={retry} retryRef={retryRef} onKeyDown={onListKeyDown} />}
            {open && !loadFailed && (
              <div
                ref={listRef}
                id={listId}
                role="listbox"
                aria-multiselectable="true"
                aria-label={copy.hashtag.listLabel}
                data-testid="hashtag-dropdown"
                onKeyDown={onListKeyDown}
                className="absolute top-full left-0 z-30 mt-1.5 max-h-[min(332px,30dvh)] sm:max-h-[332px] w-[min(318px,calc(100vw_-_4rem))] overflow-y-auto rounded-lg border border-home-border bg-kudos-panel p-1.5"
              >
                {options.map((tag) => {
                  const isPicked = selected.includes(tag.slug);
                  const disabled = full && !isPicked;
                  return (
                    <button
                      key={tag.slug}
                      type="button"
                      role="option"
                      aria-selected={isPicked}
                      aria-disabled={disabled || undefined}
                      onClick={() => !disabled && toggleTag(tag.slug)}
                      className={ROW}
                    >
                      <span>
                        <span aria-hidden="true">#</span>
                        {nameOf(tag)}
                      </span>
                      {isPicked && <CheckCircleIcon />}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        </div>
        {error && (
          <p data-testid="error-hashtags" className={ERROR_FLOAT}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
