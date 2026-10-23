"use client";

import { useId } from "react";
import { CheckMarkIcon } from "./compose-icons";
import { FieldLabel } from "./compose-field-label";
import { INPUT } from "./compose-field-styles";
import type { WriteKudoCopy } from "./write-kudo-copy";
import { KUDO_LIMITS } from "./write-kudo-types";

type Props = {
  copy: WriteKudoCopy["anonymous"];
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  alias: string;
  onAliasChange: (alias: string) => void;
  /** Edit mode: the state of a sent Kudo cannot flip, so the checkbox only shows it. The alias stays editable. */
  locked?: boolean;
};

/*
 * Gửi ẩn danh (Figma G, mm:520:14099): checkbox (24px, grey 1px border, 4px radius) + 22px grey label. Checked reveals
 * the optional alias field (<= 50 chars, styled like the other text fields); unchecked removes it. The alias row follows
 * the owner's edit screenshot (419VXmMy6I "Nickname ẩn danh"): 22px label inline left of the 56px input from sm up,
 * stacked under it on phones. No asterisk: the alias is optional.
 */
export function AnonymousToggle({ copy, checked, onCheckedChange, alias, onAliasChange, locked = false }: Props) {
  const aliasId = useId();
  return (
    <div className="flex flex-col gap-4">
      <label className={`-my-2 flex min-h-11 w-fit max-w-full items-center gap-4 ${locked ? "cursor-default" : "cursor-pointer"}`}>
        {/* mm:I520:11647;520:14099;520:14097 */}
        {/* The input is the 44px touch target (transparent); the 24px Figma box is drawn by the sibling spans, and the
            -mx-2.5 margin keeps the 24px footprint in the row. */}
        <span className="relative -mx-2.5 size-11 shrink-0">
          <input
            type="checkbox"
            checked={checked}
            disabled={locked}
            onChange={(event) => onCheckedChange(event.target.checked)}
            className="peer absolute inset-0 m-0 size-11 cursor-pointer opacity-0 disabled:cursor-default"
          />
          <span className="pointer-events-none absolute inset-2.5 rounded border border-kudos-muted bg-white outline-offset-2 peer-checked:border-login-bg peer-checked:bg-login-accent peer-disabled:peer-checked:border-home-border peer-disabled:peer-checked:bg-home-border peer-focus-visible:outline-2 peer-focus-visible:outline-login-bg" />
          <span className="pointer-events-none absolute inset-2.5 hidden text-login-bg peer-checked:block">
            <CheckMarkIcon />
          </span>
        </span>
        {/* mm:I520:11647;520:14099;520:14095 */}
        <span className="text-lg leading-7 font-bold text-kudos-muted sm:text-[22px]">{copy.label}</span>
      </label>
      {checked && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <FieldLabel htmlFor={aliasId}>{copy.aliasLabel}</FieldLabel>
          <input
            id={aliasId}
            type="text"
            value={alias}
            maxLength={KUDO_LIMITS.aliasMax}
            onChange={(event) => onAliasChange(event.target.value)}
            className={INPUT}
          />
        </div>
      )}
    </div>
  );
}
