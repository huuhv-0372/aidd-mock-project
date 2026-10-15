// Sun* Kudos Live board (MoMorph MaZUn5xHXZ) — All Kudos feed, card links/hearts, Copy Link, sidebar,
// Spotlight and VI/EN. Selector contract: support/kudos-contract.ts (SEL / TXT); access, layout, Highlight and
// filters live in sun-kudos.spec.ts. All cases run on AUTHED (3103, fake Supabase). Expected RED now: the
// signed-in /sun-kudos page is a 404, so each case fails on its first content assertion.
import { test, expect, type Locator, type Page } from "@playwright/test";
import { AUTHED } from "./support/authed-session";
import { SEL, TXT, formatKudoTime, openKudos } from "./support/kudos-contract";
import { EMPTY_USER_ID, KUDOS, SPOTLIGHT_RECIPIENT_COUNT, SYSTEM_KUDOS_TOTAL, viewerStats } from "./support/kudos-fixtures.mjs";

const feedCards = (page: Page) => page.getByTestId(SEL.allKudos).getByTestId(SEL.kudoCard);
// Scoped to the feed: the same kudo can also appear in Highlight, so an unscoped id matches two cards.
const cardById = (page: Page, id: string) =>
  page.getByTestId(SEL.allKudos).locator(`[data-testid="${SEL.kudoCard}"][data-kudo-id="${id}"]`);
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const PROFILE_HREF = /^\/profile\/[0-9a-f-]{36}$/;

test.describe("Sun* Kudos: All Kudos feed", () => {
  test("ID-6 (9dfda316) feed starts at 10 cards, infinite scroll adds pages with no duplicates until data ends", async ({ page, request }) => {
    await openKudos(page, request);
    const feed = feedCards(page);
    await expect(feed).toHaveCount(10);
    const scrollAndCount = async () => {
      await feed.last().scrollIntoViewIfNeeded();
      return feed.count();
    };
    await expect.poll(scrollAndCount, { timeout: 15_000 }).toBeGreaterThan(10);
    await expect.poll(scrollAndCount, { timeout: 15_000 }).toBe(KUDOS.length);
    const ids = await feed.evaluateAll((els) => els.map((el) => el.getAttribute("data-kudo-id")));
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("ID-7 (0adfd7ce) Copy Link writes {origin}/sun-kudos/{id} to the clipboard and shows the toast", async ({ page, request }) => {
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin: AUTHED });
    await openKudos(page, request);
    const card = feedCards(page).first();
    const id = await card.getAttribute("data-kudo-id");
    await card.getByRole("button", { name: TXT.copyLink }).click();
    await expect(page.getByRole("status")).toContainText(TXT.toast);
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`${AUTHED}/sun-kudos/${id}`);
  });

  test("ID-9 (d662780b, 926d92a5) a user with no data sees both empty states and zero counts", async ({ page, request }) => {
    await openKudos(page, request, { sub: EMPTY_USER_ID });
    await expect(page.getByTestId(SEL.highlight).getByText(TXT.emptyFeed)).toBeVisible();
    await expect(page.getByTestId(SEL.allKudos).getByText(TXT.emptyFeed)).toBeVisible();
    await expect(page.getByTestId(SEL.gifts).getByText(TXT.emptyGifts)).toBeVisible();
    await expect(page.getByTestId(SEL.giftItem)).toHaveCount(0);
    await expect(page.getByTestId(SEL.spotlightTotal)).toHaveText(/^\s*0 KUDOS\s*$/);
    await expect(page.getByTestId(SEL.stats)).toContainText(new RegExp(`${escapeRe(TXT.statLabels[0])}\\s*0\\b`));
  });
});

