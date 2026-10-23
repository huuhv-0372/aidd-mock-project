// Fixed zone: the table, the CSV and the file name read the same on every server/runner and in both UI languages.
const formatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Ho_Chi_Minh",
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function partsOf(date: Date): Record<string, string> {
  const parts: Record<string, string> = {};
  for (const { type, value } of formatter.formatToParts(date)) parts[type] = value;
  return parts;
}

/** `{ date: "dd/MM/yyyy", time: "HH:mm" }` in Vietnam time (UTC+7). Null or unparseable input -> null (shown as "-"). */
export function formatAdminDateTime(iso: string | null): { date: string; time: string } | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const p = partsOf(date);
  return { date: `${p.day}/${p.month}/${p.year}`, time: `${p.hour}:${p.minute}` };
}

/** `YYYYMMDD` of the Vietnam calendar day (CSV file name `users-YYYYMMDD.csv`). */
export function adminFileDate(date: Date): string {
  const p = partsOf(date);
  return `${p.year}${p.month}${p.day}`;
}
