// Awards Information navigation: sticky scroll-spy nav, hash landing, unknown hash, Chi tiết -> SAA 404, mobile 375.
// Selector contract: see the header of awards-information.spec.ts (nav = awards-nav / awards-nav-item, active =
// aria-current="true"). Section band tolerance: section top must sit in [40px, 540px] of a 900px viewport, i.e.
// below the sticky bars and inside the top of the screen. Scroll assertions use expect.poll, never fixed sleeps.

import { test, expect, type Page } from "@playwright/test";
import { AUTHED, pathOf, signIn } from "./support/authed-session";
import { AWARDS, AWARD_PATH, activeSlugs, cardLocator, openAwards } from "./support/awards-contract";

const navLink = (page: Page, label: string) =>
  page.getByRole("navigation", { name: "Danh mục giải thưởng" }).getByRole("link", { name: label, exact: true });

const sectionTop = (page: Page, slug: string) =>
  cardLocator(page, slug).evaluate((el) => el.getBoundingClientRect().top);

async function expectSectionInTopBand(page: Page, slug: string) {
  await expect.poll(() => sectionTop(page, slug), { message: `${slug} top >= 40px` }).toBeGreaterThanOrEqual(40);
  await expect.poll(() => sectionTop(page, slug), { message: `${slug} top <= 540px` }).toBeLessThanOrEqual(540);
}

