// Sun* Kudos Live board (MoMorph MaZUn5xHXZ) — access, layout, Highlight carousel and filters.
// Selector contract: support/kudos-contract.ts (SEL / TXT). Feed, sidebar, spotlight, copy link: sun-kudos-feed.spec.ts.
// Guest case runs on PAST (3101, anonymous -> /login). Everything else on AUTHED (3103, fake Supabase).
// Expected RED now: /sun-kudos is a 404 for a signed-in user, so every authed case fails on its first content assertion.
import { test, expect, type Locator, type Page } from "@playwright/test";
import { PAST } from "./support/authed-session";
import { KUDOS_PATH, SEL, TXT, openKudos } from "./support/kudos-contract";
import { emptyFilterCombo, recipientDepartment } from "./support/kudos-fixtures.mjs";

const DEDICATED = "Cống hiến"; // name_vi of hashtag slug "dedicated"
const CEVC10 = "CEVC1";

const slides = (page: Page) => page.getByTestId(SEL.highlight).getByTestId(SEL.highlightSlide);
const cardsIn = (page: Page, scope: string) => page.getByTestId(scope).getByTestId(SEL.kudoCard);
const docTop = (loc: Locator) => loc.evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
const isDisabled = (loc: Locator) =>
  loc.evaluate((el) => (el as HTMLButtonElement).disabled || el.getAttribute("aria-disabled") === "true");

/** Opens a filter dropdown (Hashtag / Phòng ban) if closed, then clicks one option; choosing it again clears it. */
async function pick(page: Page, trigger: "Hashtag" | "Phòng ban", option: string) {
  const button = page.getByRole("button", { name: trigger });
  if ((await button.getAttribute("aria-expanded")) !== "true") await button.click();
  await expect(button).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("option", { name: option, exact: true }).click();
}

test.describe("Sun* Kudos: access", () => {
  test("ID-1 (71b3ef43) guest on /sun-kudos goes to /login", async ({ page }) => {
    await page.goto(`${PAST}${KUDOS_PATH}`);
    await page.waitForURL((u) => u.pathname === "/login");
  });

  test("header link 'Sun* Kudos' is the current page for a signed-in user", async ({ page, request }) => {
    await openKudos(page, request);
    await expect(page.getByRole("banner").getByRole("link", { name: SEL.headerLink })).toHaveAttribute("aria-current", "page");
    await expect(page.getByTestId(SEL.kv)).toContainText(TXT.kv);
  });
});

test.describe("Sun* Kudos: layout", () => {
  test("GUI regions run KV, Highlight, Spotlight, All Kudos, footer; sidebar sits right of the feed at 1440", async ({ page, request }) => {
    await openKudos(page, request, { width: 1440 });
    const regions = [
      page.getByTestId(SEL.kv), page.getByTestId(SEL.highlight), page.getByTestId(SEL.spotlight),
      page.getByTestId(SEL.allKudos), page.getByRole("contentinfo"),
    ];
    const tops: number[] = [];
    for (const region of regions) {
      await expect(region).toBeVisible();
      tops.push(await docTop(region));
    }
    expect(tops).toEqual([...tops].sort((a, b) => a - b));
    const card = (await cardsIn(page, SEL.allKudos).first().boundingBox())!;
    const stats = (await page.getByTestId(SEL.stats).boundingBox())!;
    expect(stats.x).toBeGreaterThanOrEqual(card.x + card.width);
  });

  test("GUI at 375 the sidebar drops below the Kudos feed", async ({ page, request }) => {
    await openKudos(page, request, { width: 375 });
    const lastCard = cardsIn(page, SEL.allKudos).first();
    await expect(lastCard).toBeVisible();
    await expect(page.getByTestId(SEL.stats)).toBeVisible();
    expect(await docTop(page.getByTestId(SEL.stats))).toBeGreaterThan(await docTop(lastCard));
  });
});

