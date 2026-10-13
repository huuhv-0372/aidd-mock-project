import { connection } from "next/server";
import { getAwardsCeremonyAt } from "@/lib/event/get-awards-ceremony-at";
import { HomeCountdownTicker } from "./home-countdown-ticker";

/* Request-time part: Date.now() is not allowed in the static shell under cacheComponents,
 * so connection() defers this to request time; the page wraps it in <Suspense>. */
export async function HomeCountdownLive() {
  await connection();
  // Request-time clock, safe after connection(); anchors the client offset.
  // eslint-disable-next-line react-hooks/purity
  const serverNow = Date.now();
  return <HomeCountdownTicker startMs={getAwardsCeremonyAt()} serverNow={serverNow} />;
}
