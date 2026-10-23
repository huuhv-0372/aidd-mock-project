import { expect, test } from "@playwright/test";
import { TID } from "./support/admin-users-contract";
import { collectColumn, collectUserIds, dateKey, openUsers, rows } from "./support/admin-users-helpers";

// Admin - User, ca 4 (clarifications: sort keys, null last, default order, tie-break). Read across all three pages of a query,
// so a sort that is right on page 1 but wrong on page 2 fails here.
const ALL_PAGES = 3;

test.describe("Admin - User: sort (ca 4)", () => {
  test("default order is created_at ascending: the viewer's own row is first and no sort is active", async ({ page, request }) => {
    const { sub } = await openUsers(page, request);
    await expect(rows(page).first()).toHaveAttribute("data-user-id", sub);
    await expect(page.getByTestId(TID.th("sent"))).toHaveAttribute("aria-sort", "none");
    expect(await page.getByTestId(TID.th("user")).getAttribute("aria-sort"), "User is not sortable").toBeNull();
  });

  test("first click sorts sent descending, second click ascending, order holds on every page", async ({ page, request }) => {
    await openUsers(page, request);
    const th = page.getByTestId(TID.th("sent"));

    await page.getByTestId(TID.sort("sent")).click();
    await expect(page).toHaveURL(/[?&]sort=sent&dir=desc/);
    await expect(th).toHaveAttribute("aria-sort", "descending");
    const desc = (await collectColumn(page, "sort=sent&dir=desc", "sent", ALL_PAGES)).map(Number);
    expect(desc).toHaveLength(45);
    expect(desc).toEqual([...desc].sort((a, b) => b - a));

    await page.getByTestId(TID.sort("sent")).click();
    await expect(page).toHaveURL(/[?&]sort=sent&dir=asc/);
    await expect(th).toHaveAttribute("aria-sort", "ascending");
    const asc = (await collectColumn(page, "sort=sent&dir=asc", "sent", ALL_PAGES)).map(Number);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
  });

  test("empty dates sort last in both directions (time to 6 badges, last logged in)", async ({ page, request }) => {
    await openUsers(page, request);
    for (const [query, col] of [
      ["sort=time6&dir=desc", "time6"],
      ["sort=last_login&dir=asc", "last-login"],
    ] as const) {
      const texts = await collectColumn(page, query, col, ALL_PAGES);
      const keys = texts.map((t) => dateKey(t));
      const firstEmpty = keys.indexOf(null);
      expect(firstEmpty, `${query}: some rows have no date`).toBeGreaterThan(0);
      expect(keys.slice(firstEmpty).every((k) => k === null), `${query}: a date after an empty value`).toBe(true);
      const dated = keys.filter((k): k is string => k !== null);
      const sorted = [...dated].sort();
      expect(dated, query).toEqual(query.endsWith("desc") ? sorted.reverse() : sorted);
    }
  });

  test("a sort click goes back to page 1 and keeps the sort", async ({ page, request }) => {
    await openUsers(page, request, { query: "page=2" });
    await expect(page.getByTestId(TID.page(2))).toHaveAttribute("aria-current", "page");
    await page.getByTestId(TID.sort("sent")).click();
    await expect(page).toHaveURL(/[?&]sort=sent&dir=desc/);
    expect(new URL(page.url()).searchParams.get("page") ?? "1").toBe("1");
    await expect(page.getByTestId(TID.page(1))).toHaveAttribute("aria-current", "page");
  });

  test("tied values keep one stable order: every user appears once across pages, same order on every read", async ({ page, request }) => {
    await openUsers(page, request);
    const query = "sort=level&dir=desc";
    const first = await collectUserIds(page, query, ALL_PAGES);
    const second = await collectUserIds(page, query, ALL_PAGES);
    expect(new Set(first).size).toBe(45);
    expect(second).toEqual(first);
  });
});