test.describe("Sun* Kudos: card links, hearts and sharing", () => {
  test.beforeEach(async ({ page, request }) => {
    await openKudos(page, request);
  });

  test("ID-8 (8c0d1781, 31693bb7, 2cd77a0c, 630f42a3) View Details, Spotlight node and profile links carry the right href", async ({ page }) => {
    const card = page.getByTestId(SEL.highlight).getByTestId(SEL.kudoCard).first();
    const id = await card.getAttribute("data-kudo-id");
    await expect(card.getByRole("link", { name: TXT.viewDetails })).toHaveAttribute("href", `/sun-kudos/${id}`);

    const node = page.getByTestId(SEL.spotlightNode).first();
    expect(KUDOS.map((k) => `/sun-kudos/${k.id}`)).toContain(await node.getAttribute("href"));

    const feedCard = feedCards(page).first();
    await expect(feedCard.getByTestId("kudo-recipient")).toHaveAttribute("href", PROFILE_HREF);
    const profileLinks = feedCard.locator('a[href^="/profile/"]');
    expect(await profileLinks.count()).toBeGreaterThanOrEqual(2);
    for (const href of await profileLinks.evaluateAll((els) => els.map((el) => el.getAttribute("href")))) {
      expect(href).toMatch(PROFILE_HREF);
    }
  });

  test("ID-9 hearts show the count, liked and own state from the data (display only, no toggle)", async ({ page }) => {
    const own = cardById(page, KUDOS[0].id).getByTestId("kudo-hearts");
    await expect(own).toHaveAttribute("data-own", "true");
    await expect(own).toHaveAttribute("aria-label", `${KUDOS[0].heart_count} lượt thả tim`);
    const liked = cardById(page, KUDOS[1].id).getByTestId("kudo-hearts");
    await expect(liked).toHaveAttribute("data-liked", "true");
    await expect(liked).toHaveAttribute("aria-label", `${KUDOS[1].heart_count} lượt thả tim`);
    const plain = cardById(page, KUDOS[2].id).getByTestId("kudo-hearts");
    await expect(plain).toHaveAttribute("data-liked", "false");
    await expect(plain).toHaveAttribute("data-own", "false");
  });

  test("ID-9 card shows the Vietnam-time label and the danh hiệu title", async ({ page }) => {
    const card = cardById(page, KUDOS[0].id);
    await expect(card.getByTestId("kudo-time")).toHaveText(formatKudoTime(KUDOS[0].created_at));
    await expect(card.getByTestId("kudo-title")).toHaveText(KUDOS[0].title);
  });
});

test.describe("Sun* Kudos: sidebar, Spotlight and language", () => {
  test.beforeEach(async ({ page, request }) => {
    await openKudos(page, request);
  });

  test("ID-10 sidebar shows the five personal numbers and the 10 latest gift recipients", async ({ page }) => {
    const stats = page.getByTestId(SEL.stats);
    const s = viewerStats();
    const values = [s.received, s.sent, s.hearts_received, s.boxes_opened, s.boxes_unopened];
    for (const [i, label] of TXT.statLabels.entries()) {
      await expect(stats).toContainText(new RegExp(`${escapeRe(label)}\\s*${values[i]}\\b`));
    }
    await expect(page.getByTestId(SEL.gifts)).toContainText(TXT.giftsHeading);
    await expect(page.getByTestId(SEL.giftItem)).toHaveCount(10);
    await expect(page.getByRole("button", { name: "Mở Secret Box" })).toHaveAttribute("aria-disabled", "true");
  });

  test("ID-11 (ddf67e52) Spotlight total, one node per recipient, and the search is capped at 100 characters", async ({ page }) => {
    const board = page.getByTestId(SEL.spotlight);
    await expect(board.getByTestId(SEL.spotlightTotal)).toHaveText(new RegExp(`^\\s*${SYSTEM_KUDOS_TOTAL} KUDOS\\s*$`));
    await expect(board.getByTestId(SEL.spotlightNode)).toHaveCount(SPOTLIGHT_RECIPIENT_COUNT);

    const search = page.getByRole("searchbox", { name: "Tìm kiếm" });
    await expect(search).toHaveAttribute("maxlength", "100");
    await search.pressSequentially("a".repeat(101));
    expect(await search.inputValue()).toHaveLength(100);
  });

  test("ID-11 (ddf67e52) searching a name marks the matching node data-match=true", async ({ page }) => {
    const search = page.getByRole("searchbox", { name: "Tìm kiếm" });
    await search.fill("");
    await search.pressSequentially("Huỳnh");
    const nodes: Locator = page.getByTestId(SEL.spotlightNode);
    await expect.poll(() => nodes.locator('[data-match="true"]').count()).toBeGreaterThan(0);
    await expect.poll(() => nodes.locator('[data-match="true"]').count()).toBeLessThan(SPOTLIGHT_RECIPIENT_COUNT);
  });

  test("ID-11 (cac4b7a3) Pan/Zoom toggles aria-pressed", async ({ page }) => {
    const toggle = page.getByRole("button", { name: "Pan/Zoom" });
    const before = await toggle.getAttribute("aria-pressed");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", before === "true" ? "false" : "true");
  });

  test("ID-12 switching to EN changes the Vietnamese headings (EN strings land in phase 07)", async ({ page }) => {
    await expect(page.getByText(TXT.giftsHeading)).toBeVisible();
    await page.getByTestId("language-selector").click();
    await page.getByRole("listbox").getByRole("option", { name: "EN", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByText(TXT.giftsHeading)).toHaveCount(0);
  });
});
