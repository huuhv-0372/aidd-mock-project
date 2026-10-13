import { test, expect, type Page, type APIRequestContext } from "@playwright/test";

// Homepage SAA guest + protection cases (spec ID-0: an unauthenticated user sees the public homepage).
// Guest cases run on the PAST server (3101, launched event, no session). Cookie cases run on the AUTHED
// server (3103) whose Supabase is the test-only fake: the real getClaims() verifies its JWKS.
// Selector contract: guest header = getByRole('banner') with testid language-selector + link 'Đăng nhập'
// (href '/login'); testids notification-button / account-menu-button do not exist for a guest.
// Every non-public path stays default-deny: /does-not-exist -> /login. Signed-in cases: homepage*.spec.ts.

const PAST = process.env.E2E_PAST_URL || "http://localhost:3101";
const AUTHED = process.env.E2E_AUTHED_URL || "http://localhost:3103";
const FAKE = process.env.E2E_FAKE_SUPABASE_URL || "http://127.0.0.1:54398";
const path = (page: Page) => new URL(page.url()).pathname;

async function setSessionCookie(page: Page, request: APIRequestContext, forged = false) {
  const res = await request.get(`${FAKE}/__mint${forged ? "?forged=1" : ""}`);
  expect(res.ok()).toBe(true);
  const minted = await res.json();
  expect(minted.value.length).toBeLessThan(3180); // one @supabase/ssr cookie chunk
  await page.context().addCookies([{ name: minted.name, value: minted.value, url: AUTHED }]);
}

async function expectGuestHome(page: Page) {
  const banner = page.getByRole("banner");
  await expect(banner).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "ROOT FURTHER" })).toBeVisible();
  await expect(page.getByTestId("awards-section")).toBeVisible();
  await expect(page.getByRole("contentinfo")).toBeVisible();
  await expect(banner.getByTestId("language-selector")).toBeVisible();
  const login = banner.getByRole("link", { name: "Đăng nhập" });
  await expect(login).toBeVisible();
  await expect(login).toHaveAttribute("href", "/login");
  await expect(page.getByTestId("notification-button")).toHaveCount(0);
  await expect(page.getByTestId("account-menu-button")).toHaveCount(0);
  return login;
}

test.describe("Homepage: guest (ID-0)", () => {
  test("anonymous / stays on / with banner, hero, awards, footer and the guest header", async ({ page }) => {
    await page.goto(`${PAST}/`);
    expect(path(page)).toBe("/");
    await expectGuestHome(page);
  });

  test("guest 'Đăng nhập' link -> /login", async ({ page }) => {
    await page.goto(`${PAST}/`);
    expect(path(page)).toBe("/");
    const login = await expectGuestHome(page);
    await login.click();
    await page.waitForURL((u) => u.pathname === "/login");
    await expect(page.getByRole("heading", { level: 1, name: "ROOT FURTHER" })).toBeVisible();
  });
});

test.describe("Homepage: protection", () => {
  test("unknown path -> /login; /login and /auth/callback stay reachable", async ({ page }) => {
    await page.goto(`${PAST}/does-not-exist`);
    expect(path(page), "anonymous /does-not-exist").toBe("/login");
    await page.goto(`${PAST}/login`);
    await expect(page.getByRole("heading", { level: 1, name: "ROOT FURTHER" })).toBeVisible();
    await page.goto(`${PAST}/auth/callback?error=x`);
    expect(page.url()).toContain("/login?error=auth_failed");
  });

  test("forged-key session cookie is not trusted: / renders as guest, protected path -> /login", async ({ page, request }) => {
    await setSessionCookie(page, request, true);
    await page.goto(`${AUTHED}/`);
    expect(path(page)).toBe("/");
    await expectGuestHome(page);
    await page.goto(`${AUTHED}/does-not-exist`);
    expect(path(page)).toBe("/login");
  });

  test("authenticated /login -> /", async ({ page, request }) => {
    await setSessionCookie(page, request);
    await page.goto(`${AUTHED}/login`);
    expect(path(page)).toBe("/");
  });
});
