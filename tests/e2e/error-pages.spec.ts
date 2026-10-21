import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { AUTHED, PAST, pathOf, signIn } from "./support/authed-session";

// Error pages 404 + 403 (plans/261021-error-pages; clarifications.md is authoritative).
// Figma: 404 1378:5063 (MoMorph p0yJ89B-9_), 403 2182:9291 (MoMorph T3e_iS9PCL); reference PNGs in plans/261021-error-pages/figma/.
// Guest runs use the PAST server (3101, anonymous), signed-in runs use the AUTHED server (3103, fake Supabase).
// Contract (phase 01 RED, must fail until phase 02 lands):
// - 404: unknown path -> HTTP 404 when signed in (a guest is sent to /login by the default-deny gate); h1 (VI 'Không tìm thấy trang', CSS uppercase; EN 'NOT FOUND');
//   description; <img src*="not-found-robot">; link 'Về trang chủ' / 'Back to home' -> '/'.
// - 403: GET /403 -> HTTP 403 for guest (no /login redirect) and signed-in; h1 'Truy cập bị từ chối' / 'Access Denied';
//   description; <img src*="access-denied-monitor">; link 'Về trang chủ' / 'Back to home' -> '/'.
// - both: document title, no banner/contentinfo landmarks, 'error-bg' background, no horizontal scroll at 375x812.

const LOCALE_COOKIE = "NEXT_LOCALE";
const APOS = "’";
const UNKNOWN_PATH = "/error-pages-no-such-page";
const FORBIDDEN_PATH = "/403";

type Copy = { h1: string; body: string; home: string; title: string };
const NOT_FOUND: Record<"vi" | "en", Copy> = {
  vi: {
    h1: "Không tìm thấy trang",
    body: "Trang bạn tìm không tồn tại hoặc đã bị xoá.",
    home: "Về trang chủ",
    title: "Không tìm thấy trang | SAA 2025",
  },
  en: {
    h1: "NOT FOUND",
    body: `The resource you${APOS}re looking for doesn${APOS}t exist or has been removed.`,
    home: "Back to home",
    title: "Page not found | SAA 2025",
  },
};
const ACCESS_DENIED: Record<"vi" | "en", Copy> = {
  vi: {
    h1: "Truy cập bị từ chối",
    body: "Bạn không có quyền truy cập trang này.",
    home: "Về trang chủ",
    title: "Truy cập bị từ chối | SAA 2025",
  },
  en: {
    h1: "Access Denied",
    body: `You don${APOS}t have permission to access this page.`,
    home: "Back to home",
    title: "Access denied | SAA 2025",
  },
};

/** Signed-in navigation on the AUTHED server; optional EN via the locale cookie (set before the request). */
async function openSignedIn(page: Page, request: APIRequestContext, path: string, locale: "vi" | "en") {
  await signIn(page, request);
  if (locale === "en") await page.context().addCookies([{ name: LOCALE_COOKIE, value: "en", url: AUTHED }]);
  return page.goto(`${AUTHED}${path}`);
}

async function openGuest(page: Page, path: string, locale: "vi" | "en" = "vi") {
  if (locale === "en") await page.context().addCookies([{ name: LOCALE_COOKIE, value: "en", url: PAST }]);
  return page.goto(`${PAST}${path}`);
}

const heading = (page: Page) => page.getByRole("heading", { level: 1 });
const homeLink = (page: Page, name: string) => page.getByRole("link", { name, exact: true });

async function expectErrorPage(page: Page, copy: Copy, illustration: string) {
  await expect(heading(page)).toHaveText(copy.h1);
  await expect(page.getByText(copy.body, { exact: true })).toBeVisible();
  await expect(page.locator(`img[src*="${illustration}"]`)).toBeVisible();
  await expect(homeLink(page, copy.home)).toHaveAttribute("href", "/");
  await expect(page).toHaveTitle(copy.title);
  await expect(page.getByRole("banner")).toHaveCount(0);
  await expect(page.getByRole("contentinfo")).toHaveCount(0);
}

