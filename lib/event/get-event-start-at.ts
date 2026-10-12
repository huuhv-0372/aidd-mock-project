// Web-API-only: imported by proxy.ts and Server Components (no fs/path/server-only).
const ISO_WITH_OFFSET =
  /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/;

function hasRealCalendarDate(raw: string): boolean {
  const match = ISO_WITH_OFFSET.exec(raw);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

/** EVENT_START_AT as epoch ms, or null when missing/invalid (fail-open, BR-002). */
export function getEventStartAt(raw: string | undefined = process.env.EVENT_START_AT): number | null {
  const ms = raw && hasRealCalendarDate(raw) ? Date.parse(raw) : NaN;
  if (!Number.isFinite(ms)) {
    console.error("[countdown-gate] EVENT_START_AT missing or invalid");
    return null;
  }
  return ms;
}

/** BR-001 + BR-002: launched when no valid start is configured or start has passed. */
export function isEventLaunched(startMs: number | null, nowMs: number): boolean {
  return startMs === null || nowMs >= startMs;
}
