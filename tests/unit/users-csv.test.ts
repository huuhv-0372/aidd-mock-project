import { describe, expect, it } from "vitest";
import type { AdminUserRow } from "@/lib/admin/admin-user-types";
import { buildUsersCsv } from "@/lib/admin/users-csv";

const HEADER = "ID,Name,Email,Sent Kudos,Received Kudos,Total Heart,Level,Badges,Time to get 6 Badges,Last Logged in,Role";

const row = (patch: Partial<AdminUserRow> = {}): AdminUserRow => ({
  userId: "a1000000-0000-0000-0000-000000000001",
  rowNo: 1,
  fullName: "Nguyễn Thị Phương Anh",
  email: "anh@sun-asterisk.com",
  department: "CEVC1",
  sent: 3,
  received: 2,
  hearts: 10,
  level: 1,
  badges: 6,
  timeToSixBadges: "2026-09-20T08:15:00.000Z",
  lastSignInAt: "2026-10-05T02:30:00.000Z",
  role: "admin",
  ...patch,
});

/** Data lines without the BOM, split on CRLF only (a quoted cell may hold a bare LF). */
const lines = (csv: string) => csv.slice(1).split("\r\n");

describe("buildUsersCsv", () => {
  it("starts with a UTF-8 BOM, has the fixed English header and ends every line with CRLF", () => {
    const csv = buildUsersCsv([row()]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(lines(csv)).toEqual([
      HEADER,
      "1,Nguyễn Thị Phương Anh,anh@sun-asterisk.com,3,2,10,1,6,20/09/2026 15:15,05/10/2026 09:30,Admin",
      "",
    ]);
    expect(/[^\r]\n/.test(csv)).toBe(false);
  });

  it("is only the BOM and the header for no rows", () => {
    expect(buildUsersCsv([])).toBe(`\uFEFF${HEADER}\r\n`);
  });

  it("writes null name, email and dates as empty cells and the role label as User", () => {
    const csv = buildUsersCsv([row({ fullName: null, email: null, timeToSixBadges: null, lastSignInAt: null, role: "user" })]);
    expect(lines(csv)[1]).toBe("1,,,3,2,10,1,6,,,User");
  });

  it.each([
    ["=1+1 Hoàng Đức", "'=1+1 Hoàng Đức"],
    ["+1 Phạm Bảo", "'+1 Phạm Bảo"],
    ["-1 Đặng Ngọc", "'-1 Đặng Ngọc"],
    ["@x Vũ Khánh", "'@x Vũ Khánh"],
    ["\tTab", "'\tTab"],
    ["\rCR", "\"'\rCR\""],
    ["=HYPERLINK(\"http://x\",\"y\")", "\"'=HYPERLINK(\"\"http://x\"\",\"\"y\"\")\""],
  ])("neutralises the formula-looking name %j", (name, cell) => {
    expect(lines(buildUsersCsv([row({ fullName: name })]))[1].startsWith(`1,${cell},`)).toBe(true);
  });

  it("guards an email cell too, and leaves inner = + - @ alone", () => {
    const csv = buildUsersCsv([row({ fullName: "Lê Văn-An", email: "@evil@sun-asterisk.com" })]);
    expect(lines(csv)[1].startsWith("1,Lê Văn-An,'@evil@sun-asterisk.com,")).toBe(true);
  });

  it("wraps cells holding a comma, a quote or a line break and doubles the quotes", () => {
    const csv = buildUsersCsv([
      row({ rowNo: 1, fullName: 'Bùi, "Bé" Minh' }),
      row({ rowNo: 2, fullName: "Two\nLines" }),
      row({ rowNo: 3, fullName: 'Say "hi"' }),
    ]);
    expect(lines(csv).slice(1, 4).map((line) => line.split(",anh@")[0])).toEqual([
      '1,"Bùi, ""Bé"" Minh"',
      '2,"Two\nLines"',
      '3,"Say ""hi"""',
    ]);
  });

  it("keeps the row order and the row numbers it is given", () => {
    const csv = buildUsersCsv([row({ rowNo: 41 }), row({ rowNo: 42 })]);
    expect(lines(csv).slice(1, 3).map((line) => line.split(",")[0])).toEqual(["41", "42"]);
  });
});
