import type { ReactNode } from "react";

/*
 * Sizes are Figma values (1512px artboard) multiplied by --s, a unit scale set on the
 * screen root (countdown-screen.tsx): 0.5 on mobile, 0.75 on md, 1 on lg and up.
 * This keeps the three units on ONE row at every width while desktop matches Figma 1:1.
 */

type CountdownUnitProps = {
  label: "DAYS" | "HOURS" | "MINUTES";
  /** Two-character, zero-padded value, e.g. "05". */
  value: string;
  testId: string;
};

/** Layout of the "Time" frame: three units, 60px apart. */
export function CountdownRow({ children }: { children: ReactNode }) {
  return (
    // mm:2268:35138
    <div className="flex items-center justify-center gap-[calc(60px*var(--s,1))]">
      {children}
    </div>
  );
}

/** One LED digit box (Figma instance "Group 5" / "Group 4"). */
function DigitBox({ digit }: { digit: string }) {
  return (
    // mm:2268:35141
    <span className="relative flex h-[calc(122.88px*var(--s,1))] w-[calc(76.8px*var(--s,1))] items-center justify-center">
      {/* mm:I2268:35141;186:2616 */}
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-[calc(12px*var(--s,1))] border-[0.75px] border-solid border-countdown-digit-border bg-linear-to-b from-white to-white/10 opacity-50 backdrop-blur-[25px]"
      />
      {/* mm:I2268:35141;186:2617 */}
      <span aria-hidden="true" className="relative font-digital-numbers text-[length:calc(73.728px*var(--s,1))] leading-[1.288] font-normal text-white">
        {digit}
      </span>
    </span>
  );
}

export function CountdownUnit({ label, value, testId }: CountdownUnitProps) {
  return (
    // mm:2268:35139
    <div className="flex w-[calc(175px*var(--s,1))] flex-col items-start justify-center gap-[calc(21px*var(--s,1))]">
      {/* mm:2268:35140 — textContent of this element is exactly `value` */}
      <div
        role="group"
        aria-label={`${value} ${label}`}
        data-testid={testId}
        className="flex items-center gap-[calc(21px*var(--s,1))]"
      >
        {Array.from(value).map((digit, index) => (
          <DigitBox key={index} digit={digit} />
        ))}
      </div>
      {/* mm:2268:35143 */}
      <span aria-hidden="true" lang="en" className="font-montserrat text-[length:calc(36px*var(--s,1))] leading-[calc(48px*var(--s,1))] font-bold text-white">
        {label}
      </span>
    </div>
  );
}
