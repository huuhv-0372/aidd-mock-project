import { test, expect, type Page, type APIRequestContext, type Locator } from "@playwright/test";

// Homepage SAA header menus, sign out and hover states (authenticated, AUTHED server on the
// test-only fake Supabase). Selector contract + not-E2E list: see homepage.spec.ts header.

const AUTHED = process.env.E2E_AUTHED_URL || "http://localhost:3103";
const FAKE = process.env.E2E_FAKE_SUPABASE_URL || "http://127.0.0.1:54398";
const path = (page: Page) => new URL(page.url()).pathname;

async function openHome(page: Page, request: APIRequestContext): Promise<string> {
  await page.setViewportSize({ width: 1440, height: 900 });
  const res = await request.get(`${FAKE}/__mint`);
  expect(res.ok()).toBe(true);
  const minted = await res.json();
  expect(minted.value.length).toBeLessThan(3180); // one @supabase/ssr cookie chunk
  await page.context().addCookies([{ name: minted.name, value: minted.value, url: AUTHED }]);
  await page.goto(`${AUTHED}/`);
  expect(path(page)).toBe("/");
  return minted.sessionId;
}

/** Visual fingerprint compared before/after hover; any change counts as a hover style. */
const styleOf = (el: Locator) =>
  el.evaluate((node) => {
    const s = getComputedStyle(node);
    return [s.backgroundColor, s.color, s.boxShadow, s.transform, s.borderColor, s.filter,
      s.textDecorationLine, s.opacity].join("|");
  });

test.describe("Homepage: header menus (authenticated)", () => {
  test("bell opens the empty notification panel (ID-27)", async ({ page, request }) => {
    await openHome(page, request);
    const bell = page.getByTestId("notification-button");
    await expect(bell).toHaveAttribute("aria-expanded", "false");
    await bell.click();
    await expect(bell).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByTestId("notification-panel")).toBeVisible();
    await expect(page.getByTestId("notification-panel")).toContainText("Chưa có thông báo");
    await expect(page.getByTestId("notification-badge")).toHaveCount(0);
  });

  test("account menu: click toggle, outside click, Esc (ID-30,31,32,35)", async ({ page, request }) => {
    await openHome(page, request);
    const button = page.getByTestId("account-menu-button");
    const menu = page.getByRole("menu");
    await expect(button).toHaveAttribute("aria-haspopup", "menu");
    await expect(button).toHaveAttribute("aria-expanded", "false");
    await expect(menu).toHaveCount(0);

    await button.click();
    await expect(menu).toBeVisible();
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await button.click();
    await expect(menu).toBeHidden();
    await expect(button).toHaveAttribute("aria-expanded", "false");

    await button.click();
    await expect(menu).toBeVisible();
    await page.getByTestId("root-further-content").click({ position: { x: 5, y: 5 } });
    await expect(menu).toBeHidden();

    await button.click();
    await expect(menu).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
  });

  test("account menu opens with Enter and Space from keyboard focus (ID-33,34)", async ({ page, request }) => {
    await openHome(page, request);
    const button = page.getByTestId("account-menu-button");
    const menu = page.getByRole("menu");
    for (const key of ["Enter", " "]) {
      await button.focus();
      await page.keyboard.press(key);
      await expect(menu, `opened by ${JSON.stringify(key)}`).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(menu).toBeHidden();
    }
  });

  test("account menu items are Profile + Sign out only (ID-6,36,38)", async ({ page, request }) => {
    await openHome(page, request);
    await page.getByTestId("account-menu-button").click();
    const menu = page.getByRole("menu");
    await expect(menu.getByRole("menuitem")).toHaveCount(2);
    await expect(menu.getByRole("menuitem", { name: "Profile" })).toHaveAttribute("href", "/profile");
    const signOut = menu.getByRole("menuitem", { name: "Sign out" });
    await expect(signOut).toHaveAttribute("type", "submit");
    await expect(signOut.locator("xpath=ancestor::form")).toHaveCount(1);
    await expect(page.getByText("Admin Dashboard")).toHaveCount(0);
  });

  test("language selector offers VN and EN only (ID-24,58)", async ({ page, request }) => {
    await openHome(page, request);
    await page.getByTestId("language-selector").click();
    await expect(page.getByRole("listbox")).toBeVisible();
    await expect(page.getByRole("option")).toHaveCount(2);
    await expect(page.getByRole("option", { name: "VN" })).toBeVisible();
    await expect(page.getByRole("option", { name: "EN" })).toBeVisible();
  });
});

test.describe("Homepage: sign out (authenticated)", () => {
  test("Sign out -> /login, Supabase logout called, session cleared", async ({ page, request }) => {
    const sessionId = await openHome(page, request);
    await page.getByTestId("account-menu-button").click();
    await page.getByRole("menu").getByRole("menuitem", { name: "Sign out" }).click();
    await page.waitForURL((u) => u.pathname === "/login");

    const seen = await (await request.get(`${FAKE}/__logout-seen?session=${sessionId}`)).json();
    expect(seen.seen, "fake saw POST /auth/v1/logout for this session").toBe(true);

    // Session cleared: `/` is public (ID-0) and now renders the guest header; a protected path bounces.
    await page.goto(`${AUTHED}/`);
    expect(path(page)).toBe("/");
    await expect(page.getByRole("banner").getByRole("link", { name: "Đăng nhập" })).toBeVisible();
    await expect(page.getByTestId("account-menu-button")).toHaveCount(0);
    await page.goto(`${AUTHED}/does-not-exist`);
    expect(path(page)).toBe("/login");
  });
});

test.describe("Homepage: hover states (authenticated)", () => {
  test("nav link, CTA and award card change style on hover (ID-23,46,51)", async ({ page, request }) => {
    await openHome(page, request);
    const targets: [string, Locator][] = [
      ["nav Awards Information", page.getByRole("banner").getByRole("link", { name: "Awards Information" })],
      ["CTA ABOUT AWARDS", page.getByRole("link", { name: "ABOUT AWARDS" })],
      ["award card", page.getByTestId("award-card").first()],
    ];
    for (const [label, target] of targets) {
      // Card elevation may live on the wrapper or its single anchor: fingerprint both.
      const watched = label === "award card" ? [target, target.getByRole("link")] : [target];
      const fingerprint = async () => (await Promise.all(watched.map(styleOf))).join("||");
      await target.scrollIntoViewIfNeeded();
      await page.mouse.move(0, 0);
      const baseline = await fingerprint();
      await target.hover();
      await expect.poll(fingerprint, { message: `${label} hover style` }).not.toBe(baseline);
    }
  });
});
