import { test, expect, type Page } from "@playwright/test";
import { PAST } from "./support/authed-session";

// VI/EN language switch (MoMorph homepage ID-10/24/25/26/58, login language rows).
// Locale lives in the NEXT_LOCALE cookie; public URLs never change. Only the English strings listed
// in clarifications.md (confirmed MoMorph localizations) are asserted here.
// Selector contract: trigger getByTestId('language-selector') shows the flag (testid language-flag)
// and code; listbox getByRole('listbox') holds exactly two getByRole('option') named 'VN' and 'EN',
// each containing an svg flag. Guest runs use the PAST server (3101); signed-in runs live in
// language-switch-authed.spec.ts (AUTHED server, 3103).

const LOCALE_COOKIE_NAME = "NEXT_LOCALE";

const trigger = (page: Page) => page.getByTestId("language-selector");
const option = (page: Page, code: "VN" | "EN") =>
  page.getByRole("listbox").getByRole("option", { name: code, exact: true });

async function selectLocale(page: Page, code: "VN" | "EN") {
  await trigger(page).click();
  await option(page, code).click();
}

async function expectHtmlLang(page: Page, lang: "vi" | "en") {
  await expect(page.locator("html")).toHaveAttribute("lang", lang);
}

test.describe("Language switch: guest homepage", () => {
  test("ID-10: default is VN with the Vietnamese UI on /", async ({ page }) => {
    await page.goto(`${PAST}/`);
    await expect(trigger(page)).toContainText("VN");
    await expect(trigger(page).getByTestId("language-flag")).toBeVisible();
    await expectHtmlLang(page, "vi");
    await expect(page.getByRole("contentinfo")).toContainText("Tiêu chuẩn chung");
  });

  test("ID-24/ID-58: dropdown lists exactly VN and EN, each with a flag", async ({ page }) => {
    await page.goto(`${PAST}/`);
    await trigger(page).click();
    const options = page.getByRole("listbox").getByRole("option");
    await expect(options).toHaveCount(2);
    await expect(options).toHaveText(["VN", "EN"]);
    for (const code of ["VN", "EN"] as const) {
      await expect(option(page, code).locator("svg")).not.toHaveCount(0);
    }
  });

  test("ID-25: choosing EN keeps the URL, switches UI strings and html lang", async ({ page }) => {
    await page.goto(`${PAST}/`);
    await selectLocale(page, "EN");
    await expectHtmlLang(page, "en");
    await expect(page).toHaveURL(`${PAST}/`);
    await expect(trigger(page)).toContainText("EN");
    const footer = page.getByRole("contentinfo");
    await expect(footer).toContainText("General standards");
    await expect(footer).toContainText("Copyright © Sun* 2025");
    await expect(page.getByText("Time:", { exact: true })).toBeVisible();
    await expect(page.getByText("Venue:", { exact: true })).toBeVisible();
    await expect(page.getByText("Recognition Movement", { exact: true })).toBeVisible();
  });

  test("EN survives reload on /", async ({ page }) => {
    await page.goto(`${PAST}/`);
    await selectLocale(page, "EN");
    await expectHtmlLang(page, "en");
    await page.reload();
    await expect(page).toHaveURL(`${PAST}/`);
    await expectHtmlLang(page, "en");
    await expect(trigger(page)).toContainText("EN");
    await expect(page.getByRole("contentinfo")).toContainText("General standards");
  });

  test("ID-26: choosing VN again restores the Vietnamese UI", async ({ page }) => {
    await page.goto(`${PAST}/`);
    await selectLocale(page, "EN");
    await expectHtmlLang(page, "en");
    // lang flips as soon as the reloaded HTML parses; wait for its scripts before clicking again.
    await page.waitForLoadState("load");
    await selectLocale(page, "VN");
    await expectHtmlLang(page, "vi");
    await expect(trigger(page)).toContainText("VN");
    await expect(page.getByRole("contentinfo")).toContainText("Tiêu chuẩn chung");
  });
});

