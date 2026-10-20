// Sun* Kudos Live board (MoMorph MaZUn5xHXZ) — Like Kudos (#13): the heart toggles the viewer's like through the
// set_kudo_heart RPC. Test cases: plans/momorph-specs/sun-kudos-live-board-MaZUn5xHXZ/test-cases.csv (7a7ec63e, 91e102ba,
// 63645b03). Selector + fake contract: support/kudos-contract.ts (KUDO_HEART, SEL), support/kudo-hearts-contract.ts.
// Runs on AUTHED (3103, fake Supabase). Every case mints its own sub, so fake-side heart state never leaks between cases.
// Side effects (RPC payload and call count) are asserted through the fake's call log, not only the heart's look.
import { test, expect, type Locator, type Page } from "@playwright/test";
import { KUDOS_PATH, SEL, openAuthed } from "./support/kudos-contract";
import { delayHeartCalls, failNextHeartCall, heartCalls, heartErrorToast, heartIn, heartLabel } from "./support/kudo-hearts-contract";
import { KUDOS } from "./support/kudos-fixtures.mjs";

// Fixtures (kudos-fixtures.mjs). TARGET: not mine, not liked, BASE hearts, on Highlight slide 1 AND in the feed's first page.
// OWN: sent by the viewer. LATE: 11th kudo, only reachable by infinite scroll.
const TARGET_ID = String(KUDOS[2].id);
const OWN_ID = String(KUDOS[0].id);
const LATE_ID = String(KUDOS[10].id);
const BASE = Number(KUDOS[2].heart_count);

const iconColor = (heart: Locator) => heart.locator(".kudos-icon-heart").evaluate((el) => getComputedStyle(el).color);
const callCount = (request: Parameters<typeof heartCalls>[0], sub: string) => heartCalls(request, sub).then((c) => c.length);
const feedHeart = (page: Page, id: string) => heartIn(page, SEL.allKudos, id);

test.describe("Sun* Kudos: heart toggle", () => {
  test("7a7ec63e like then unlike: colour and count move, exactly one RPC per click with the exact payload", async ({ page, request }) => {
    const sub = await openAuthed(page, request, KUDOS_PATH);
    const heart = feedHeart(page, TARGET_ID);
    await expect(heart, "the heart must be a button").toHaveRole("button");
    await expect(heart).toHaveAttribute("aria-pressed", "false");
    await expect(heart).toHaveAttribute("aria-label", heartLabel(BASE));
    const grey = await iconColor(heart);

    await heart.click();
    await expect(heart).toHaveAttribute("aria-pressed", "true");
    await expect(heart).toHaveAttribute("aria-label", heartLabel(BASE + 1));
    await expect(heart).toHaveAttribute("data-liked", "true");
    expect(await iconColor(heart), "liked heart is red, not grey").not.toBe(grey);
    await expect.poll(() => callCount(request, sub)).toBe(1);
    await expect(heart).toBeEnabled();
    expect(await heartCalls(request, sub)).toEqual([{ p_kudo_id: TARGET_ID, p_liked: true }]);

    await heart.click();
    await expect(heart).toHaveAttribute("aria-pressed", "false");
    await expect(heart).toHaveAttribute("aria-label", heartLabel(BASE));
    await expect(heart).toHaveAttribute("data-liked", "false");
    expect(await iconColor(heart), "unliked heart is grey again").toBe(grey);
    await expect.poll(() => callCount(request, sub)).toBe(2);
    await expect(heart).toBeEnabled();
    expect(await heartCalls(request, sub)).toEqual([
      { p_kudo_id: TARGET_ID, p_liked: true },
      { p_kudo_id: TARGET_ID, p_liked: false },
    ]);
  });

  test("91e102ba the like survives a reload (the fake stored it, not the page)", async ({ page, request }) => {
    const sub = await openAuthed(page, request, KUDOS_PATH);
    const heart = feedHeart(page, TARGET_ID);
    await heart.click();
    await expect(heart).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => callCount(request, sub)).toBe(1);
    await expect(heart).toBeEnabled();

    await page.reload();
    const reloaded = feedHeart(page, TARGET_ID);
    await expect(reloaded).toHaveAttribute("aria-pressed", "true");
    await expect(reloaded).toHaveAttribute("aria-label", heartLabel(BASE + 1));
    expect(await heartCalls(request, sub), "a reload sends no RPC").toHaveLength(1);
  });

  test("sync: a Kudo shown in Highlight and in the feed changes in both places at once", async ({ page, request }) => {
    const sub = await openAuthed(page, request, KUDOS_PATH);
    const inHighlight = heartIn(page, SEL.highlight, TARGET_ID);
    const inFeed = feedHeart(page, TARGET_ID);
    await expect(inHighlight, "TARGET is on Highlight slide 1").toHaveAttribute("aria-pressed", "false");

    await inHighlight.click();
    await expect(inHighlight).toHaveAttribute("aria-pressed", "true");
    await expect(inFeed, "the feed copy follows the Highlight click").toHaveAttribute("aria-pressed", "true");
    await expect(inFeed).toHaveAttribute("aria-label", heartLabel(BASE + 1));
    await expect.poll(() => callCount(request, sub)).toBe(1);
    await expect(inHighlight).toBeEnabled();

    await inFeed.click(); // and the other way round
    await expect(inHighlight, "the Highlight copy follows the feed click").toHaveAttribute("aria-pressed", "false");
    await expect(inHighlight).toHaveAttribute("aria-label", heartLabel(BASE));
    await expect.poll(() => callCount(request, sub)).toBe(2);
    await expect(inFeed).toBeEnabled();
    expect((await heartCalls(request, sub)).map((c) => c.p_liked)).toEqual([true, false]);
  });
});

