// Viết Kudos (#12) entry points: Widget quick-action menu (Homepage ID-54, FAB Sv7DFwBw1h: A Thể lệ, B Viết KUDOS, C ✕),
// Thể lệ panel (b1Filzi9i6) and pill A.1 on /sun-kudos. Selector contract: support/kudos-contract.ts (WIDGET, RULES, WRITE).
// Signed-in cases run on AUTHED (3103, fake Supabase) at "/", "/awards-information", "/sun-kudos"; guest cases on PAST (3101).
// Expected RED now: the widget is a bare button with no menu, so every case fails on its first menu/dialog assertion.
// Deferred (reason): TC_THELE_GUI_002/004 (button styling, hover) -> phase 06 visual comparison; TC_THELE_GUI_003 and
// TC_THELE_FUN_005 (disabled footer button) -> N/A, the panel has no disabled state (clarifications.md);
// ID-56 of Viết Kudo is not here either (see write-kudo.spec.ts).
import { test, expect, type Page } from "@playwright/test";
import { PAST, pathOf } from "./support/authed-session";
import {
  COMPOSE_PATHS, RULES, SEL, WIDGET, openAuthed, openWidgetMenu, rulesDialog, widgetMenu, writeDialog,
} from "./support/kudos-contract";

const openMenu = openWidgetMenu;
const openRules = async (page: Page) => {
  await openMenu(page);
  await widgetMenu(page).getByRole("button", { name: "Thể lệ", exact: true }).click();
  await expect(rulesDialog(page)).toBeVisible();
};

for (const path of COMPOSE_PATHS) {
  test.describe(`Widget quick actions on ${path}`, () => {
    test(`ID-54 widget opens the menu (Thể lệ, Viết KUDOS); red ✕ and Esc close it`, async ({ page, request }) => {
      await openAuthed(page, request, path);
      await openMenu(page);
      const menu = widgetMenu(page);
      await expect(menu.getByRole("button", { name: "Thể lệ", exact: true })).toBeVisible();
      await expect(menu.getByRole("button", { name: "Viết KUDOS", exact: true })).toBeVisible();
      await expect(page.getByTestId(WIDGET.close)).toBeVisible();

      await page.getByTestId(WIDGET.close).click();
      await expect(menu).toBeHidden();
      await expect(page.getByTestId(WIDGET.button)).toBeVisible();

      await openMenu(page);
      await page.keyboard.press("Escape");
      await expect(menu).toBeHidden();
      expect(pathOf(page)).toBe(path);
    });

    test(`FAB B (ID-0, ID-2) "Viết KUDOS" opens the Viết Kudo modal and stays on the page`, async ({ page, request }) => {
      await openAuthed(page, request, path);
      await openMenu(page);
      await widgetMenu(page).getByRole("button", { name: "Viết KUDOS", exact: true }).click();
      await expect(writeDialog(page)).toBeVisible();
      await expect(writeDialog(page).getByRole("heading", { name: "Gửi lời cám ơn và ghi nhận đến đồng đội" })).toBeVisible();
      expect(pathOf(page)).toBe(path);
    });

    test(`FAB A / TC_THELE_FUN_003, FUN_004 Thể lệ opens; "Đóng" closes it; "Viết KUDOS" closes it and opens the modal`, async ({ page, request }) => {
      await openAuthed(page, request, path);
      await openRules(page);
      const rules = rulesDialog(page);
      await rules.getByRole("button", { name: "Đóng", exact: true }).click();
      await expect(rules).toBeHidden();
      expect(pathOf(page)).toBe(path);

      await openRules(page);
      await rules.getByRole("button", { name: "Viết KUDOS", exact: true }).click();
      await expect(rules).toBeHidden();
      await expect(writeDialog(page)).toBeVisible();
    });
  });
}

test.describe("Thể lệ panel", () => {
  test("TC_THELE_GUI_001 panel shows title, description, reward list, 6 badges and the Đóng + Viết KUDOS footer", async ({ page, request }) => {
    await openAuthed(page, request, "/sun-kudos", { height: 1400 });
    await openRules(page);
    const rules = rulesDialog(page);
    await expect(rules.getByRole("heading", { name: RULES.title, exact: true })).toBeVisible();
    await expect(rules.getByTestId(RULES.badge)).toHaveCount(6);
    await expect(rules.getByRole("button", { name: "Đóng", exact: true })).toBeVisible();
    await expect(rules.getByRole("button", { name: "Viết KUDOS", exact: true })).toBeVisible();
  });

  test("TC_THELE_FUN_001 content taller than the panel scrolls to its end and back", async ({ page, request }) => {
    await openAuthed(page, request, "/sun-kudos", { width: 1280, height: 480 });
    await openRules(page);
    const scroller = rulesDialog(page).getByTestId(RULES.scroll);
    const metrics = () => scroller.evaluate((el) => ({ top: el.scrollTop, max: el.scrollHeight - el.clientHeight }));
    expect((await metrics()).max).toBeGreaterThan(0);
    const box = (await scroller.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, 5000);
    await expect.poll(async () => (await metrics()).top).toBe((await metrics()).max);
    await page.mouse.wheel(0, -5000);
    await expect.poll(async () => (await metrics()).top).toBe(0);
  });

  test("TC_THELE_FUN_002 content shorter than the panel does not scroll", async ({ page, request }) => {
    await openAuthed(page, request, "/sun-kudos", { width: 1440, height: 3200 });
    await openRules(page);
    const scroller = rulesDialog(page).getByTestId(RULES.scroll);
    expect(await scroller.evaluate((el) => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(0);
  });
});

test.describe("Pill A.1 on /sun-kudos", () => {
  test("clicking 'Hôm nay, bạn muốn gửi lời cảm ơn…' opens the Viết Kudo modal directly", async ({ page, request }) => {
    await openAuthed(page, request, "/sun-kudos");
    const pill = page.getByTestId(SEL.composeTrigger);
    await expect(pill, "pill A.1 must be an enabled control (today aria-disabled, display-only)").toBeEnabled();
    await pill.click();
    await expect(writeDialog(page)).toBeVisible();
    await expect(widgetMenu(page)).toBeHidden();
  });
});

test.describe("Guest on the public Homepage (ID-1)", () => {
  test("widget shows the menu; 'Viết KUDOS' is a link to /login and goes there", async ({ page }) => {
    await page.goto(`${PAST}/`);
    await openMenu(page);
    const write = widgetMenu(page).getByRole("link", { name: "Viết KUDOS", exact: true });
    await expect(write).toHaveAttribute("href", "/login");
    await write.click();
    await page.waitForURL((u) => u.pathname === "/login");
  });

  test("guest can open Thể lệ and close it", async ({ page }) => {
    await page.goto(`${PAST}/`);
    await openRules(page);
    await rulesDialog(page).getByRole("button", { name: "Đóng", exact: true }).click();
    await expect(rulesDialog(page)).toBeHidden();
    expect(pathOf(page)).toBe("/");
  });
});
