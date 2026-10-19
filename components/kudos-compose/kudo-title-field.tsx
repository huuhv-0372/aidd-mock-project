"use client";

import { useId } from "react";
import { FieldLabel } from "./compose-field-label";
import { ERROR_FLOAT, INPUT } from "./compose-field-styles";
import type { WriteKudoCopy } from "./write-kudo-copy";
import { KUDO_LIMITS } from "./write-kudo-types";

type Props = {
  copy: WriteKudoCopy;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error: string | null;
};

/* Danh hiệu (Figma "Frame 552", mm:1688:10448): required title of the Kudo, 1-100 chars, with the 2-line hint under it. Figma puts the input 158px from the content edge (label box 139 + 19), so the label column is min 142 + the 16px gap. */
export function KudoTitleField({ copy, value, onChange, onBlur, error }: Props) {
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();
  return (
    <div className="flex flex-col gap-2 sm:grid sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-x-4 sm:gap-y-1.5">
      {/* mm:I520:11647;1688:10436 */}
      <div className="sm:flex sm:h-14 sm:items-center">
        <FieldLabel htmlFor={inputId} required className="sm:min-w-[142px]">
          {copy.kudoTitle.label}
        </FieldLabel>
      </div>
      <div className="relative min-w-0 sm:col-start-2">
        {/* mm:I520:11647;1688:10437 */}
        <input
          id={inputId}
          type="text"
          value={value}
          maxLength={KUDO_LIMITS.titleMax}
          placeholder={copy.kudoTitle.placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${errorId} ${hintId}` : hintId}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          className={INPUT}
        />
        {error && (
          <p id={errorId} data-testid="error-title" className={ERROR_FLOAT}>
            {error}
          </p>
        )}
      </div>
      {/* mm:I520:11647;1688:10447 */}
      <p id={hintId} className={`text-base leading-6 font-bold tracking-[0.15px] whitespace-pre-line text-kudos-muted sm:col-start-2 sm:-mb-1.5 ${error ? "invisible" : ""}`}>
        {copy.kudoTitle.hint}
      </p>
    </div>
  );
}
