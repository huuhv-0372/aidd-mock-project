"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ADMIN_SEARCH_MAX_LENGTH } from "@/lib/admin/admin-user-types";
import { FOCUS_ON_GREY } from "./admin-class-names";
import { IconSearch } from "./admin-icons";

const DEBOUNCE_MS = 300;

/*
 * Search field of Figma 773:26413 (259 x 48, magnifier on the right). Typing is debounced 300 ms, Enter or the magnifier submits at
 * once; `onSearch` gets the trimmed text and is not called when it equals the text already in the URL. `q` is the URL value: when
 * it changes for a reason other than our own push (browser back, the "clear filters" link) the field follows it.
 */
export function AdminSearchBox({
  q,
  onSearch,
  placeholder,
  label,
  submitLabel,
}: {
  q: string;
  onSearch: (q: string) => void;
  placeholder: string;
  label: string;
  submitLabel: string;
}) {
  const [text, setText] = useState(q);
  const timer = useRef<number | undefined>(undefined);
  const sent = useRef(q);

  useEffect(() => {
    if (q === sent.current) return;
    sent.current = q;
    window.clearTimeout(timer.current);
    setText(q);
  }, [q]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  function submit(value: string) {
    window.clearTimeout(timer.current);
    const next = value.trim();
    if (next === sent.current) return;
    sent.current = next;
    onSearch(next);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    submit(text);
  }

  return (
    // mm:773:26413
    <form role="search" onSubmit={onSubmit} className="relative w-full md:w-[259px]">
      <input
        type="search"
        data-testid="admin-search"
        aria-label={label}
        placeholder={placeholder}
        maxLength={ADMIN_SEARCH_MAX_LENGTH}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          window.clearTimeout(timer.current);
          const value = event.target.value;
          timer.current = window.setTimeout(() => submit(value), DEBOUNCE_MS);
        }}
        className={`h-12 w-full rounded border border-login-divider bg-white pr-12 pl-4 text-sm leading-5 font-medium tracking-[0.1px] text-login-bg placeholder:text-[#999] [&::-webkit-search-cancel-button]:hidden ${FOCUS_ON_GREY}`}
      />
      <button
        type="submit"
        data-testid="admin-search-submit"
        aria-label={submitLabel}
        className={`absolute top-0 right-0 flex h-12 min-w-11 cursor-pointer items-center justify-center rounded px-2 text-black ${FOCUS_ON_GREY}`}
      >
        <IconSearch />
      </button>
    </form>
  );
}
