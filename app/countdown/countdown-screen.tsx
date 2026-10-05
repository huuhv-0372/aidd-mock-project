"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CountdownUnit } from "./countdown-unit";
import { computeTimeLeft, type TimeLeft } from "./countdown-time";

interface CountdownScreenProps {
  /** Target instant (ms epoch), resolved server-side via `parseTarget`. */
  targetMs: number;
  /** Time left computed server-side at render time, for hydration-safe first paint. */
  initialTimeLeft: TimeLeft;
  /** Locale from the `NEXT_LOCALE` cookie, resolved server-side. Defaults to `vi`. */
  locale?: "vi" | "en";
}

const TITLE_TEXT: Record<"vi" | "en", string> = {
  vi: "Sự kiện sẽ bắt đầu sau",
  en: "Event starts in",
};

export function CountdownScreen({
  targetMs,
  initialTimeLeft,
  locale = "vi",
}: CountdownScreenProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(initialTimeLeft);

  useEffect(() => {
    if (Date.now() >= targetMs) {
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft(computeTimeLeft(targetMs));
      if (Date.now() >= targetMs) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetMs]);

  const title = TITLE_TEXT[locale];

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#00101A]">
      <Image
        src="/countdown/background.png"
        alt=""
        fill
        priority
        className="object-cover"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(18deg, #00101A 15.48%, rgba(0, 18, 29, 0.46) 52.13%, rgba(0, 19, 32, 0) 63.41%)",
        }}
      />
      <div className="relative z-10 flex flex-col items-center gap-6 px-4 text-center sm:gap-8">
        <h1 className="text-2xl font-bold text-white sm:text-3xl md:text-[2.25rem]">
          {title}
        </h1>
        <div className="flex items-center gap-6 sm:gap-10 md:gap-[3.75rem]">
          <CountdownUnit value={timeLeft.days} label="DAYS" />
          <CountdownUnit value={timeLeft.hours} label="HOURS" />
          <CountdownUnit value={timeLeft.minutes} label="MINUTES" />
        </div>
      </div>
    </div>
  );
}
