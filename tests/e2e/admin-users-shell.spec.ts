import { expect, test, type Locator } from "@playwright/test";
import { ADMIN_PEOPLE, ADMIN_TOTALS } from "./support/admin-users-dataset.mjs";
import { AUTHED, pathOf } from "./support/authed-session";
import { COPY, FILTER_NAMES, LEVEL_VALUES, TID } from "./support/admin-users-contract";
import { cellIn, openUsers, rowOf, signInAs } from "./support/admin-users-helpers";

// Admin - User, ca 9 (account menu Dashboard), ca 10 (VI/EN), ca 11 (375 px). The non-admin "Profile + Sign out only" case stays
// in homepage-account-menu.spec.ts, unchanged.

test.describe("Admin - User: account menu (ca 9)", () => {
  test("an admin sees Dashboard between Profile and Sign out, and it opens the Users screen", async ({ page, request }) => {
    await signInAs(page, request, "admin");
    await page.goto(`${AUTHED}/`);
    await page.getByTestId("account-menu-button").click();
    const menu = page.getByRole("menu");
    await expect(menu.getByRole("menuitem")).toHaveText(["Profile", COPY.accountDashboard.vi, "Sign out"]);

    const dashboard = page.getByTestId(TID.accountDashboard);
    await expect(dashboard).toHaveAttribute("href", "/admin");
    await dashboard.click();
    await expect(page).toHaveURL(`${AUTHED}/admin/users`);
  });
});

test.describe("Admin - User: English (ca 10)", () => {
  test("labels follow NEXT_LOCALE; the column headers stay in English in both", async ({ page, request }) => {
    await openUsers(page, request, { locale: "en" });
    await expect(page.getByTestId(TID.title)).toHaveText(COPY.title.en);
    await expect(page.getByTestId(TID.exportLink)).toHaveText(COPY.exportLabel.en);
    for (const name of FILTER_NAMES) {
      await expect(page.getByTestId(TID.filter(name)), name).toHaveText(COPY.filterPlaceholder[name].en);
    }
    await expect(page.getByTestId(TID.search)).toHaveAttribute("placeholder", COPY.searchPlaceholder.en);
    await expect(page.getByTestId(TID.th("last-login"))).toContainText("Last Logged in");
    await expect(page.getByTestId(TID.total)).toHaveText(COPY.total.en(ADMIN_TOTALS.total));
    await expect(page.getByTestId(TID.footer)).toContainText(COPY.footer.en);
    await expect(page.getByTestId(TID.cell("role")).first()).toHaveText(COPY.roleLabel.admin.en);

    await page.getByTestId(TID.filter("level")).click();
    for (const value of LEVEL_VALUES) {
      await expect(page.getByTestId(TID.filterOption("level", String(value)))).toHaveText(COPY.levelLabel[value].en);
    }
    await page.keyboard.press("Escape");
  });
});

test.describe("Admin - User: 375 px (ca 11)", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("no sideways page scroll, the table scrolls in its own box, filters stack, targets are at least 44 px", async ({ page, request }) => {
    await openUsers(page, request);
    const pageFits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
    expect(pageFits, "page scrolls sideways").toBe(true);

    const scroller = page.getByTestId(TID.tableScroll);
    expect(await scroller.evaluate((el) => getComputedStyle(el).overflowX)).toMatch(/auto|scroll/);
    expect(await scroller.evaluate((el) => el.scrollWidth > el.clientWidth), "table is wider than the phone").toBe(true);

    const boxes = await Promise.all(FILTER_NAMES.map((name) => page.getByTestId(TID.filter(name)).boundingBox()));
    for (let i = 1; i < boxes.length; i += 1) {
      const prev = boxes[i - 1]!;
      expect(prev.y + prev.height, `${FILTER_NAMES[i - 1]} sits above ${FILTER_NAMES[i]}`).toBeLessThanOrEqual(boxes[i]!.y);
    }

    const exportBox = await page.getByTestId(TID.exportLink).boundingBox();
    expectTouchSize(exportBox, "Export");
    const actionBox = await rowOf(page, ADMIN_PEOPLE[0].user_id).getByTestId(TID.rowActions).boundingBox();
    expectTouchSize(actionBox, "row actions");
    await expect(cellIn(rowOf(page, ADMIN_PEOPLE[0].user_id), "role")).toBeVisible();
    expect(pathOf(page)).toBe("/admin/users");
  });
});

function expectTouchSize(box: Awaited<ReturnType<Locator["boundingBox"]>>, label: string) {
  expect(box, label).not.toBeNull();
  expect(box!.width, `${label} width`).toBeGreaterThanOrEqual(44);
  expect(box!.height, `${label} height`).toBeGreaterThanOrEqual(44);
}