async function expectBackgroundAndFit(page: Page) {
  // Error boundaries under app/[locale] render on the client after hydration: wait for the page before probing it.
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => [...document.images].some((img) => img.src.includes("error-bg") && img.complete)))
    .toBe(true);
  const hasBackground = await page.evaluate(
    () =>
      [...document.querySelectorAll("*")].some((el) => getComputedStyle(el).backgroundImage.includes("error-bg")) ||
      [...document.images].some((img) => img.src.includes("error-bg")),
  );
  expect(hasBackground, "error-bg background image is rendered").toBe(true);
  const widths = await page.evaluate(() => ({
    scroll: document.scrollingElement!.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(widths.scroll, "no horizontal scroll at 375px").toBeLessThanOrEqual(widths.client);
}

test.describe("404 page", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  // Default-deny gate: a guest never learns whether a non-public path exists, so an unknown path goes to /login, not 404.
  test("guest GET unknown path: redirected to /login (default-deny), no 404 page", async ({ page }) => {
    await openGuest(page, UNKNOWN_PATH);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { level: 1, name: NOT_FOUND.vi.h1 })).toHaveCount(0);
  });

  test("signed-in GET unknown path: HTTP 404 with VI copy, robot illustration, home link", async ({ page, request }) => {
    const response = await openSignedIn(page, request, UNKNOWN_PATH, "vi");
    expect(response?.status()).toBe(404);
    await expectErrorPage(page, NOT_FOUND.vi, "not-found-robot");
  });

  test("VI heading is rendered uppercase by CSS, text stays 'Không tìm thấy trang'", async ({ page, request }) => {
    await openSignedIn(page, request, UNKNOWN_PATH, "vi");
    await expect(heading(page)).toHaveCSS("text-transform", "uppercase");
  });

  test("'Về trang chủ' click lands on '/'", async ({ page, request }) => {
    await openSignedIn(page, request, UNKNOWN_PATH, "vi");
    await expect(heading(page)).toHaveText(NOT_FOUND.vi.h1);
    await homeLink(page, NOT_FOUND.vi.home).click();
    await page.waitForURL((url) => url.pathname === "/");
    expect(pathOf(page)).toBe("/");
  });

  test("EN: 'NOT FOUND' heading, EN description with curly apostrophes, 'Back to home', EN title", async ({
    page,
    request,
  }) => {
    const response = await openSignedIn(page, request, UNKNOWN_PATH, "en");
    expect(response?.status()).toBe(404);
    await expectErrorPage(page, NOT_FOUND.en, "not-found-robot");
  });

  test("background 'error-bg' is present and the page does not scroll sideways at 375px", async ({ page, request }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await openSignedIn(page, request, UNKNOWN_PATH, "vi");
    await expectBackgroundAndFit(page);
  });
});

test.describe("403 page", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test("guest GET /403: HTTP 403 and stays on /403 (no redirect to /login)", async ({ page }) => {
    const response = await openGuest(page, FORBIDDEN_PATH);
    expect(response?.status()).toBe(403);
    expect(pathOf(page)).toBe(FORBIDDEN_PATH);
  });

  test("signed-in GET /403: HTTP 403 with VI copy, monitor illustration, home link", async ({ page, request }) => {
    const response = await openSignedIn(page, request, FORBIDDEN_PATH, "vi");
    expect(response?.status()).toBe(403);
    await expectErrorPage(page, ACCESS_DENIED.vi, "access-denied-monitor");
  });

  test("'Về trang chủ' click lands on '/'", async ({ page, request }) => {
    const response = await openSignedIn(page, request, FORBIDDEN_PATH, "vi");
    expect(response?.status()).toBe(403);
    await expect(heading(page)).toHaveText(ACCESS_DENIED.vi.h1);
    await homeLink(page, ACCESS_DENIED.vi.home).click();
    await page.waitForURL((url) => url.pathname === "/");
    expect(pathOf(page)).toBe("/");
  });

  test("EN: 'Access Denied' heading, 'You don’t have permission…' description, 'Back to home', EN title", async ({
    page,
    request,
  }) => {
    const response = await openSignedIn(page, request, FORBIDDEN_PATH, "en");
    expect(response?.status()).toBe(403);
    await expectErrorPage(page, ACCESS_DENIED.en, "access-denied-monitor");
  });

  test("background 'error-bg' is present and the page does not scroll sideways at 375px", async ({ page, request }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await openSignedIn(page, request, FORBIDDEN_PATH, "vi");
    await expectBackgroundAndFit(page);
  });
});