test.describe("Awards Information: navigation (authenticated, 1440)", () => {
  test.setTimeout(120_000);

  test("ID-9 each nav click scrolls to its section, sets the hash, and only that item is active", async ({ page, request }) => {
    await openAwards(page, request);
    for (const award of AWARDS) {
      await navLink(page, award.label).click();
      await expect.poll(() => activeSlugs(page), { message: `active after ${award.label}` }).toEqual([award.slug]);
      await expect.poll(() => page.evaluate(() => location.hash)).toBe(`#${award.slug}`);
      await expectSectionInTopBand(page, award.slug);
    }
  });

  test("ID-11 Top Talent then MVP: only the clicked item is active", async ({ page, request }) => {
    await openAwards(page, request);
    await navLink(page, "Top Talent").click();
    await expect.poll(() => activeSlugs(page)).toEqual(["top-talent"]);
    await navLink(page, "MVP").click();
    await expect.poll(() => activeSlugs(page)).toEqual(["mvp"]);
    await expectSectionInTopBand(page, "mvp");
  });

  test("scroll-spy: scrolling to a card makes its nav item the active one", async ({ page, request }) => {
    await openAwards(page, request);
    for (const slug of ["best-manager", "top-project"]) {
      await page.evaluate((s) => {
        const el = document.getElementById(s)!;
        window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY);
      }, slug);
      await expect.poll(() => activeSlugs(page), { message: `spy after scrolling to ${slug}` }).toEqual([slug]);
    }
  });

  test("scroll-spy: an instant jump that leaves the spy line between two cards still updates the active item", async ({ page, request }) => {
    await openAwards(page, request);
    await expect.poll(() => activeSlugs(page)).toEqual([AWARDS[0].slug]);
    // At the top no card is under the spy line (scroll-margin-top + 16px). Jump so the line sits in the gap
    // between best-manager and the next card: neither position has a card under the line, so the jump
    // crosses no observer band and only a re-measure after the scroll can update the nav.
    const gap = await page.evaluate(() => {
      const line = parseFloat(getComputedStyle(document.getElementById("top-talent")!).scrollMarginTop) + 16;
      const docY = (id: string, edge: "top" | "bottom") =>
        document.getElementById(id)!.getBoundingClientRect()[edge] + window.scrollY;
      window.scrollTo({ top: (docY("best-manager", "bottom") + docY("signature-2025-creator", "top")) / 2 - line, behavior: "instant" });
      const above = document.getElementById("best-manager")!.getBoundingClientRect().bottom;
      const below = document.getElementById("signature-2025-creator")!.getBoundingClientRect().top;
      return above < line && line < below;
    });
    expect(gap, "spy line lands in the gap between the two cards").toBe(true);
    await expect.poll(() => activeSlugs(page), { message: "spy after a jump into the gap" }).toEqual(["best-manager"]);
  });

  test("landing on #best-manager (from Homepage) scrolls the card into view and activates its item", async ({ page, request }) => {
    await openAwards(page, request, { hash: "#best-manager" });
    await expect.poll(() => activeSlugs(page)).toEqual(["best-manager"]);
    await expect
      .poll(() => cardLocator(page, "best-manager").evaluate((el) => {
        const r = el.getBoundingClientRect();
        return r.bottom > 0 && r.top < window.innerHeight;
      }), { message: "best-manager card intersects the viewport" })
      .toBe(true);
  });

  test("Homepage award card (client-side Link) lands on its card with its nav item active", async ({ page, request }) => {
    await signIn(page, request);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${AUTHED}/`);
    await page.getByTestId("award-card").nth(3).getByRole("link").click(); // Best Manager
    await page.waitForURL((u) => u.pathname === AWARD_PATH && u.hash === "#best-manager");
    await expect.poll(() => activeSlugs(page)).toEqual(["best-manager"]);
    await expectSectionInTopBand(page, "best-manager");
  });

  test("ID-13 unknown hash: no page error, stays at the top, first item stays active", async ({ page, request }) => {
    const errors: Error[] = [];
    page.on("pageerror", (err) => errors.push(err));
    await openAwards(page, request, { hash: "#nope" });
    await expect.poll(() => activeSlugs(page)).toEqual([AWARDS[0].slug]);
    // A different unknown hash, so `hashchange` really fires (re-assigning "#nope" is a no-op). The test's
    // listener is added after the page's, so once it resolves the page has handled the change.
    const fired = await page.evaluate(
      () =>
        new Promise<boolean>((resolve) => {
          window.addEventListener("hashchange", () => resolve(true), { once: true });
          window.setTimeout(() => resolve(false), 2_000);
          location.hash = "#nope-2";
        }),
    );
    expect(fired, "hashchange fired for the second unknown hash").toBe(true);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await expect.poll(() => activeSlugs(page)).toEqual([AWARDS[0].slug]);
    expect(errors).toEqual([]);
  });

  test("ID-12/14 'Chi tiết' opens /sun-kudos: HTTP 404, friendly SAA page, link back home", async ({ page, request }) => {
    await openAwards(page, request);
    await page.getByTestId("kudos-section").getByRole("link", { name: "Chi tiết", exact: true }).click();
    await page.waitForURL((u) => u.pathname === "/sun-kudos");
    expect((await page.request.get(`${AUTHED}/sun-kudos`)).status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Không tìm thấy trang" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Về trang chủ" })).toHaveAttribute("href", "/");
    await page.getByRole("link", { name: "Về trang chủ" }).click();
    await page.waitForURL((u) => u.pathname === "/");
    expect(pathOf(page)).toBe("/");
  });

  test.describe("reduced motion", () => {
    test.use({ reducedMotion: "reduce" });

    test("a nav click still lands on its section, without waiting on a smooth scroll", async ({ page, request }) => {
      await openAwards(page, request);
      await navLink(page, "Best Manager").click();
      await expect.poll(() => activeSlugs(page)).toEqual(["best-manager"]);
      await expect.poll(() => sectionTop(page, "best-manager"), { timeout: 1_500 }).toBeLessThanOrEqual(540);
      await expectSectionInTopBand(page, "best-manager");
    });
  });
});

test.describe("Awards Information: mobile (375px)", () => {
  test.beforeEach(async ({ page, request }) => {
    await openAwards(page, request, { width: 375, height: 812 });
  });

  test("ID-3 chip bar sits above the cards and scrolls horizontally", async ({ page }) => {
    const nav = page.getByTestId("awards-nav");
    const navBox = (await nav.boundingBox())!;
    const firstCard = (await cardLocator(page, AWARDS[0].slug).boundingBox())!;
    expect(navBox.y + navBox.height).toBeLessThanOrEqual(firstCard.y + 1);
    const overflow = await nav.evaluate((el) => ({
      scroll: el.scrollWidth, client: el.clientWidth, ox: getComputedStyle(el).overflowX,
    }));
    expect(overflow.scroll).toBeGreaterThan(overflow.client);
    expect(["auto", "scroll"]).toContain(overflow.ox);
  });

  test("chip bar stays sticky under the header after scrolling 1000px", async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, 1000));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThanOrEqual(1000);
    const navY = async () => (await page.getByTestId("awards-nav").boundingBox())!.y;
    await expect.poll(navY, { message: "chip bar still in view" }).toBeGreaterThanOrEqual(0);
    expect(await navY()).toBeLessThan(100);
  });

  test("landing on #mvp scrolls the chip bar so the active MVP chip is visible", async ({ page }) => {
    await page.goto(`${AUTHED}${AWARD_PATH}#mvp`);
    await expect.poll(() => activeSlugs(page)).toEqual(["mvp"]);
    const chipInsideBar = () =>
      page.getByTestId("awards-nav").evaluate((nav) => {
        const chip = nav.querySelector('[aria-current="true"]')!.getBoundingClientRect();
        const bar = nav.getBoundingClientRect();
        return chip.left >= bar.left - 1 && chip.right <= bar.right + 1;
      });
    await expect.poll(chipInsideBar, { message: "active chip within the visible bar" }).toBe(true);
  });

  test("award cards stack in one column with the image above the content", async ({ page }) => {
    const xs = new Set<number>();
    for (const award of AWARDS) {
      const card = cardLocator(page, award.slug);
      const img = (await card.getByTestId("award-image").boundingBox())!;
      const title = (await card.getByRole("heading", { level: 2 }).boundingBox())!;
      xs.add(Math.round((await card.boundingBox())!.x));
      expect(img.y + img.height, `${award.slug}: image above title`).toBeLessThanOrEqual(title.y + 1);
    }
    expect(xs.size, "single column").toBe(1);
  });
});
