import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { CountdownScreen } from "@/components/countdown/countdown-screen";
import { CountdownTimer } from "@/components/countdown/countdown-timer";
import { getEventStartAt } from "@/lib/event/get-event-start-at";

export const metadata = { title: "SAA 2025 — Sự kiện sẽ bắt đầu sau" };

// Reads env and the clock per request, so it must stay behind a Suspense boundary.
async function CountdownTimerSlot() {
  await connection();
  const target = getEventStartAt();
  if (target === null) redirect("/login");
  // Request-time clock, safe after connection(); anchors the client offset.
  // eslint-disable-next-line react-hooks/purity
  const serverNow = Date.now();
  // key: a proxy bounce re-renders this slot with a new anchor; remount so the timer's
  // once-only redirect guard resets instead of leaving the user stuck at 00:00:00.
  return <CountdownTimer key={serverNow} target={target} serverNow={serverNow} />;
}

export default function CountdownPage() {
  return (
    <CountdownScreen>
      <Suspense
        fallback={<div aria-hidden="true" className="h-[calc((122.88px+21px+48px)*var(--s,1))]" />}
      >
        <CountdownTimerSlot />
      </Suspense>
    </CountdownScreen>
  );
}
