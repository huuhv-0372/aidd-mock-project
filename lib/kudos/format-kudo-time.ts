// Fixed zone: the label reads the same on every server/runner and in both UI languages.
const formatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Ho_Chi_Minh",
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/** `HH:mm - MM/DD/YYYY` in Vietnam time (UTC+7). Unparseable input yields an empty string. */
export function formatKudoTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const parts: Record<string, string> = {};
  for (const { type, value } of formatter.formatToParts(date)) parts[type] = value;
  return `${parts.hour}:${parts.minute} - ${parts.month}/${parts.day}/${parts.year}`;
}
