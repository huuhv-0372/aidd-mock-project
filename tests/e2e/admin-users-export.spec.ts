import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { ADMIN_TOTALS } from "./support/admin-users-dataset.mjs";
import { AUTHED, PAST, pathOf } from "./support/authed-session";
import { CSV_HEADER, EXPORT_FILENAME, TID } from "./support/admin-users-contract";
import { openUsers, signInAs } from "./support/admin-users-helpers";

// Admin - User, ca 8 (clarifications: CSV rules). The file is read from the browser download, not from the fake.
const BOM = [0xef, 0xbb, 0xbf];

/** Clicks Export and returns the downloaded CSV as text (BOM kept) and its name. */
async function downloadCsv(page: Page) {
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId(TID.exportLink).click()]);
  const bytes = readFileSync(await download.path());
  return { name: download.suggestedFilename(), bytes, text: bytes.toString("utf8") };
}

const dataLines = (text: string) => text.slice(1).split("\r\n").filter((line) => line.length > 0);

test.describe("Admin - User: CSV export (ca 8)", () => {
  test("Export downloads users-YYYYMMDD.csv with a UTF-8 BOM, the fixed header and one line per filtered row", async ({ page, request }) => {
    await openUsers(page, request);
    const csv = await downloadCsv(page);
    expect(csv.name).toMatch(EXPORT_FILENAME);
    expect([...csv.bytes.subarray(0, 3)]).toEqual(BOM);
    const lines = dataLines(csv.text);
    expect(lines[0]).toBe(CSV_HEADER.join(","));
    expect(lines.length - 1, "every row of the filtered result, not one page").toBe(ADMIN_TOTALS.total);
    expect(lines[1].startsWith("1,"), "ID is the row number, the viewer first").toBe(true);
    expect(csv.text.includes("\r\n") && !/[^\r]\n/.test(csv.text), "CRLF line endings").toBe(true);
  });

  test("export follows the filters in the URL", async ({ page, request }) => {
    await openUsers(page, request, { query: "role=admin" });
    const csv = await downloadCsv(page);
    expect(dataLines(csv.text)).toHaveLength(ADMIN_TOTALS.adminCount + 1);
  });

  test("formula-looking cells get an apostrophe, and commas and quotes are wrapped and doubled", async ({ page, request }) => {
    await openUsers(page, request);
    const { text } = await downloadCsv(page);
    for (const cell of ["'=1+1 Hoàng Đức", "'+1 Phạm Bảo", "'-1 Đặng Ngọc", "'@x Vũ Khánh"]) {
      expect(text, cell).toContain(cell);
    }
    expect(text).toContain('"Bùi, ""Bé"" Minh"');
  });

  test("a signed-in user who opens the export URL directly gets 403", async ({ page, request }) => {
    await signInAs(page, request, "user");
    const response = await page.request.get(`${AUTHED}/admin/users/export`);
    expect(response.status()).toBe(403);
    expect(await response.text()).not.toContain("@sun-asterisk.com");
  });

  test("a guest who opens the export URL is sent to /login", async ({ page }) => {
    await page.goto(`${PAST}/admin/users/export`);
    expect(pathOf(page)).toBe("/login");
  });
});
