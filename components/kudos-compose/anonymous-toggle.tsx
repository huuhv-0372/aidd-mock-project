"use client";

import { CheckMarkIcon } from "./compose-icons";
import { INPUT } from "./compose-field-styles";
import type { WriteKudoCopy } from "./write-kudo-copy";
import { KUDO_LIMITS } from "./write-kudo-types";

type Props = {
  copy: WriteKudoCopy["anonymous"];
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  alias: string;
  onAliasChange: (alias: string) => void;
};

/*
 * Gửi ẩn danh (Figma G, mm:520:14099): checkbox (24px, grey 1px border, 4px radius) + 22px grey label. Checked reveals
 * the optional alias field (<= 50 chars, no Figma frame: styled like the other text fields); unchecked removes it.
 */
export function AnonymousToggle({ copy, checked, onCheckedChange, alias, onAliasChange }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <label className="-my-2 flex min-h-11 w-fit max-w-full cursor-pointer items-center gap-4">
        {/* mm:I520:11647;520:14099;520:14097 */}
        {/* The input is the 44px touch target (transparent); the 24px Figma box is drawn by the sibling spans, and the
            -mx-2.5 margin keeps the 24px footprint in the row. */}
        <span className="relative -mx-2.5 size-11 shrink-0">
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => onCheckedChange(event.target.checked)}
            className="peer absolute inset-0 m-0 size-11 cursor-pointer opacity-0"
          />
          <span className="pointer-events-none absolute inset-2.5 rounded border border-kudos-muted bg-white outline-offset-2 peer-checked:border-login-bg peer-checked:bg-login-accent peer-focus-visible:outline-2 peer-focus-visible:outline-login-bg" />
          <span className="pointer-events-none absolute inset-2.5 hidden text-login-bg peer-checked:block">
            <CheckMarkIcon />
          </span>
        </span>
        {/* mm:I520:11647;520:14099;520:14095 */}
        <span className="text-lg leading-7 font-bold text-kudos-muted sm:text-[22px]">{copy.label}</span>
      </label>
      {checked && (
        <input
          type="text"
          value={alias}
          maxLength={KUDO_LIMITS.aliasMax}
          aria-label={copy.aliasLabel}
          placeholder={copy.aliasLabel}
          onChange={(event) => onAliasChange(event.target.value)}
          className={INPUT}
        />
      )}
    </div>
  );
}
