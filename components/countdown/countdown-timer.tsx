"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { splitRemainingTime } from "@/lib/countdown/split-remaining-time";
import { getClockOffsetMs, getCorrectedNowMs } from "@/lib/countdown/server-clock-offset";
import { CountdownRow, CountdownUnit } from "@/components/countdown/countdown-unit";

type CountdownTimerProps = {
  /** Event start, epoch ms. */
  target: number;
  /** Server time at render, epoch ms; anchors the client clock offset. */
  serverNow: number;
};

export function CountdownTimer({ target, serverNow }: CountdownTimerProps) {
  // Same initial value on server and client: no hydration mismatch, no "00" flash.
  const [time, setTime] = useState(() => splitRemainingTime(target, serverNow));
  const router = useRouter();
  const redirected = useRef(false);

  useEffect(() => {
    const offset = getClockOffsetMs(serverNow, Date.now());
    const tick = () => {
      const next = splitRemainingTime(target, getCorrectedNowMs(offset, Date.now()));
      setTime(next);
      if (next.isComplete) {
        clearInterval(id);
        if (!redirected.current) {
          redirected.current = true;
          router.replace("/login");
        }
      }
    };
    const id = setInterval(tick, 1000);
    tick();
    return () => clearInterval(id);
  }, [target, serverNow, router]);

  return (
    <CountdownRow>
      <CountdownUnit label="DAYS" value={time.days} testId="countdown-days" />
      <CountdownUnit label="HOURS" value={time.hours} testId="countdown-hours" />
      <CountdownUnit label="MINUTES" value={time.minutes} testId="countdown-minutes" />
    </CountdownRow>
  );
}
