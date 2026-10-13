import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
// Homepage SAA (MoMorph i87tDx10uM). Authenticated cases run on the AUTHED server (3103); guest cases are in
// homepage-guest.spec.ts. The AUTHED server's Supabase URL is the test-only fake (tests/e2e/support): the real
// proxy runs the real getClaims() against the fake's JWKS. No prod-side bypass exists. Selector contract (phases 02/03/04 must match):
// - Header getByRole('banner'); logo link 'Sun* Annual Awards 2025' href '/' (also once in contentinfo)
// - Nav in banner: 'About SAA 2025' ('/', aria-current="page"), 'Awards Information' ('/awards-information'), 'Sun* Kudos' ('/sun-kudos')
// - Bell testid notification-button (aria-expanded) -> notification-panel "Chưa có thông báo";
//   testid notification-badge never exists. Language testid language-selector, options VN/EN.
// - Account testid account-menu-button (aria-haspopup="menu", aria-expanded) -> role menu with menuitems 'Profile'
//   (href '/profile') and 'Sign out' (submit button in a form); no Admin Dashboard
// - Hero testid hero-key-visual, h1 'ROOT FURTHER', 'Coming soon' visible while AWARDS_CEREMONY_AT is
//   future (authed server), testids countdown-days|hours|minutes (exactly 2 digits) + labels, event info
// - CTA links 'ABOUT AWARDS' -> /awards-information, 'ABOUT KUDOS' -> /sun-kudos
// - testids root-further-content, awards-section (heading 'Hệ thống giải thưởng'), award-card x6 (wrapper with
//   exactly ONE descendant anchor '/awards-information#<slug>' holding img + heading + 'Chi tiết'),
//   kudos-section (link 'Chi tiết' -> /sun-kudos), widget-button (fixed bottom-right)
// - Footer contentinfo: logo link, About SAA 2025 / Awards Information / Sun* Kudos / Tiêu chuẩn chung
//   (/tieu-chuan-chung), 'Bản quyền thuộc về Sun* © 2025' (Figma verbatim)
// ID-0 (guest sees /): homepage-guest.spec.ts (guest header: language selector + 'Đăng nhập' link href '/login',
// no bell/account; signed in: login link count 0). ID-12/13/43 now E2E (ceremony countdown);
// unit-only ID-41/42/60, 39, 40, 56, 57. Deferred: ID-5/37 (no roles), 28 (no notifications table), 25/26 (i18n plan),
// 54 (widget menu plan), 59 (destinations 404 by design; here every a[href] must be a known route), 62 (slugs are
// compile-time constants). Menus, sign out, hover: homepage-account-menu.spec.ts.

const AUTHED = process.env.E2E_AUTHED_URL || "http://localhost:3103";
const FAKE = process.env.E2E_FAKE_SUPABASE_URL || "http://127.0.0.1:54398";
const CEREMONY_MS = Number(process.env.E2E_AWARDS_CEREMONY_AT_MS); // authed server's AWARDS_CEREMONY_AT
const SLUGS = ["top-talent", "top-project", "top-project-leader", "best-manager", "signature-2025-creator", "mvp"];
const ROUTES = ["/", "/awards-information", "/sun-kudos", "/tieu-chuan-chung", "/profile"];
const LOGO = "Sun* Annual Awards 2025";
const path = (page: Page) => new URL(page.url()).pathname;

async function signIn(page: Page, request: APIRequestContext) {
  const res = await request.get(`${FAKE}/__mint`);
  expect(res.ok()).toBe(true);
  const minted = await res.json();
  expect(minted.value.length).toBeLessThan(3180); // one @supabase/ssr cookie chunk
  await page.context().addCookies([{ name: minted.name, value: minted.value, url: AUTHED }]);
}

async function openHome(page: Page, request: APIRequestContext, width = 1440, height = 900) {
  await page.setViewportSize({ width, height }); await signIn(page, request);
  await page.goto(`${AUTHED}/`);
  expect(path(page)).toBe("/");
}

async function clickTo(page: Page, link: ReturnType<Page["locator"]>, expected: string) {
  await link.click();
  await page.waitForURL((u) => u.pathname + u.hash === expected);
}

