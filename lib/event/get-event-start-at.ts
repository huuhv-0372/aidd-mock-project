// Web-API-only: imported by proxy.ts and Server Components (no fs/path/server-only).
import { parseIsoWithOffset } from "./parse-iso-with-offset";

/** EVENT_START_AT as epoch ms, or null when missing/invalid (fail-open, BR-002). */
export function getEventStartAt(raw: string | undefined = process.env.EVENT_START_AT): number | null {
  const ms = parseIsoWithOffset(raw);
  if (ms === null) {
    console.error("[countdown-gate] EVENT_START_AT missing or invalid");
    return null;
  }
  return ms;
}

/** BR-001 + BR-002: launched when no valid start is configured or start has passed. */
export function isEventLaunched(startMs: number | null, nowMs: number): boolean {
  return startMs === null || nowMs >= startMs;
}
