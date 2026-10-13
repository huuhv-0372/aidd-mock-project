// Web-API-only: shared by proxy.ts (via get-event-start-at) and Server Components.
const ISO_WITH_OFFSET =
  /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/;

function hasRealCalendarDate(raw: string): boolean {
  const match = ISO_WITH_OFFSET.exec(raw);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

/** ISO 8601 with explicit offset (or Z) and a real calendar date -> epoch ms, else null. */
export function parseIsoWithOffset(raw: string | undefined): number | null {
  const ms = raw && hasRealCalendarDate(raw) ? Date.parse(raw) : NaN;
  return Number.isFinite(ms) ? ms : null;
}
