import { test, expect, type Page } from "@playwright/test";
import { AUTHED, signIn } from "./support/authed-session";

// VI/EN language switch for a signed-in user on the AUTHED server (3103): header with bell + account
// menu, client-side navigation after a switch, and the localised 404. Selector contract as in
// language-switch.spec.ts (trigger getByTestId('language-selector'), options 'VN' / 'EN').

const LOCALE_COOKIE_NAME = "NEXT_LOCALE";

async function expectHtmlLang(page: Page, lang: "vi" | "en") {
  await expect(page.locator("html")).toHaveAttribute("lang", lang);
}

test.describe("Language switch: signed-in user", () => {
  test("NEXT_LOCALE=en cookie renders /awards-information in English", async ({ page, request }) => {
    await signIn(page, request);
    await page.context().addCookies([{ name: LOCALE_COOKIE_NAME, value: "en", url: AUTHED }]);
    await page.goto(`${AUTHED}/awards-information`);
    await expectHtmlLang(page, "en");
    await expect(page).toHaveURL(`${AUTHED}/awards-information`);
    await expect(page.getByText("Individual", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("per prize", { exact: false }).first()).toBeVisible();
  });

  test("EN chosen in the signed-in header survives a client-side nav to Awards", async ({ page, request }) => {
    await signIn(page, request);
    await page.goto(`${AUTHED}/`);
    await page.getByTestId("language-selector").click();
    await page.getByRole("listbox").getByRole("option", { name: "EN", exact: true }).click();
    await expectHtmlLang(page, "en");
    await page.waitForLoadState("load");

    // Same-document marker: survives a soft (router) navigation, wiped by a full page load.
    await page.evaluate(() => Object.assign(window, { __beforeNav: true }));
    await page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: "Awards Information", exact: true })
      .click();

    await expect(page).toHaveURL(`${AUTHED}/awards-information`);
    await expect(page.getByText("per prize", { exact: false }).first()).toBeVisible();
    expect(await page.evaluate(() => "__beforeNav" in window)).toBe(true);
    await expectHtmlLang(page, "en");
    // cacheComponents keeps the previous route mounted in a hidden <Activity>, so a soft nav leaves two
    // headers in the DOM: the visible one must read EN and no Vietnamese tree may be left anywhere.
    const triggers = page.getByTestId("language-selector");
    await expect(triggers.filter({ visible: true })).toHaveCount(1);
    await expect(triggers.filter({ visible: true })).toContainText("EN");
    await expect(triggers.filter({ hasText: "VN" })).toHaveCount(0);
  });

  test("unknown path in EN: 404 with English copy and title, never a Vietnamese title", async ({
    page,
    request,
  }) => {
    await signIn(page, request);
    await page.context().addCookies([{ name: LOCALE_COOKIE_NAME, value: "en", url: AUTHED }]);
    // Record every title the document ever shows, from the first byte.
    await page.addInitScript(() => {
      const seen: string[] = [];
      Object.assign(window, { __titles: seen });
      new MutationObserver(() => {
        if (seen.at(-1) !== document.title) seen.push(document.title);
      }).observe(document, { subtree: true, childList: true, characterData: true });
    });

    const response = await page.goto(`${AUTHED}/no-such-page`);
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("NOT FOUND"); // Figma 1378:5063 (EN)
    await expect(page.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/");
    await expect(page).toHaveTitle("Page not found | SAA 2025");
    await expectHtmlLang(page, "en");
    const titles = await page.evaluate(() => (window as unknown as { __titles: string[] }).__titles);
    expect(titles.filter((title) => title.includes("Không tìm thấy"))).toEqual([]);
  });
});
