import { CountdownRow, CountdownUnit } from "@/components/countdown/countdown-unit";
import { COMING_SOON } from "./home-copy";

type HomeCountdownProps = {
  days: string;
  hours: string;
  minutes: string;
  showComingSoon: boolean;
};

/*
 * Reuses the prelaunch countdown unit: the Figma digit boxes here (51.2x81.92, 14px gaps, 24px labels,
 * 40px between units) are the prelaunch values x 2/3, so --s = 2/3 on desktop and 0.5 on mobile keep the
 * three units on one row. Two shared-component variables follow the Figma values at that scale: unit
 * width = two digits + gap (174.6px x --s, = 116.4) and digit backdrop blur 24.96px x --s (= 16.64).
 * Values arrive pre-padded (no ticking here).
 */
export function HomeCountdown({ days, hours, minutes, showComingSoon }: HomeCountdownProps) {
  return (
    // mm:2167:9035
    <div className="flex flex-col items-start gap-4 [--s:0.5] [--countdown-unit-w:calc(174.6px*var(--s))] [--countdown-digit-blur:calc(24.96px*var(--s))] md:[--s:0.666667]">
      {showComingSoon ? (
        // mm:2167:9036
        <p className="text-2xl leading-8 font-bold text-white">{COMING_SOON}</p>
      ) : null}
      {/* mm:2167:9037 */}
      <CountdownRow>
        {/* mm:2167:9038 */}
        <CountdownUnit label="DAYS" value={days} testId="countdown-days" />
        {/* mm:2167:9043 */}
        <CountdownUnit label="HOURS" value={hours} testId="countdown-hours" />
        {/* mm:2167:9048 */}
        <CountdownUnit label="MINUTES" value={minutes} testId="countdown-minutes" />
      </CountdownRow>
    </div>
  );
}