test.describe("Sun* Kudos: heart guards", () => {
  test("63645b03 own Kudo: the heart is disabled and a click sends no RPC", async ({ page, request }) => {
    const sub = await openAuthed(page, request, KUDOS_PATH);
    const heart = feedHeart(page, OWN_ID);
    await expect(heart, "own Kudo: heart is a disabled button").toBeDisabled();
    await expect(heart).toHaveAttribute("data-own", "true");
    await heart.click({ force: true }); // a disabled button fires no click
    await page.waitForTimeout(500); // a request would reach the fake well within this
    expect(await heartCalls(request, sub)).toHaveLength(0);
  });

  test("rapid double click on an unliked Kudo sends one RPC; the button stays locked until the answer", async ({ page, request }) => {
    const sub = await openAuthed(page, request, KUDOS_PATH);
    await delayHeartCalls(request, sub, 1500); // hold the answer so the locked window is observable
    const heart = feedHeart(page, TARGET_ID);
    await heart.dblclick();
    await expect(heart, "while the RPC is pending the heart is aria-disabled").toHaveAttribute("aria-disabled", "true");
    await expect.poll(() => callCount(request, sub)).toBe(1);
    await expect(heart).toBeEnabled({ timeout: 5_000 });
    await expect(heart).toHaveAttribute("aria-pressed", "true");
    expect(await heartCalls(request, sub), "the second click never reached the server").toEqual([{ p_kudo_id: TARGET_ID, p_liked: true }]);
  });

  for (const code of ["500", "not_found"] as const) {
    test(`server refusal (${code}) rolls the heart back, shows the toast and re-enables the button`, async ({ page, request }) => {
      const sub = await openAuthed(page, request, KUDOS_PATH);
      await delayHeartCalls(request, sub, 800); // the optimistic state must be visible before the refusal lands
      await failNextHeartCall(request, sub, code);
      const heart = feedHeart(page, TARGET_ID);
      await heart.click();
      await expect(heart, "optimistic: liked at once").toHaveAttribute("aria-pressed", "true");
      await expect(heart).toHaveAttribute("aria-label", heartLabel(BASE + 1));
      await expect(heart, "rolled back once the server refuses").toHaveAttribute("aria-pressed", "false", { timeout: 5_000 });
      await expect(heart).toHaveAttribute("aria-label", heartLabel(BASE));
      await expect(heart).toHaveAttribute("data-liked", "false");
      await expect(heart).toBeEnabled();
      await expect(heartErrorToast(page), "toast in the status region").toBeVisible();

      await delayHeartCalls(request, sub, 0);
      await heart.click(); // the failure was one-shot: a retry is accepted
      await expect(heart).toHaveAttribute("aria-pressed", "true");
      await expect.poll(() => callCount(request, sub)).toBe(2);
      expect(await heartCalls(request, sub)).toEqual([
        { p_kudo_id: TARGET_ID, p_liked: true },
        { p_kudo_id: TARGET_ID, p_liked: true },
      ]);
    });
  }

  test("a Kudo loaded by infinite scroll can be liked", async ({ page, request }) => {
    const sub = await openAuthed(page, request, KUDOS_PATH);
    const late = feedHeart(page, LATE_ID);
    await expect(async () => {
      await page.getByTestId(SEL.allKudos).getByTestId(SEL.kudoCard).last().scrollIntoViewIfNeeded();
      await expect(late).toBeAttached({ timeout: 1_000 });
    }).toPass({ timeout: 15_000 });
    await late.scrollIntoViewIfNeeded();
    await late.click();
    await expect(late).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => callCount(request, sub)).toBe(1);
    expect(await heartCalls(request, sub)).toEqual([{ p_kudo_id: LATE_ID, p_liked: true }]);
  });

  test("keyboard: the heart takes focus, Space likes and Enter unlikes", async ({ page, request }) => {
    const sub = await openAuthed(page, request, KUDOS_PATH);
    const heart = feedHeart(page, TARGET_ID);
    await expect(heart).toHaveRole("button");
    await expect(heart).toHaveAccessibleName(heartLabel(BASE));
    await heart.focus();
    await expect(heart).toBeFocused();

    await page.keyboard.press("Space");
    await expect(heart).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => callCount(request, sub)).toBe(1);
    await expect(heart).toBeEnabled();
    await expect(heart, "pending is aria-disabled only, so focus stays on the heart").toBeFocused();

    await page.keyboard.press("Enter");
    await expect(heart).toHaveAttribute("aria-pressed", "false");
    await expect.poll(() => callCount(request, sub)).toBe(2);
    expect((await heartCalls(request, sub)).map((c) => c.p_liked)).toEqual([true, false]);
  });
});
