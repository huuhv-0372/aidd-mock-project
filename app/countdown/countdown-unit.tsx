interface CountdownUnitProps {
  value: number;
  label: string;
}

/**
 * One LED-style countdown block: two zero-padded digit boxes + an uppercase
 * label underneath. Reused for Days / Hours / Minutes.
 * Visual source: MoMorph node 2268:35139 ("1_Days") — box 76.8x122.88px,
 * border #FFEA9E/50%, white-to-transparent gradient fill, 12px radius.
 */
export function CountdownUnit({ value, label }: CountdownUnitProps) {
  const digits = String(value).padStart(2, "0").split("");

  return (
    <div className="flex flex-col items-start gap-3 sm:gap-4 md:gap-[21px]">
      <div className="flex items-center gap-3 sm:gap-4 md:gap-[21px]">
        {digits.map((digit, index) => (
          <div
            key={index}
            className="flex h-16 w-11 items-center justify-center rounded-xl border border-[#FFEA9E]/50 bg-gradient-to-b from-white/60 to-white/10 backdrop-blur-2xl sm:h-24 sm:w-16 md:h-[7.68rem] md:w-[4.8rem]"
          >
            <span className="font-mono text-2xl font-normal tabular-nums text-white sm:text-3xl md:text-[2.6rem]">
              {digit}
            </span>
          </div>
        ))}
      </div>
      <span className="text-lg font-bold uppercase tracking-wide text-white sm:text-xl md:text-[2.25rem]">
        {label}
      </span>
    </div>
  );
}
