// Awards Information screen (MoMorph zFYDgyj_pD, "Hệ thống giải"). Authed cases run on the AUTHED server (3103,
// fake Supabase); ID-1 runs on the PAST server (3101): anonymous -> /login. Selector contract (phases 02-04 must match):
// - banner: getByRole('banner'); 'Awards Information' link aria-current="page"; 'About SAA 2025' and 'Sun* Kudos' do not
// - contentinfo: getByRole('contentinfo'); widget: getByTestId('widget-button')
// - hero: getByTestId('awards-keyvisual') is the <img>, alt 'Keyvisual Sun* Annual Award 2025'
// - title: getByTestId('awards-title') shows 'Sun* annual awards 2025'; h1 'Hệ thống giải thưởng SAA 2025'
// - nav: getByRole('navigation', {name: 'Danh mục giải thưởng'}) = testid 'awards-nav' (the horizontal scroller at 375);
//   6 x getByTestId('awards-nav-item') = <a href="#<slug>">; aria-current="true" on the active item only
// - cards: getByTestId('award-section') with id=<slug>, h2 title; 'award-image' <img> (336x336 at 1440);
//   'award-quantity'; 'award-prize' (one element per prize line)
// - kudos: getByTestId('kudos-section'): 'Phong trào ghi nhận', 'Sun* Kudos', link 'Chi tiết' -> '/sun-kudos'
// - 404 (app/not-found.tsx): heading 'Không tìm thấy trang', link 'Về trang chủ' -> '/', HTTP 404
// Expectations: support/awards-contract.ts. Navigation/scroll/404 cases: awards-information-nav.spec.ts.

import { test, expect } from "@playwright/test";
import { AUTHED, PAST, pathOf, signIn } from "./support/authed-session";
import { AWARDS, AWARD_PATH, H1, NAV_LABELS, cardLocator, docTop, openAwards } from "./support/awards-contract";

test.describe("Awards Information: access", () => {
  test("ID-1 anonymous visitor on /awards-information goes to /login", async ({ page }) => {
    await page.goto(`${PAST}${AWARD_PATH}`);
    await page.waitForURL((u) => u.pathname === "/login");
  });

  test("ID-0 authenticated direct URL renders the page title", async ({ page, request }) => {
    await openAwards(page, request);
    await expect(page.getByRole("heading", { level: 1, name: H1 })).toBeVisible();
  });

  test("ID-2 header 'Awards Information' from / lands on the page with its h1", async ({ page, request }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await signIn(page, request);
    await page.goto(`${AUTHED}/`);
    expect(pathOf(page)).toBe("/");
    await page.getByRole("banner").getByRole("link", { name: "Awards Information" }).click();
    await page.waitForURL((u) => u.pathname === AWARD_PATH);
    await expect(page.getByRole("heading", { level: 1, name: H1 })).toBeVisible();
  });
});

test.describe("Awards Information: layout and content (authenticated, 1440)", () => {
  test.beforeEach(async ({ page, request }) => {
    await openAwards(page, request);
  });

  test("ID-3 regions top to bottom; nav sits left of the cards", async ({ page }) => {
    const first = cardLocator(page, AWARDS[0].slug);
    const last = cardLocator(page, AWARDS[AWARDS.length - 1].slug);
    const ordered = [
      page.getByRole("banner"), page.getByTestId("awards-keyvisual"), page.getByTestId("awards-title"),
      first, last, page.getByTestId("kudos-section"), page.getByRole("contentinfo"),
    ];
    const tops: number[] = [];
    for (const region of ordered) {
      await expect(region).toBeVisible();
      tops.push(await docTop(region));
    }
    expect(tops).toEqual([...tops].sort((a, b) => a - b));
    const nav = (await page.getByTestId("awards-nav").boundingBox())!;
    const card = (await first.boundingBox())!;
    expect(nav.x + nav.width).toBeLessThanOrEqual(card.x + 1);
  });

  test("ID-4 small muted subtitle above a larger h1", async ({ page }) => {
    await expect(page.getByTestId("awards-title")).toContainText("Sun* annual awards 2025");
    const subtitle = page.getByText("Sun* annual awards 2025", { exact: true });
    const h1 = page.getByRole("heading", { level: 1, name: H1 });
    await expect(h1).toBeVisible();
    const fontSize = (loc: typeof h1) => loc.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(await fontSize(subtitle)).toBeLessThan(await fontSize(h1));
  });

  test("ID-5 nav lists the 6 categories in order, each linking to its section", async ({ page }) => {
    const items = page.getByTestId("awards-nav-item");
    await expect(items).toHaveText(NAV_LABELS);
    for (const [i, award] of AWARDS.entries()) {
      await expect(items.nth(i)).toHaveAttribute("href", `#${award.slug}`);
    }
  });

  for (const award of AWARDS) {
    test(`ID-6 ${award.slug}: title, quantity and prize`, async ({ page }) => {
      const card = cardLocator(page, award.slug);
      await expect(card.getByRole("heading", { level: 2, name: award.title, exact: true })).toBeVisible();
      await expect(card.getByTestId("award-quantity")).toContainText(award.quantity);
      const prizes = card.getByTestId("award-prize");
      await expect(prizes).toHaveCount(award.prizes.length);
      for (const [i, re] of award.prizes.entries()) {
        await expect(prizes.nth(i)).toContainText(re);
      }
    });
  }

  test("ID-7 each award image renders 336x336 at 1440px", async ({ page }) => {
    for (const award of AWARDS) {
      const box = await cardLocator(page, award.slug).getByTestId("award-image").boundingBox();
      expect(box, `${award.slug} image box`).not.toBeNull();
      expect(Math.abs(box!.width - 336), `${award.slug} width`).toBeLessThanOrEqual(1);
      expect(Math.abs(box!.height - 336), `${award.slug} height`).toBeLessThanOrEqual(1);
    }
  });

  test("ID-8 Sun* Kudos banner: label, title and 'Chi tiết' CTA to /sun-kudos", async ({ page }) => {
    const kudos = page.getByTestId("kudos-section");
    await expect(kudos).toContainText("Phong trào ghi nhận");
    await expect(kudos).toContainText("Sun* Kudos");
    await expect(kudos.getByRole("link", { name: "Chi tiết", exact: true })).toHaveAttribute("href", "/sun-kudos");
  });
});
