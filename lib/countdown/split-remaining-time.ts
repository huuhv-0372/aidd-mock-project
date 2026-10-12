const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

const pad2 = (n: number): string => String(n).padStart(2, "0");

/** Two-digit unit. Invalid/negative -> "00"; above max -> clamp (days) or "00" (hours/minutes). */
export function formatUnit(value: number, max: number, clampOverflow: boolean): string {
  if (!Number.isFinite(value) || value < 0) return "00";
  if (value > max) return clampOverflow ? pad2(max) : "00";
  return pad2(Math.floor(value));
}

export interface RemainingTime {
  days: string;
  hours: string;
  minutes: string;
  isComplete: boolean;
}

/** Recomputed from absolute times each call, so throttled ticks never drift. */
export function splitRemainingTime(targetMs: number, nowMs: number): RemainingTime {
  const remaining = Math.max(0, targetMs - nowMs);
  const days = Math.floor(remaining / MS_PER_DAY);
  const hours = Math.floor((remaining % MS_PER_DAY) / MS_PER_HOUR);
  const minutes = Math.floor((remaining % MS_PER_HOUR) / MS_PER_MINUTE);
  return {
    days: formatUnit(days, 99, true),
    hours: formatUnit(hours, 23, false),
    minutes: formatUnit(minutes, 59, false),
    isComplete: nowMs >= targetMs,
  };
}
