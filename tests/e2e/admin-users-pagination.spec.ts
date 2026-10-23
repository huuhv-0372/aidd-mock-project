import { expect, test } from "@playwright/test";
import { ADMIN_TOTALS } from "./support/admin-users-dataset.mjs";
import { COPY, PAGE_SIZE, TID } from "./support/admin-users-contract";
import { columnTexts, openUsers, rows } from "./support/admin-users-helpers";

// Admin - User, ca 6 (clarifications: 20 rows a page, server-side paging, filters and sort kept across pages).
// Expected rows come from the fixture: 45 rows -> pages of 20, 20 and 5.

test.describe("Admin - User: pagination (ca 6)", () => {
  test("page 1 holds rows 1-20; previous is unavailable; the page links show 1, 2 and 3", async ({ page, request }) => {
    await openUsers(page, request);
    await expect(rows(page)).toHaveCount(PAGE_SIZE);
    expect(await columnTexts(page, "id")).toEqual(Array.from({ length: PAGE_SIZE }, (_, i) => String(i + 1)));
    await expect(page.getByTestId(TID.total)).toHaveText(COPY.total.vi(ADMIN_TOTALS.total));
    await expect(page.getByTestId(TID.pagePrev)).toHaveAttribute("aria-disabled", "true");
    await expect(page.getByTestId(TID.page(1))).toHaveAttribute("aria-current", "page");
    await expect(page.getByTestId(TID.page(2))).toHaveAttribute("href", /[?&]page=2(&|$)/);
    await expect(page.getByTestId(TID.page(3))).toHaveAttribute("href", /[?&]page=3(&|$)/);
  });

  test("next walks page 2 (rows 21-40) to page 3 (rows 41-45), where next is unavailable", async ({ page, request }) => {
    await openUsers(page, request);
    await page.getByTestId(TID.pageNext).click();
    await expect(page).toHaveURL(/[?&]page=2(&|$)/);
    await expect(page.getByTestId(TID.page(2))).toHaveAttribute("aria-current", "page");
    expect(await columnTexts(page, "id")).toEqual(Array.from({ length: 20 }, (_, i) => String(21 + i)));

    await page.getByTestId(TID.pageNext).click();
    await expect(page).toHaveURL(/[?&]page=3(&|$)/);
    expect(await columnTexts(page, "id")).toEqual(Array.from({ length: 5 }, (_, i) => String(41 + i)));
    await expect(page.getByTestId(TID.pageNext)).toHaveAttribute("aria-disabled", "true");
    await expect(page.getByTestId(TID.total)).toHaveText(COPY.total.vi(ADMIN_TOTALS.total));
  });

  test("paging keeps the sort in the URL and in the header", async ({ page, request }) => {
    await openUsers(page, request, { query: "sort=sent&dir=desc" });
    await page.getByTestId(TID.pageNext).click();
    await expect(page).toHaveURL(/[?&]sort=sent(&|$)/);
    await expect(page).toHaveURL(/[?&]dir=desc(&|$)/);
    await expect(page.getByTestId(TID.th("sent"))).toHaveAttribute("aria-sort", "descending");
    await expect(page.getByTestId(TID.page(2))).toHaveAttribute("aria-current", "page");
  });

  test("a page past the end is an empty state with a link back to page 1", async ({ page, request }) => {
    await openUsers(page, request, { query: "page=99" });
    await expect(page.getByTestId(TID.empty)).toContainText(COPY.empty.vi);
    await expect(rows(page)).toHaveCount(0);
    await page.getByTestId(TID.emptyFirstPage).click();
    await expect(page.getByTestId(TID.page(1))).toHaveAttribute("aria-current", "page");
    await expect(rows(page)).toHaveCount(PAGE_SIZE);
  });
});
