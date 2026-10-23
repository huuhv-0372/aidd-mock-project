import { expect, test } from "@playwright/test";
import { ADMIN_PATH, ADMIN_USERS_PATH } from "../../lib/navigation/routes";
import { AUTHED, PAST, pathOf } from "./support/authed-session";
import { ADMIN_PEOPLE, ADMIN_TOTALS } from "./support/admin-users-dataset.mjs";
import { COLUMNS, COPY, FILTER_NAMES, TAB_KEYS, TID } from "./support/admin-users-contract";
import { FAKE, digitsOf, isRed, openUsers, rgbOf, rowOf, rows, cellIn, signInAs, setLocale } from "./support/admin-users-helpers";

// Admin - User (plans/261023-1207-admin-user-management, clarifications.md). Ca 1 access, ca 2 frame, ca 3 row data.
// Figma: figma/admin-user-773-26403.png. Every selector and string comes from support/admin-users-contract.ts.

// Substrings that exist only in the fixture list. A 403 page must contain none of them.
const LEAK_PROBES = ["nguyen.thi.phuong.anh", "le.huu.quan.tri", "Nguyễn Thị Phương Anh", "@sun-asterisk.com"];

test.describe("Admin - User: access (ca 1)", () => {
  test("guest on /admin and /admin/users is sent to /login", async ({ page }) => {
    for (const path of [ADMIN_PATH, ADMIN_USERS_PATH]) {
      await page.goto(`${PAST}${path}`);
      expect(pathOf(page), path).toBe("/login");
    }
  });

  test("signed-in user gets HTTP 403 on /admin and /admin/users, with no user data in the HTML", async ({ page, request }) => {
    await signInAs(page, request, "user");
    for (const path of [ADMIN_PATH, ADMIN_USERS_PATH]) {
      const response = await page.goto(`${AUTHED}${path}`);
      expect(response?.status(), path).toBe(403);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(COPY.forbiddenTitle.vi);
      const html = await page.content();
      for (const probe of LEAK_PROBES) expect(html, `${path} leaks ${probe}`).not.toContain(probe);
    }
  });

  test("admin on /admin is redirected to the Users screen", async ({ page, request }) => {
    await signInAs(page, request, "admin");
    await page.goto(`${AUTHED}${ADMIN_PATH}`);
    expect(pathOf(page)).toBe(ADMIN_USERS_PATH);
  });
});

test.describe("Admin - User: frame (ca 2)", () => {
  test("header tabs: User is current, the other three are disabled and do not navigate", async ({ page, request }) => {
    await openUsers(page, request);
    await expect(page.getByTestId(TID.header)).toBeVisible();
    await expect(page.getByTestId(TID.headerLabel)).toHaveText(COPY.headerLabel.vi);
    for (const key of TAB_KEYS) await expect(page.getByTestId(TID.tab(key))).toHaveText(COPY.tabs[key].vi);

    const user = page.getByTestId(TID.tab("user"));
    await expect(user).toHaveAttribute("aria-current", "page");
    for (const key of TAB_KEYS.filter((k) => k !== "user")) {
      const tab = page.getByTestId(TID.tab(key));
      await expect(tab, key).toHaveAttribute("aria-disabled", "true");
      expect(await tab.getAttribute("href"), `${key} has no href`).toBeNull();
      await tab.click();
      expect(pathOf(page)).toBe(ADMIN_USERS_PATH);
    }
  });

  test("title, Export link, three filters with placeholders, search, footer", async ({ page, request }) => {
    await openUsers(page, request);
    await expect(page.getByTestId(TID.title)).toHaveText(COPY.title.vi);
    const exportLink = page.getByTestId(TID.exportLink);
    await expect(exportLink).toHaveText(COPY.exportLabel.vi);
    await expect(exportLink).toHaveAttribute("href", /^\/admin\/users\/export\?/);

    for (const name of FILTER_NAMES) {
      // The visible label must be the field's own label (first aria-labelledby id), not just some text on the page:
      // the table has "Level" / "Role" headers too.
      const field = page.getByTestId(TID.filter(name));
      const labelId = (await field.getAttribute("aria-labelledby"))?.split(" ")[0] ?? "";
      const label = page.locator(`[id="${labelId}"]`);
      await expect(label, name).toHaveText(COPY.filterLabel[name]);
      await expect(label, name).toBeVisible();
      await expect(field, name).toHaveText(COPY.filterPlaceholder[name].vi);
    }
    await expect(page.getByTestId(TID.search)).toHaveAttribute("placeholder", COPY.searchPlaceholder.vi);
    await expect(page.getByTestId(TID.footer)).toContainText(COPY.footer.vi);
  });

  test("12 columns in Figma order, sum headers equal the whole filtered result, total is 45", async ({ page, request }) => {
    await openUsers(page, request);
    const headers = page.locator(`[data-testid^="admin-th-"]`);
    await expect(headers).toHaveCount(COLUMNS.length);
    await expect(headers).toContainText(COLUMNS.map((c) => c.label));

    await expect(page.getByTestId(TID.sum("sent"))).toBeVisible();
    expect(digitsOf(await page.getByTestId(TID.sum("sent")).innerText())).toBe(ADMIN_TOTALS.sent);
    expect(digitsOf(await page.getByTestId(TID.sum("received")).innerText())).toBe(ADMIN_TOTALS.received);
    await expect(page.getByTestId(TID.total)).toHaveText(COPY.total.vi(ADMIN_TOTALS.total));

    // Sortable columns carry a sort link; the others do not.
    for (const col of COLUMNS) {
      const link = page.getByTestId(TID.sort(col.key));
      if (col.sort) await expect(link, col.key).toHaveCount(1);
      else await expect(link, col.key).toHaveCount(0);
    }
  });
});