test.describe("Language switch: other tabs", () => {
  test("a switch in one tab reloads the other tab into the new locale with a single tree", async ({
    context,
  }) => {
    const pageA = await context.newPage();
    const pageB = await context.newPage();
    await pageA.goto(`${PAST}/`);
    await pageB.goto(`${PAST}/`);
    await expectHtmlLang(pageB, "vi");

    await selectLocale(pageA, "EN");
    await expectHtmlLang(pageA, "en");

    // Page B was never touched: it must reload itself, not keep a hidden old-locale tree mounted.
    await expectHtmlLang(pageB, "en");
    await expect(trigger(pageB)).toContainText("EN");
    await expect(trigger(pageB)).toHaveCount(1);
  });
});

test.describe("Language switch: failure", () => {
  test("a failed setLocale call keeps the page, closes the menu and logs a generic error", async ({ page }) => {
    await page.goto(`${PAST}/`);
    // Server Action requests are POSTs carrying the Next-Action header; drop them on the floor.
    await page.route(`${PAST}/**`, (route) =>
      route.request().method() === "POST" && route.request().headers()["next-action"]
        ? route.abort()
        : route.fallback(),
    );
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    // A real reload wipes this marker; same-document history updates do not.
    await page.evaluate(() => Object.assign(window, { __beforeSwitch: true }));

    await selectLocale(page, "EN");
    await expect.poll(() => errors.some((e) => e.includes("could not switch the language"))).toBe(true);
    expect(await page.evaluate(() => "__beforeSwitch" in window)).toBe(true);
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expectHtmlLang(page, "vi");
    await expect(trigger(page)).toContainText("VN");
  });
});

test.describe("Language switch: login (guest)", () => {
  test("choosing EN on /login switches the page language", async ({ page }) => {
    await page.goto(`${PAST}/login`);
    await selectLocale(page, "EN");
    await expectHtmlLang(page, "en");
    await expect(page).toHaveURL(`${PAST}/login`);
    await expect(trigger(page)).toContainText("EN");
  });
});

test.describe("Language switch: cookie", () => {
  test("choosing EN writes an httpOnly, SameSite=Lax NEXT_LOCALE=en cookie", async ({ page }) => {
    await page.goto(`${PAST}/`);
    await selectLocale(page, "EN");
    await expect(page.getByRole("contentinfo")).toContainText("General standards");
    const cookies = await page.context().cookies(PAST);
    expect(cookies.find((c) => c.name === LOCALE_COOKIE_NAME)).toMatchObject({
      value: "en",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    });
  });
});

test.describe("Language switch: keyboard", () => {
  test("ArrowDown opens on the selected option, Escape closes to the trigger, Enter picks EN", async ({ page }) => {
    await page.goto(`${PAST}/`);
    await trigger(page).focus();
    await page.keyboard.press("ArrowDown");
    await expect(option(page, "VN")).toBeFocused();
    await expect(option(page, "VN")).toHaveAttribute("aria-selected", "true");

    await page.keyboard.press("Escape");
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(trigger(page)).toBeFocused();
    await expect(trigger(page)).toHaveAttribute("aria-expanded", "false");

    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await expect(option(page, "EN")).toBeFocused();
    await page.keyboard.press("ArrowDown"); // wraps
    await expect(option(page, "VN")).toBeFocused();
    await page.keyboard.press("End");
    await expect(option(page, "EN")).toBeFocused();
    await page.keyboard.press("Home");
    await expect(option(page, "VN")).toBeFocused();
    await page.keyboard.press("ArrowUp"); // wraps
    await expect(option(page, "EN")).toBeFocused();

    await page.keyboard.press("Enter");
    await expectHtmlLang(page, "en");
    await expect(trigger(page)).toContainText("EN");
  });

  test("Tab closes the menu without choosing", async ({ page }) => {
    await page.goto(`${PAST}/`);
    await trigger(page).focus();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("listbox")).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expectHtmlLang(page, "vi");
  });
});
