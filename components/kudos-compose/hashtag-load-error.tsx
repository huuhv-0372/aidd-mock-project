"use client";

import type { KeyboardEventHandler, Ref } from "react";
import type { WriteKudoCopy } from "./write-kudo-copy";

type Props = {
  id: string;
  copy: WriteKudoCopy["hashtag"];
  onRetry: () => void;
  /** The retry button, so the picker can hand focus back to it when a reload fails again. */
  retryRef: Ref<HTMLButtonElement>;
  onKeyDown: KeyboardEventHandler<HTMLDivElement>;
};

/* Stands in for the hashtag dropdown when the catalog could not be loaded: one explained line + "Thử lại". Same dark panel as the dropdown. */
export function HashtagLoadError({ id, copy, onRetry, retryRef, onKeyDown }: Props) {
  return (
    <div
      id={id}
      onKeyDown={onKeyDown}
      className="absolute top-full left-0 z-30 mt-1.5 flex w-[min(318px,calc(100vw_-_4rem))] flex-col gap-1 rounded-lg border border-home-border bg-kudos-panel p-1.5"
    >
      <p role="alert" className="px-4 py-2 text-base leading-6 font-bold tracking-[0.15px] text-white">
        {copy.loadFailed}
      </p>
      <button
        ref={retryRef}
        type="button"
        onClick={onRetry}
        className="flex min-h-11 min-w-11 w-full cursor-pointer items-center justify-center rounded-sm border border-home-border px-4 text-base leading-6 font-bold tracking-[0.15px] text-login-accent outline-offset-2 hover:bg-[rgb(255_234_158/0.1)] focus-visible:outline-2 focus-visible:outline-login-accent motion-safe:transition-colors motion-safe:duration-150"
      >
        {copy.retry}
      </button>
    </div>
  );
}