test.describe("Homepage: render (authenticated, launched event)", () => {
  for (const [width, height] of [[1440, 900], [375, 812]]) {
    test(`regions in order, ceremony countdown, footer at ${width}px (ID-1,7,8,12,13,14,17,43)`, async ({ page, request }) => {
      await openHome(page, request, width, height);
      const [banner, footer] = [page.getByRole("banner"), page.getByRole("contentinfo")];
      const ordered = [banner, page.getByRole("heading", { level: 1, name: "ROOT FURTHER" }),
        page.getByTestId("countdown-days"), page.getByTestId("root-further-content"),
        page.getByTestId("awards-section"), page.getByTestId("kudos-section"), footer];
      const tops: number[] = [];
      for (const region of ordered) {
        await expect(region).toBeVisible();
        tops.push(await region.evaluate((el) => el.getBoundingClientRect().top + window.scrollY));
      }
      expect(tops).toEqual([...tops].sort((a, b) => a - b));
      await expect(page.getByTestId("hero-key-visual")).toBeVisible();
      await expect(banner.getByRole("link", { name: LOGO })).toHaveAttribute("href", "/");
      await expect(banner.getByRole("img", { name: LOGO })).toBeVisible();
      await expect(page.getByText("Coming soon")).toBeVisible();
      let shown = 0; // total minutes displayed
      for (const [unit, minutes] of [["days", 1440], ["hours", 60], ["minutes", 1]] as const) {
        const cell = page.getByTestId(`countdown-${unit}`);
        await expect(cell).toHaveText(/^\d{2}$/);
        shown += Number(await cell.textContent()) * minutes; // textContent: innerText splits digits across lines
        await expect(page.getByText(unit.toUpperCase(), { exact: true })).toBeVisible();
      }
      expect(Math.abs(shown - Math.floor((CEREMONY_MS - Date.now()) / 60_000))).toBeLessThanOrEqual(1);
      for (const text of ["Thời gian:", "26/12/2025", "Địa điểm:", "Âu Cơ Art Center",
        "Tường thuật trực tiếp qua sóng Livestream"]) {
        await expect(page.getByText(text, { exact: false }).first()).toBeVisible();
      }
      await expect(page.getByTestId("awards-section").getByRole("heading", { name: "Hệ thống giải thưởng" })).toBeVisible();
      await expect(page.getByTestId("award-card")).toHaveCount(6);
      await expect(page.getByRole("link", { name: "ABOUT AWARDS" })).toHaveAttribute("href", "/awards-information");
      await expect(page.getByRole("link", { name: "ABOUT KUDOS" })).toHaveAttribute("href", "/sun-kudos");
      const widget = page.getByTestId("widget-button");
      await expect(widget).toBeVisible();
      expect(await widget.evaluate((el) => getComputedStyle(el).position)).toBe("fixed");
      const wb = (await widget.boundingBox())!;
      expect(width - (wb.x + wb.width)).toBeLessThan(120);
      expect(height - (wb.y + wb.height)).toBeLessThan(120);
      await expect(footer.getByRole("link", { name: LOGO })).toHaveAttribute("href", "/");
      await expect(footer.getByText("Bản quyền thuộc về Sun* © 2025")).toBeVisible();
      for (const [name, href] of [["About SAA 2025", "/"], ["Awards Information", "/awards-information"],
        ["Sun* Kudos", "/sun-kudos"], ["Tiêu chuẩn chung", "/tieu-chuan-chung"]]) {
        await expect(footer.getByRole("link", { name, exact: true })).toHaveAttribute("href", href);
      }
      const hrefs = await page.locator("a[href]").evaluateAll((as) => as.map((a) => a.getAttribute("href")!));
      for (const href of hrefs) expect(ROUTES, `unknown link ${href}`).toContain(href.split("#")[0]);
    });
  }
  test("header: active nav, language VN, bell without badge (ID-9,10,11,29)", async ({ page, request }) => {
    await openHome(page, request);
    const banner = page.getByRole("banner");
    await expect(banner.getByRole("link", { name: "About SAA 2025" })).toHaveAttribute("aria-current", "page");
    await expect(banner.getByRole("link", { name: "Awards Information" })).toHaveAttribute("href", "/awards-information");
    await expect(banner.getByRole("link", { name: "Awards Information" })).not.toHaveAttribute("aria-current", "page");
    await expect(banner.getByRole("link", { name: "Sun* Kudos" })).toHaveAttribute("href", "/sun-kudos");
    await expect(page.getByTestId("language-selector")).toContainText("VN");
    await expect(page.getByTestId("notification-button")).toBeVisible();
    await expect(page.getByTestId("notification-badge")).toHaveCount(0);
    await expect(page.getByTestId("account-menu-button")).toBeVisible();
    await expect(banner.getByRole("link", { name: "Đăng nhập" })).toHaveCount(0); // signed in: no login link
  });
});

