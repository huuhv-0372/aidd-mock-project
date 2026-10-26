// Tìm kiếm profile Sunner on the Sun* Kudos Live board: keyboard (↑ ↓ Enter, Escape, Tab), the magnifier, the combobox ARIA
// wiring, and the 375 / 1440 layout (pill under A.1, listbox overlap). Split from sun-kudos-profile-search.spec.ts to stay
// under 200 lines. Contract: support/kudos-contract.ts (PROFILE_SEARCH, profileSearch).
import { randomUUID } from "node:crypto";
import { test, expect, type APIRequestContext, type Locator, type Page } from "@playwright/test";
import { pathOf } from "./support/authed-session";
import { KUDOS_PATH, SEL, openProfileSearch, profileSearch } from "./support/kudos-contract";
import { profilePath } from "./support/profile-contract";
import { sunnerIdByName } from "./support/write-kudo-fixtures.mjs";

const { box, submit, listbox, options } = profileSearch;
/** The first, second and tenth suggestion for "Sunner Tester" (alphabetical by name, limit 10). */
const TESTER = (n: number) => String(sunnerIdByName(`Sunner Tester ${String(n).padStart(2, "0")}`));
/** True when the element at the centre of `el` is `el` or one of its children (nothing is painted over it). */
const onTop = (el: Locator) => el.evaluate((node) => {
  const r = node.getBoundingClientRect();
  const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
  return Boolean(hit && node.contains(hit));
});
const openTesters = async (page: Page, request: APIRequestContext, opts: { width?: number } = {}) => {
  await openProfileSearch(page, request, { sub: randomUUID(), width: opts.width });
  await box(page).fill("Sunner Tester");
  await expect(options(page)).toHaveCount(10);
};

test.describe("Tìm kiếm profile Sunner: keyboard", () => {
  test("Enter without a pick opens the first suggestion", async ({ page, request }) => {
    await openTesters(page, request);
    await box(page).press("Enter");
    await page.waitForURL((url) => url.pathname === profilePath(TESTER(1)));
  });

  test("ArrowDown then Enter opens row 1", async ({ page, request }) => {
    await openTesters(page, request);
    await box(page).press("ArrowDown");
    await box(page).press("Enter");
    await page.waitForURL((url) => url.pathname === profilePath(TESTER(1)));
  });

  test("ArrowDown twice then Enter opens row 2", async ({ page, request }) => {
    await openTesters(page, request);
    await box(page).press("ArrowDown");
    await box(page).press("ArrowDown");
    await box(page).press("Enter");
    await page.waitForURL((url) => url.pathname === profilePath(TESTER(2)));
  });

  test("ArrowUp from nothing picks the last row, ArrowDown on the last wraps to the first; aria tracks the pick", async ({ page, request }) => {
    await openTesters(page, request);
    await expect(box(page)).toHaveAttribute("aria-expanded", "true");
    expect(await box(page).getAttribute("aria-controls")).toBe(await listbox(page).getAttribute("id"));
    await box(page).press("ArrowUp");
    const last = options(page).nth(9);
    await expect(last).toHaveAttribute("aria-selected", "true");
    expect(await last.getAttribute("id")).toBeTruthy();
    await expect(box(page)).toHaveAttribute("aria-activedescendant", (await last.getAttribute("id")) as string);
    await box(page).press("ArrowDown");
    const first = options(page).first();
    await expect(first).toHaveAttribute("aria-selected", "true");
    await expect(box(page)).toHaveAttribute("aria-activedescendant", (await first.getAttribute("id")) as string);
    await expect(last).not.toHaveAttribute("aria-selected", "true");
  });

  test("the magnifier does the same as Enter: opens the first suggestion", async ({ page, request }) => {
    await openTesters(page, request);
    await submit(page).click();
    await page.waitForURL((url) => url.pathname === profilePath(TESTER(1)));
  });

  test("Escape closes the list and keeps the text; Tab closes it too", async ({ page, request }) => {
    await openProfileSearch(page, request, { sub: randomUUID() });
    await box(page).fill("Nguyễn Văn");
    await expect(options(page).first()).toBeVisible();
    await box(page).press("Escape");
    await expect(listbox(page)).toBeHidden();
    await expect(box(page)).toHaveValue("Nguyễn Văn");
    await box(page).fill("Nguyễn Văn B");
    await expect(options(page).first()).toBeVisible();
    await box(page).press("Tab");
    await expect(listbox(page)).toBeHidden();
    expect(pathOf(page)).toBe(KUDOS_PATH);
  });

  test("375px: pill under A.1 at the same width, no horizontal scroll, listbox as wide as the pill, rows and magnifier at least 44px", async ({ page, request }) => {
    await openProfileSearch(page, request, { sub: randomUUID(), width: 375 });
    const a1 = (await page.getByTestId(SEL.composeTrigger).boundingBox())!;
    const pill = (await profileSearch.shell(page).boundingBox())!;
    expect(pill.y).toBeGreaterThanOrEqual(a1.y + a1.height);
    expect(Math.abs(pill.width - a1.width)).toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    await box(page).fill("Sunner Tester");
    await expect(options(page)).toHaveCount(10);
    const list = (await listbox(page).boundingBox())!;
    expect(Math.abs(list.width - pill.width)).toBeLessThanOrEqual(1);
    for (const row of await options(page).all()) expect((await row.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    const mag = (await submit(page).boundingBox())!;
    expect(mag.width).toBeGreaterThanOrEqual(44);
    expect(mag.height).toBeGreaterThanOrEqual(44);
    // The combobox is the tap target for typing: its own box must be 44px tall (expected 56 at 375; the pill is 58 with its border).
    expect((await box(page).boundingBox())!.height, "combobox tap target").toBeGreaterThanOrEqual(44);
  });

  test("1440px: the combobox is at least 44px tall and fills the pill (inside its 1px border)", async ({ page, request }) => {
    await openProfileSearch(page, request, { sub: randomUUID(), width: 1440 });
    const input = (await box(page).boundingBox())!;
    const pill = (await box(page).locator("xpath=..").boundingBox())!; // the rounded pill div around the magnifier and the input
    expect(input.height, "combobox tap target").toBeGreaterThanOrEqual(44);
    expect(input.height, "input fills the pill").toBeGreaterThanOrEqual(pill.height - 2);
  });

  test("the first row is the topmost element at its centre at 375 and at 1440 (the Highlight banner does not cover it)", async ({ page, request }) => {
    for (const width of [375, 1440]) {
      await openTesters(page, request, { width });
      await expect(options(page).first()).toBeVisible();
      expect(await onTop(options(page).first()), `width ${width}: first row covered`).toBe(true);
    }
  });
});
