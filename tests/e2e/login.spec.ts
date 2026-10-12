import { test, expect, Page } from "@playwright/test";
import {
  LOGIN_PATH,
  CALLBACK_PATH,
  LOGIN_ERROR_MESSAGE,
  LOGIN_ERROR_PARAM,
  LOGIN_ERROR_VALUE,
} from "@/lib/auth/constants";

// Selector Contract (phase 03/04/05 must match):
// - Header: getByRole('banner'); Logo: getByRole('img', {name: 'Sun* Annual Awards 2025'}), no ancestor a/button
// - Language: getByTestId('language-selector') with flag/chevron children; listbox getByRole('option', {name: 'VN'|'EN'})
// - Hero: getByTestId('hero-key-visual'), h1 'ROOT FURTHER', texts 'Bắt đầu hành trình...' and 'Đăng nhập để khám phá!'
// - Button: getByRole('button', {name: 'LOGIN With Google'}) with getByTestId('google-icon')
// - Loading: getByTestId('login-loader') + button.toBeDisabled()
// - Footer: getByRole('contentinfo'), no ancestor a/button, text 'Bản quyền thuộc về Sun* © 2025'
// - Error: getByRole('alert').filter({hasText: LOGIN_ERROR_MESSAGE}) (filters Next.js route announcer)
// Test 8: NOT E2E-testable (offline); covered by unit test + phase 05 live checklist.

const E2E_PAST_URL = process.env.E2E_PAST_URL || "http://localhost:3101";
const E2E_SUPABASE_URL = process.env.E2E_SUPABASE_URL || "http://127.0.0.1:54399";

async function gotoLogin(page: Page, query = "") {
  await page.goto(`${E2E_PAST_URL}${LOGIN_PATH}${query}`);
}

