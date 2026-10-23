import type { AdminRole, AdminUserRow } from "@/lib/admin/admin-user-types";
import { formatAdminDateTime } from "@/lib/admin/format-admin-datetime";

// Fixed English header in both UI languages (clarifications: CSV columns follow Figma and are not localised).
const HEADER = [
  "ID",
  "Name",
  "Email",
  "Sent Kudos",
  "Received Kudos",
  "Total Heart",
  "Level",
  "Badges",
  "Time to get 6 Badges",
  "Last Logged in",
  "Role",
];
const ROLE_LABEL: Record<AdminRole, string> = { user: "User", admin: "Admin" };
// Excel reads UTF-8 (Vietnamese names) only with a BOM; RFC 4180 lines end in CRLF.
const BOM = "\uFEFF";
const EOL = "\r\n";
// A spreadsheet treats a cell starting with one of these as a formula (CSV injection): prefix an apostrophe.
const FORMULA_START = /^[=+\-@\t\r]/;
const NEEDS_QUOTES = /[",\r\n]/;

function csvCell(value: string | number | null): string {
  if (value === null) return "";
  const text = String(value);
  const safe = FORMULA_START.test(text) ? `'${text}` : text;
  return NEEDS_QUOTES.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function dateCell(iso: string | null): string | null {
  const formatted = formatAdminDateTime(iso);
  return formatted ? `${formatted.date} ${formatted.time}` : null;
}

/** The CSV file of /admin/users/export: BOM, header, one line per row in the given order, CRLF after every line. */
export function buildUsersCsv(rows: AdminUserRow[]): string {
  const lines = [
    HEADER,
    ...rows.map((row) => [
      row.rowNo,
      row.fullName,
      row.email,
      row.sent,
      row.received,
      row.hearts,
      row.level,
      row.badges,
      dateCell(row.timeToSixBadges),
      dateCell(row.lastSignInAt),
      ROLE_LABEL[row.role],
    ]),
  ];
  return BOM + lines.map((cells) => cells.map(csvCell).join(",")).join(EOL) + EOL;
}
