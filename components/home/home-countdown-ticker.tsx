"use client";

import { useEffect, useState } from "react";
import { getClockOffsetMs, getCorrectedNowMs } from "@/lib/countdown/server-clock-offset";
import { getHomeCountdown, type HomeCountdown as HomeCountdownState } from "@/lib/countdown/get-home-countdown";
import { HomeCountdown } from "./home-countdown";

type HomeCountdownTickerProps = {
  /** Event start, epoch ms, or null when not configured. */
  startMs: number | null;
  /** Server time at render, epoch ms; anchors the client clock offset. */
  serverNow: number;
};

const isSame = (a: HomeCountdownState, b: HomeCountdownState) =>
  a.days === b.days && a.hours === b.hours && a.minutes === b.minutes && a.showComingSoon === b.showComingSoon;

export function HomeCountdownTicker({ startMs, serverNow }: HomeCountdownTickerProps) {
  // Same initial value on server and client: no hydration mismatch, no "00" flash.
  const [state, setState] = useState(() => getHomeCountdown(startMs, serverNow));

  useEffect(() => {
    const offset = getClockOffsetMs(serverNow, Date.now());
    const tick = () => {
      const next = getHomeCountdown(startMs, getCorrectedNowMs(offset, Date.now()));
      setState((prev) => (isSame(prev, next) ? prev : next));
    };
    const id = setInterval(tick, 1000);
    tick();
    return () => clearInterval(id);
  }, [startMs, serverNow]);

  return <HomeCountdown {...state} />;
}