test.describe("Login: Google via Supabase Auth", () => {
  test("test-1: anon /login renders all regions; logo/language positions; non-interactive", async ({
    page,
  }) => {
    for (const vp of [
      { width: 1440, height: 900 },
      { width: 375, height: 667 },
    ]) {
      await page.setViewportSize(vp);
      await gotoLogin(page);

      await expect(page.getByRole("banner")).toBeVisible();

      const logo = page.getByRole("img", { name: "Sun* Annual Awards 2025" });
      await expect(logo).toBeVisible();
      await expect(logo.locator("xpath=ancestor::a|ancestor::button")).toHaveCount(0);

      const langSel = page.getByTestId("language-selector");
      await expect(langSel).toBeVisible();

      const logoBBox = await logo.boundingBox();
      const langBBox = await langSel.boundingBox();
      expect(logoBBox?.x || 0).toBeLessThan(langBBox?.x || Infinity);

      await expect(page.getByRole("heading", { level: 1, name: "ROOT FURTHER" })).toBeVisible();
      await expect(page.getByText("Bắt đầu hành trình của bạn cùng SAA 2025.")).toBeVisible();
      await expect(page.getByText("Đăng nhập để khám phá!")).toBeVisible();

      const btn = page.getByRole("button", { name: "LOGIN With Google" });
      await expect(btn).toBeVisible();
      await expect(page.getByTestId("google-icon")).toBeVisible();

      const footer = page.getByRole("contentinfo");
      await expect(footer).toBeVisible();
      await expect(footer.locator("xpath=ancestor::a|ancestor::button")).toHaveCount(0);
      const descText = page.getByText("Bắt đầu hành trình");
      await expect(descText.locator("xpath=ancestor::a|ancestor::button")).toHaveCount(0);
    }
  });

  test("test-2: language default VN + flag + chevron; click opens listbox", async ({
    page,
  }) => {
    await gotoLogin(page);
    const langSel = page.getByTestId("language-selector");
    await expect(langSel).toContainText("VN");
    await expect(page.getByTestId("language-flag")).toBeVisible();
    await expect(page.getByTestId("language-chevron")).toBeVisible();

    await langSel.hover();
    expect(
      await langSel.evaluate((el) => window.getComputedStyle(el).cursor)
    ).toBe("pointer");

    await langSel.click();
    await expect(page.getByRole("listbox")).toBeVisible();
    await expect(page.getByRole("option", { name: "VN" })).toBeVisible();
    await expect(page.getByRole("option", { name: "EN" })).toBeVisible();
  });

  test("test-3: footer stays in viewport after scroll; hero visible; button shadow changes", async ({
    page,
  }) => {
    await gotoLogin(page);
    const footer = page.getByRole("contentinfo");
    await expect(footer).toBeVisible();

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(footer).toBeInViewport();

    await expect(page.getByTestId("hero-key-visual")).toBeVisible();

    const btn = page.getByRole("button", { name: "LOGIN With Google" });
    const shadowBefore = await btn.evaluate((el) =>
      window.getComputedStyle(el).boxShadow
    );
    await btn.hover();
    const shadowAfter = await btn.evaluate((el) =>
      window.getComputedStyle(el).boxShadow
    );
    expect(shadowAfter).not.toBe(shadowBefore);
  });

  test("test-4: click login routes to auth/v1/authorize with correct params", async ({
    page,
  }) => {
    const authPromise = page.waitForRequest((req) => {
      const url = new URL(req.url());
      return url.href.includes(`${E2E_SUPABASE_URL}/auth/v1/authorize`);
    });

    // Hold the server-action POST until the pending state is asserted: once the authorize
    // navigation starts, locators wait on it, so a fixed delay there races under load.
    let release!: () => void;
    const released = new Promise<void>((r) => (release = r));
    await page.route(`${E2E_PAST_URL}${LOGIN_PATH}`, async (route) => {
      if (route.request().method() === "POST") await released;
      await route.continue();
    });
    await page.route("**/auth/v1/authorize**", (route) => route.abort()); // never reach Google

    await gotoLogin(page);
    const btn = page.getByRole("button", { name: "LOGIN With Google" });
    await expect(btn).not.toBeDisabled();

    await btn.click();
    await expect(btn).toBeDisabled();
    await expect(page.getByTestId("login-loader")).toBeVisible();
    release();

    const req = await authPromise;
    const url = new URL(req.url());
    expect(url.href).toContain(`${E2E_SUPABASE_URL}/auth/v1/authorize`);
    expect(url.searchParams.get("provider")).toBe("google");
    expect(url.searchParams.get("redirect_to")).toBe(
      `${E2E_PAST_URL}${CALLBACK_PATH}`
    );
  });

  test("test-5: /login?error shows alert; plain /login shows none", async ({
    page,
  }) => {
    await gotoLogin(page);
    const alert = page
      .getByRole("alert")
      .filter({ hasText: LOGIN_ERROR_MESSAGE });
    await expect(alert).toHaveCount(0);

    await gotoLogin(page, `?${LOGIN_ERROR_PARAM}=${LOGIN_ERROR_VALUE}`);
    await expect(alert).toHaveCount(1);
  });

  test("test-6: /auth/callback redirects to /login?error with same-origin check", async ({
    page,
  }) => {
    await page.goto(`${E2E_PAST_URL}${CALLBACK_PATH}?error=access_denied`, {
      waitUntil: "load",
    });
    expect(new URL(page.url()).pathname).toBe(LOGIN_PATH);
    expect(new URL(page.url()).searchParams.get(LOGIN_ERROR_PARAM)).toBe(
      LOGIN_ERROR_VALUE
    );

    await page.goto(`${E2E_PAST_URL}${CALLBACK_PATH}`, { waitUntil: "load" });
    expect(new URL(page.url()).pathname).toBe(LOGIN_PATH);

    await page.goto(
      `${E2E_PAST_URL}${CALLBACK_PATH}?error=x&next=//evil.com`,
      { waitUntil: "load" }
    );
    expect(new URL(page.url()).origin).toBe(E2E_PAST_URL.replace(/\/$/, ""));
  });

  test("test-7: garbage sb-*-auth-token cookie does not crash /login", async ({
    page,
  }) => {
    // supabase-js storage key = sb-<first hostname label>-auth-token => sb-127-auth-token here.
    for (const value of ["garbage_not_valid_jwt", "base64-eyJhIjoxfQ"]) {
      await page.context().addCookies([
        { name: "sb-127-auth-token", value, url: E2E_PAST_URL },
      ]);
      await gotoLogin(page);
      await expect(
        page.getByRole("heading", { level: 1, name: "ROOT FURTHER" })
      ).toBeVisible();
      const alert = page
        .getByRole("alert")
        .filter({ hasText: LOGIN_ERROR_MESSAGE });
      await expect(alert).toHaveCount(0);
    }
  });
});
