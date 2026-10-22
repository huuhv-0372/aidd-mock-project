// View Kudo visual contract (review 261021 B4 + owner decision 2026-10-22): the keyboard focus ring must reach 3:1 on the cream
// card (WCAG 1.4.11; #ffea9e on #fff8e1 is about 1.13:1), and Montserrat carries real 800 / 900 faces so <strong> inside a 700
// block is drawn in a true heavier face. Helpers: support/focus-contrast.ts.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { DETAIL, detailPath } from "./support/kudo-detail-contract";
import { closeButton, frame, openDetail } from "./support/kudo-detail-helpers";
import { expectFocusRingContrast } from "./support/focus-contrast";
import { SEL, openKudos } from "./support/kudos-contract";
import { DETAIL_KUDO, KUDOS } from "./support/kudos-fixtures.mjs";

const CARD_ID = String(KUDOS[2].id);

const RING_TARGETS: [string, (page: Page) => Locator][] = [
  ["content link", (page) => frame(page).locator('a[href="https://example.com/x"]')],
  ["Đóng", (page) => closeButton(page)],
  ["Copy Link", (page) => frame(page).getByRole("button", { name: DETAIL.copyLink, exact: true })],
  ["heart", (page) => frame(page).getByTestId("kudo-hearts")],
  ["hashtag", (page) => frame(page).locator('a[href="/sun-kudos?hashtag=dedicated"]')],
];

test.describe("View Kudo: focus ring contrast (B4)", () => {
  for (const [name, locate] of RING_TARGETS) {
    test(`detail card: ${name} ring is at least 3:1 on its surface`, async ({ page, request }) => {
      await openDetail(page, request, detailPath(DETAIL_KUDO.id));
      await expectFocusRingContrast(page, locate(page), `detail ${name}`);
    });
  }

  test("All Kudos card: the content link ring is at least 3:1 on its surface", async ({ page, request }) => {
    await openKudos(page, request);
    const link = page.getByTestId(SEL.allKudos).locator(`[data-testid="${SEL.kudoCard}"][data-kudo-id="${CARD_ID}"] a[href="${detailPath(CARD_ID)}"]`);
    await expectFocusRingContrast(page, link, "All Kudos content link");
  });
});

test.describe("View Kudo: bold weights (Montserrat 800 / 900)", () => {
  test("the page declares Montserrat faces for 800 and 900", async ({ page, request }) => {
    await openDetail(page, request, detailPath(DETAIL_KUDO.id));
    await expect(frame(page)).toBeVisible();
    // next/font renames the family (e.g. "__Montserrat_a1b2c3"), so match on the name; weight is the face's declared weight.
    const weights = await page.evaluate(async () => {
      await document.fonts.ready;
      return [...document.fonts].filter((f) => /montserrat/i.test(f.family)).map((f) => f.weight);
    });
    const covers = (face: string, weight: number) => {
      const [lo, hi = lo] = face.split(/\s+/).map(Number); // "900", or "100 900" for a variable face
      return lo <= weight && weight <= hi;
    };
    for (const weight of [800, 900]) {
      expect(weights.some((face) => covers(face, weight)), `a Montserrat face covers ${weight} (declared: ${weights.join(", ")})`).toBe(true);
    }
  });

  test("<strong> in the 700 content block computes to 800 or heavier", async ({ page, request }) => {
    await openDetail(page, request, detailPath(DETAIL_KUDO.id));
    const strong = frame(page).locator("strong").filter({ hasText: "bạn" });
    await expect(strong).toHaveCount(1);
    const { inner, outer } = await strong.evaluate((el) => ({
      inner: Number(getComputedStyle(el).fontWeight),
      outer: Number(getComputedStyle(el.parentElement as HTMLElement).fontWeight),
    }));
    expect(outer, "the paragraph around it stays 700").toBe(700);
    expect(inner, "bold inside it").toBeGreaterThanOrEqual(800);
  });
});
