import { splitRemainingTime } from "@/lib/countdown/split-remaining-time";

export interface HomeCountdown {
  days: string;
  hours: string;
  minutes: string;
  showComingSoon: boolean;
}

const FINISHED: HomeCountdown = { days: "00", hours: "00", minutes: "00", showComingSoon: false };

/** Homepage countdown: zeros + hidden label when the start is unknown/invalid or already reached. */
export function getHomeCountdown(startMs: number | null, nowMs: number): HomeCountdown {
  if (startMs === null || !Number.isFinite(startMs) || nowMs >= startMs) return { ...FINISHED };
  const { days, hours, minutes } = splitRemainingTime(startMs, nowMs);
  return { days, hours, minutes, showComingSoon: true };
}