test.describe("Admin - User: row data (ca 3)", () => {
  test("20 rows on page 1, ID is the row number, dates in Vietnam time, '-' when empty", async ({ page, request }) => {
    await openUsers(page, request);
    await expect(rows(page)).toHaveCount(20);
    await expect(page.locator(`[data-testid="${TID.cell("id")}"]`)).toHaveText(
      Array.from({ length: 20 }, (_, i) => String(i + 1)),
    );

    // Fixture person 0: last sign-in 2026-10-05T02:30Z = 05/10/2026 09:30 (UTC+7); six badges, time 2026-09-20T08:15Z = 20/09/2026 15:15.
    const p0 = ADMIN_PEOPLE[0];
    const row0 = rowOf(page, p0.user_id);
    await expect(cellIn(row0, "user")).toHaveText(p0.full_name);
    await expect(cellIn(row0, "email")).toHaveText(p0.email);
    await expect(cellIn(row0, "last-login").getByTestId(TID.cellDate("last-login"))).toHaveText("05/10/2026");
    await expect(cellIn(row0, "last-login").getByTestId(TID.cellTime("last-login"))).toHaveText("09:30");
    await expect(cellIn(row0, "time6").getByTestId(TID.cellDate("time6"))).toHaveText("20/09/2026");
    await expect(cellIn(row0, "time6").getByTestId(TID.cellTime("time6"))).toHaveText("15:15");
    await expect(cellIn(row0, "role")).toHaveText(COPY.roleLabel.user.vi);

    // Fixture person 10: never signed in, fewer than six badges.
    const p10 = ADMIN_PEOPLE[10];
    const row10 = rowOf(page, p10.user_id);
    await expect(cellIn(row10, "last-login")).toHaveText("-");
    await expect(cellIn(row10, "time6")).toHaveText("-");
    await expect(cellIn(row10, "last-login").getByTestId(TID.cellDate("last-login"))).toHaveCount(0);
  });

  test("Total Heart is red, role reads Admin or User, the viewer's own row is row 1", async ({ page, request }) => {
    const { sub } = await openUsers(page, request);
    await expect(rows(page).first()).toHaveAttribute("data-user-id", sub);
    await expect(cellIn(rows(page).first(), "role")).toHaveText(COPY.roleLabel.admin.vi);

    const heart = cellIn(rowOf(page, ADMIN_PEOPLE[0].user_id), "hearts");
    const color = await heart.evaluate((el) => getComputedStyle(el).color);
    expect(isRed(rgbOf(color)), `Total Heart colour ${color}`).toBe(true);

    // Fixture person 1 is the second admin.
    await expect(cellIn(rowOf(page, ADMIN_PEOPLE[1].user_id), "role")).toHaveText(COPY.roleLabel.admin.vi);
  });

  test("a failed list read shows one generic alert, no table, and no server detail", async ({ page, request }) => {
    const sub = await signInAs(page, request, "admin");
    expect((await request.get(`${FAKE}/__admin-list-fail?sub=${sub}&on=1`)).ok()).toBe(true);
    await setLocale(page, "vi");
    await page.goto(`${AUTHED}${ADMIN_USERS_PATH}`);
    await expect(page.getByTestId(TID.listError)).toHaveText(COPY.listFailed.vi);
    await expect(page.getByTestId(TID.table)).toHaveCount(0);
    expect(await page.content()).not.toContain("boom-secret-detail");
  });
});
