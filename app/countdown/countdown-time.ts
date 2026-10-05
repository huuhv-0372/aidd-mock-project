export interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
}

/**
 * Parses the target ISO datetime. Missing/malformed values fall back to "now"
 * (already past) so the site stays available instead of crashing — see
 * technical-spec.md Edge Cases.
 */
export function parseTarget(targetIso: string): number {
  const parsed = Date.parse(targetIso);
  if (Number.isNaN(parsed)) {
    if (typeof window === "undefined") {
      console.warn(
        `[countdown] Invalid NEXT_PUBLIC_EVENT_START_AT value: "${targetIso}" — treating event as already started.`,
      );
    }
    return Date.now();
  }
  return parsed;
}

/** Days clamp at 99 keeps the unit display to its documented 2-digit range (FR2/SC3). */
export function computeTimeLeft(targetMs: number): TimeLeft {
  const diffMs = Math.max(0, targetMs - Date.now());
  const totalMinutes = Math.floor(diffMs / 60_000);
  const days = Math.min(99, Math.floor(totalMinutes / (24 * 60)));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  return { days, hours, minutes };
}