test.describe("Sun* Kudos: Highlight carousel", () => {
  test.beforeEach(async ({ page, request }) => {
    await openKudos(page, request);
  });

  test("ID-3 (86092c3a, 81446f61) 5 slides; Prev disabled at 1/5; Next x4 reaches 5/5 and disables Next", async ({ page }) => {
    await expect(slides(page)).toHaveCount(5);
    const pageLabel = page.getByTestId(SEL.highlightPage);
    const prev = page.getByRole("button", { name: "Kudo trước" });
    const next = page.getByRole("button", { name: "Kudo sau" });
    await expect(pageLabel).toHaveText(/^\s*1\s*\/\s*5\s*$/);
    await expect.poll(() => isDisabled(prev)).toBe(true);
    for (let i = 0; i < 4; i++) await next.click();
    await expect(pageLabel).toHaveText(/^\s*5\s*\/\s*5\s*$/);
    await expect.poll(() => isDisabled(next)).toBe(true);
    await expect.poll(() => isDisabled(prev)).toBe(false);
    await expect(page.locator(`[data-testid="${SEL.highlightSlide}"][aria-current="true"]`)).toHaveCount(1);
  });
});

test.describe("Sun* Kudos: filters", () => {
  test.beforeEach(async ({ page, request }) => {
    await openKudos(page, request);
  });

  test("ID-4 (0e56cacb) Hashtag filter narrows Highlight and All Kudos, sets ?hashtag=, resets carousel; deselect restores", async ({ page }) => {
    const highlightCards = cardsIn(page, SEL.highlight);
    const feedCards = cardsIn(page, SEL.allKudos);
    await expect(slides(page)).toHaveCount(5);

    await pick(page, "Hashtag", DEDICATED);
    await expect(page).toHaveURL(/[?&]hashtag=dedicated/);
    const shown = await slides(page).count();
    expect(shown).toBeGreaterThan(0);
    await expect(page.getByTestId(SEL.highlightPage)).toHaveText(new RegExp(`^\\s*1\\s*/\\s*${shown}\\s*$`));
    for (const card of [...(await highlightCards.all()), ...(await feedCards.all())]) {
      await expect(card.getByTestId("kudo-hashtag").filter({ hasText: DEDICATED })).not.toHaveCount(0);
    }

    await pick(page, "Hashtag", DEDICATED);
    await expect(page).not.toHaveURL(/hashtag=/);
    await expect(slides(page)).toHaveCount(5);
    await expect(page.getByTestId(SEL.highlightPage)).toHaveText(/^\s*1\s*\/\s*5\s*$/);
  });

  test("ID-4 (159fed13) Phòng ban filter keeps only kudos whose recipient is in the department", async ({ page }) => {
    await pick(page, "Phòng ban", CEVC10);
    await expect(page).toHaveURL(new RegExp(`[?&]department=${CEVC10}(&|$)`));
    const feedCards = cardsIn(page, SEL.allKudos);
    await expect(feedCards.first()).toBeVisible();
    for (const scope of [SEL.highlight, SEL.allKudos]) {
      for (const card of await cardsIn(page, scope).all()) {
        const id = (await card.getAttribute("data-kudo-id")) ?? "";
        expect(recipientDepartment(id)).toBe(CEVC10);
      }
    }
    await pick(page, "Phòng ban", CEVC10);
    await expect(page).not.toHaveURL(/department=/);
    await expect(slides(page)).toHaveCount(5);
  });

  test("ID-4 both filters with no matching kudo show the empty text in Highlight and All Kudos", async ({ page }) => {
    const combo = emptyFilterCombo();
    await pick(page, "Hashtag", String(combo.hashtag.name_vi));
    await pick(page, "Phòng ban", combo.department);
    await expect(page.getByTestId(SEL.highlight).getByText(TXT.emptyFeed)).toBeVisible();
    await expect(page.getByTestId(SEL.allKudos).getByText(TXT.emptyFeed)).toBeVisible();
    await expect(cardsIn(page, SEL.highlight)).toHaveCount(0);
    await expect(cardsIn(page, SEL.allKudos)).toHaveCount(0);
  });

  test("ID-5 (d01729d4) clicking a hashtag on a card sets the Hashtag filter to that tag", async ({ page }) => {
    const tag = cardsIn(page, SEL.allKudos).first().getByTestId("kudo-hashtag").first();
    const name = ((await tag.textContent()) ?? "").replace(/^#/, "").trim();
    await tag.click();
    await expect(page).toHaveURL(/[?&]hashtag=/);
    for (const card of await cardsIn(page, SEL.allKudos).all()) {
      await expect(card.getByTestId("kudo-hashtag").filter({ hasText: name })).not.toHaveCount(0);
    }
  });
});