test.describe("Homepage: navigation (authenticated)", () => {
  test("logo, footer logo, About SAA from a scrolled position -> / at scrollY 0 (ID-2..4,18..20)", async ({ page, request }) => {
    test.setTimeout(120_000);
    await openHome(page, request);
    const targets = [page.getByRole("banner").getByRole("link", { name: LOGO }),
      page.getByRole("contentinfo").getByRole("link", { name: LOGO }),
      page.getByRole("banner").getByRole("link", { name: "About SAA 2025" }),
      page.getByRole("contentinfo").getByRole("link", { name: "About SAA 2025" })];
    for (const target of targets) {
      await expect(target).toHaveAttribute("href", "/");
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
      await target.click();
      await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 20_000 }).toBe(0); // main thread may freeze ~6s at the top
      expect(path(page)).toBe("/");
    }
  });

  test("header, CTA, kudos and footer links reach their routes (ID-21,22,44,45,53,55)", async ({ page, request }) => {
    test.setTimeout(90_000);
    await openHome(page, request);
    const [banner, footer] = [() => page.getByRole("banner"), () => page.getByRole("contentinfo")];
    const cases: [() => ReturnType<Page["locator"]>, string][] = [
      [() => banner().getByRole("link", { name: "Awards Information" }), "/awards-information"],
      [() => banner().getByRole("link", { name: "Sun* Kudos" }), "/sun-kudos"],
      [() => page.getByRole("link", { name: "ABOUT AWARDS" }), "/awards-information"],
      [() => page.getByRole("link", { name: "ABOUT KUDOS" }), "/sun-kudos"],
      [() => page.getByTestId("kudos-section").getByRole("link", { name: "Chi tiết" }), "/sun-kudos"],
      [() => footer().getByRole("link", { name: "Awards Information" }), "/awards-information"],
      [() => footer().getByRole("link", { name: "Sun* Kudos" }), "/sun-kudos"],
      [() => footer().getByRole("link", { name: "Tiêu chuẩn chung" }), "/tieu-chuan-chung"],
    ];
    for (const [link, expected] of cases) {
      await page.goto(`${AUTHED}/`);
      await clickTo(page, link(), expected);
    }
  });

  test("award cards: one anchor each, grid 3/2/2 columns, image/title/Chi tiết navigate (ID-15,16,47..50,52)", async ({ page, request }) => {
    test.setTimeout(120_000);
    await openHome(page, request);
    const cards = page.getByTestId("award-card");
    for (const [width, columns] of [[1440, 3], [768, 2], [375, 2]]) {
      await page.setViewportSize({ width, height: 900 });
      const xs = new Set<number>();
      for (const card of await cards.all()) xs.add(Math.round((await card.boundingBox())!.x));
      expect(xs.size, `columns at ${width}px`).toBe(columns);
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const [i, slug] of SLUGS.entries()) {
      const card = cards.nth(i);
      await page.goto(`${AUTHED}/`); // previous card's last click left the page on /awards-information
      await expect(card.getByRole("link")).toHaveCount(1);
      await expect(card.getByRole("link")).toHaveAttribute("href", `/awards-information#${slug}`);
      for (const part of [card.getByRole("img"), card.getByRole("heading"), card.getByText("Chi tiết")]) {
        await page.goto(`${AUTHED}/`);
        await clickTo(page, part, `/awards-information#${slug}`);
      }
    }
  });
});
