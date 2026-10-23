import { expect, test, type Page } from "@playwright/test";
import { ADMIN_TOTALS } from "./support/admin-users-dataset.mjs";
import { AUTHED } from "./support/authed-session";
import { COPY, SEARCH_MAX, TID, UNIT_CODE, type FilterName } from "./support/admin-users-contract";
import { ADMIN_USERS_PATH, columnTexts, openUsers, rows } from "./support/admin-users-helpers";

// Admin - User, ca 5 (clarifications: filters, search escaping, debounce, URL clamp). Filters live in the URL: each test
// asserts the final URL and the final result only. No test waits for "no request yet" (debounce is 300 ms).

const pick = async (page: Page, name: FilterName, value: string) => {
  await page.getByTestId(TID.filter(name)).click();
  await page.getByTestId(TID.filterOption(name, value)).click();
};

test.describe("Admin - User: filters and search (ca 5)", () => {
  test("Unit filter: picking a unit puts it in the URL and narrows the total", async ({ page, request }) => {
    await openUsers(page, request);
    await pick(page, "unit", UNIT_CODE);
    await expect(page).toHaveURL(new RegExp(`[?&]unit=${UNIT_CODE}(&|$)`));
    await expect(page.getByTestId(TID.filter("unit"))).toHaveText(UNIT_CODE);
    await expect(page.getByTestId(TID.total)).toHaveText(COPY.total.vi(ADMIN_TOTALS.unitCevc2));
  });

  test("Level filter: every visible row shows that level", async ({ page, request }) => {
    await openUsers(page, request);
    await pick(page, "level", "4");
    await expect(page).toHaveURL(/[?&]level=4(&|$)/);
    await expect(page.getByTestId(TID.total)).toHaveText(COPY.total.vi(ADMIN_TOTALS.level4));
    await expect(page.getByTestId(TID.cell("level"))).toHaveText(Array(ADMIN_TOTALS.level4).fill("4"));
  });

  test("Role filter: Admin lists the two admins only", async ({ page, request }) => {
    await openUsers(page, request);
    await pick(page, "role", "admin");
    await expect(page).toHaveURL(/[?&]role=admin(&|$)/);
    await expect(page.getByTestId(TID.total)).toHaveText(COPY.total.vi(ADMIN_TOTALS.adminCount));
    await expect(rows(page)).toHaveCount(ADMIN_TOTALS.adminCount);
    expect(await columnTexts(page, "role")).toEqual(Array(ADMIN_TOTALS.adminCount).fill(COPY.roleLabel.admin.vi));
  });

  test("clearing every filter and the search returns to the bare URL and the full list", async ({ page, request }) => {
    await openUsers(page, request, { query: "unit=CEVC2&level=1&role=user&q=anh" });
    await pick(page, "unit", "all");
    await pick(page, "level", "all");
    await pick(page, "role", "all");
    await page.getByTestId(TID.search).fill("");
    await expect(page).toHaveURL(`${AUTHED}${ADMIN_USERS_PATH}`);
    await expect(page.getByTestId(TID.total)).toHaveText(COPY.total.vi(ADMIN_TOTALS.total));
  });

  test("search matches name or email; the final URL and result are what count", async ({ page, request }) => {
    await openUsers(page, request);
    await page.getByTestId(TID.search).fill("phuong.anh");
    await expect(page).toHaveURL(/[?&]q=phuong\.anh(&|$)/);
    await expect(page.getByTestId(TID.total)).toHaveText(COPY.total.vi(1));
  });

  test("% and _ in the search are plain characters, not wildcards", async ({ page, request }) => {
    await openUsers(page, request);
    const search = page.getByTestId(TID.search);
    await search.fill("%");
    await expect(page).toHaveURL(/[?&]q=%25(&|$)/);
    await expect(page.getByTestId(TID.empty)).toBeVisible();
    await expect(rows(page)).toHaveCount(0);

    await search.fill("_");
    await expect(page).toHaveURL(/[?&]q=_(&|$)/);
    await expect(page.getByTestId(TID.empty)).toBeVisible();
    await expect(rows(page)).toHaveCount(0);
  });

  test("invalid URL values are dropped or clamped, and the page still answers 200", async ({ page, request }) => {
    const { response } = await openUsers(page, request, { query: "level=9&dir=x&sort=bogus&page=-1" });
    expect(response?.status()).toBe(200);
    await expect(page.getByTestId(TID.total)).toHaveText(COPY.total.vi(ADMIN_TOTALS.total));
    await expect(page.getByTestId(TID.th("sent"))).toHaveAttribute("aria-sort", "none");
    await expect(page.getByTestId(TID.page(1))).toHaveAttribute("aria-current", "page");
  });

  test("a search longer than the limit is clamped to the limit", async ({ page, request }) => {
    const long = "a".repeat(SEARCH_MAX + 50);
    const { response } = await openUsers(page, request, { query: `q=${long}` });
    expect(response?.status()).toBe(200);
    await expect(page.getByTestId(TID.search)).toHaveValue(new RegExp(`^a{${SEARCH_MAX}}$`));
  });
});
