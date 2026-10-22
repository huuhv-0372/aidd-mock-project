// View Kudo (MoMorph onDIohs2bS, Figma 520:18779): the detail page /sun-kudos/{id}. Contract: plans/261021-view-kudo/clarifications.md + plan.md.
// Hardening cases (XSS, close, login next, anonymous sender, contrast, bold) live in the other kudo-detail-*.spec.ts files.
// Signed-in cases run on AUTHED (3103, fake Supabase); guest cases on PAST (3101, anonymous). Each case mints its own sub.
// Selectors + copy: support/kudo-detail-contract.ts. Fixtures: support/kudos-fixtures.mjs (DETAIL_KUDO is kudo_detail-only).
import { randomUUID } from "node:crypto";
import { expect, test, type Locator } from "@playwright/test";
import { AUTHED, PAST } from "./support/authed-session";
import { KUDOS_PATH, SEL, formatKudoTime, openKudos, signInAs } from "./support/kudos-contract";
import { heartCalls, heartLabel } from "./support/kudo-hearts-contract";
import { DETAIL, detailPath } from "./support/kudo-detail-contract";
import { closeButton, frame, openDetail } from "./support/kudo-detail-helpers";
import { DETAIL_END_SENTENCE, DETAIL_KUDO, KUDOS, PEOPLE } from "./support/kudos-fixtures.mjs";

// Feed kudos: TARGET is not mine, not liked, 15 hearts, top of Highlight, on the feed's first page. OWN is sent by the viewer.
const TARGET_ID = String(KUDOS[2].id);
const TARGET_HEARTS = Number(KUDOS[2].heart_count);
const OWN_ID = String(KUDOS[0].id);
const UNKNOWN_ID = "c1000000-0000-0000-0000-00000000ffff"; // valid uuid shape, no fixture

const people = PEOPLE as Record<string, string[]>;
const senderName = people[DETAIL_KUDO.sender_key][0];
const recipientName = people[DETAIL_KUDO.recipient_key][0];

/** Ancestors of `target` (up to the frame) that would cut its text: a line clamp, or overflow hidden with content past the box. */
const clippedAncestors = (target: Locator) => target.evaluate((node, frameTestId) => {
  const clipped: string[] = [];
  for (let el: Element | null = node; el; el = el.parentElement) {
    const clamp = el instanceof HTMLElement ? getComputedStyle(el).getPropertyValue("-webkit-line-clamp") : "none";
    const clamped = clamp !== "" && clamp !== "none";
    const hides = /hidden|clip/.test(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight + 1;
    if (clamped || hides) clipped.push(el.tagName.toLowerCase());
    if (el.getAttribute("data-testid") === frameTestId) break;
  }
  return clipped;
}, DETAIL.frame);

test.describe("View Kudo: page and access", () => {
  test("signed in: 200, title, header 'Sun* Kudos' is current, no footer, frame visible", async ({ page, request }) => {
    const { status } = await openDetail(page, request, detailPath(DETAIL_KUDO.id));
    expect(status).toBe(200);
    await expect(page).toHaveTitle(DETAIL.title.vi);
    await expect(page.getByRole("banner").getByRole("link", { name: SEL.headerLink })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("contentinfo")).toHaveCount(0);
    await expect(frame(page)).toBeVisible();
  });

  test("unknown id answers HTTP 404 with the not-found page", async ({ page, request }) => {
    const { status } = await openDetail(page, request, detailPath(UNKNOWN_ID));
    expect(status).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: DETAIL.notFoundHeading })).toBeVisible();
  });

  test("malformed id answers HTTP 404 with the not-found page", async ({ page, request }) => {
    const { status } = await openDetail(page, request, detailPath("not-a-uuid"));
    expect(status).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: DETAIL.notFoundHeading })).toBeVisible();
  });
});

test.describe("View Kudo: frame content", () => {
  test("sender, recipient, time, title and the full content (no line clamp)", async ({ page, request }) => {
    await openDetail(page, request, detailPath(DETAIL_KUDO.id));
    const f = frame(page);
    await expect(f.getByText(senderName, { exact: true })).toBeVisible();
    await expect(f.getByText(recipientName, { exact: true })).toBeVisible();
    await expect(f.getByText(formatKudoTime(DETAIL_KUDO.created_at), { exact: true })).toBeVisible();
    await expect(f.getByText(DETAIL_KUDO.title, { exact: true })).toBeVisible();
    const end = f.getByText(DETAIL_END_SENTENCE);
    await expect(end, "the last sentence of a long content is shown").toBeVisible();
    expect(await clippedAncestors(end), "nothing between the text and the frame clips it").toEqual([]);
  });

  test("formatted content: bold, italic, strike, list, quote, safe link, mention, escaped asterisks, no javascript link", async ({ page, request }) => {
    await openDetail(page, request, detailPath(DETAIL_KUDO.id));
    const f = frame(page);
    await expect(f.locator("strong").filter({ hasText: "bạn" })).toHaveCount(1);
    await expect(f.locator("em").filter({ hasText: "luôn" })).toHaveCount(1);
    await expect(f.locator("s, del").filter({ hasText: "việc gấp" })).toHaveCount(1);
    await expect(f.locator("ol > li")).toHaveCount(3);
    await expect(f.locator("blockquote").filter({ hasText: "Một đồng đội giỏi" })).toHaveCount(1);
    const link = f.locator('a[href="https://example.com/x"]');
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);
    await expect(link).toHaveAttribute("rel", /noreferrer/);
    await expect(f).toContainText("@Nguyễn Thị Minh Anh");
    await expect(f, "raw mention token never leaks").not.toContainText("@[");
    await expect(f, "raw link token never leaks").not.toContainText("](https://example.com/x)");
    await expect(f, "escaped asterisks print literally").toContainText("Dấu sao *nguyên văn* không phải chữ nghiêng.");
    await expect(f.locator("em").filter({ hasText: "nguyên văn" })).toHaveCount(0);
    await expect(f.locator("a").filter({ hasText: "mở ngay" })).toHaveCount(0);
    await expect(page.getByRole("main")).toHaveCount(1); // guard: an absent <main> must not pass the count below
    await expect(page.getByRole("main").locator('a[href^="javascript:" i]')).toHaveCount(0);
  });

  test("image thumbnails, hashtag filter links, heart with count, Copy Link and Đóng", async ({ page, request }) => {
    await openDetail(page, request, detailPath(DETAIL_KUDO.id));
    const f = frame(page);
    await expect(f.getByTestId("kudo-image")).toHaveCount(DETAIL_KUDO.images.length);
    await expect(f.locator('a[href="/sun-kudos?hashtag=dedicated"]')).toHaveCount(1);
    await expect(f.locator('a[href="/sun-kudos?hashtag=professional"]')).toHaveCount(1);
    await expect(f.getByTestId("kudo-hearts")).toHaveAttribute("aria-label", heartLabel(DETAIL_KUDO.heart_count));
    await expect(page.getByRole("button", { name: DETAIL.copyLink, exact: true })).toBeVisible();
    await expect(closeButton(page)).toBeVisible();
  });
});

test.describe("View Kudo: close and entry points", () => {
  test("Highlight 'Xem chi tiết' opens the detail; Đóng returns to /sun-kudos", async ({ page, request }) => {
    await openKudos(page, request);
    await page.getByTestId(SEL.highlight).locator(`a[href="${detailPath(TARGET_ID)}"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`${detailPath(TARGET_ID)}$`));
    await closeButton(page).click();
    await expect(page).toHaveURL(new RegExp(`${KUDOS_PATH}$`));
  });

  test("opened directly (no history): Đóng goes to /sun-kudos", async ({ page, request }) => {
    await openDetail(page, request, detailPath(TARGET_ID));
    await closeButton(page).click();
    await expect(page).toHaveURL(new RegExp(`${KUDOS_PATH}$`));
  });

  // After Google sign-in the OAuth hops collapse into one entry right after /login?next=…, so the only same-site page behind
  // the Kudo is the login page. Simulated here: the guest login page, then the session cookie, then the Kudo.
  test("arrived from the login page: Đóng goes to /sun-kudos, not back to /login", async ({ page, request }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${AUTHED}/login?next=${encodeURIComponent(detailPath(TARGET_ID))}`);
    await signInAs(page, request, randomUUID());
    await page.goto(`${AUTHED}${detailPath(TARGET_ID)}`);
    await closeButton(page).click();
    await expect(page).toHaveURL(new RegExp(`${KUDOS_PATH}$`));
  });

  test("All Kudos card: the content block opens the detail", async ({ page, request }) => {
    await openKudos(page, request);
    const card = page.getByTestId(SEL.allKudos).locator(`[data-testid="${SEL.kudoCard}"][data-kudo-id="${TARGET_ID}"]`);
    await expect(card.locator(`a[href="${detailPath(TARGET_ID)}"]`)).toHaveCount(1);
    await card.getByTestId("kudo-content").click();
    await expect(page).toHaveURL(new RegExp(`${detailPath(TARGET_ID)}$`));
  });
});

test.describe("View Kudo: guest", () => {
  test("guest goes to /login?next=/sun-kudos/{id}; the next value is not printed", async ({ page }) => {
    await page.goto(`${PAST}${detailPath(TARGET_ID)}`);
    const url = new URL(page.url());
    expect(url.pathname).toBe("/login");
    expect(url.searchParams.get("next")).toBe(detailPath(TARGET_ID));
    await expect(page.getByRole("button", { name: DETAIL.loginButton })).toBeVisible(); // guard: the login page really rendered
    expect(await page.locator("body").innerText()).not.toContain(detailPath(TARGET_ID));
    // The sign-in form carries it to the server action (hidden field), which stores it for the callback.
    await expect(page.locator('form input[type="hidden"][name="next"]')).toHaveValue(detailPath(TARGET_ID));
  });

  test("guest /login?next=<external URL> renders the login page; no redirect off-site", async ({ page }) => {
    const res = await page.goto(`${PAST}/login?next=${encodeURIComponent("https://evil.example")}`);
    expect(res?.status()).toBe(200);
    const url = new URL(page.url());
    expect(url.origin).toBe(PAST);
    expect(url.pathname).toBe("/login");
    await expect(page.getByRole("button", { name: DETAIL.loginButton })).toBeVisible();
    await expect(page.locator('form input[name="next"]')).toHaveCount(0);
  });
});

test.describe("View Kudo: locale, layout and hearts", () => {
  test("EN: title, Close button and html lang", async ({ page, request }) => {
    await openDetail(page, request, detailPath(DETAIL_KUDO.id), { locale: "en" });
    await expect(page).toHaveTitle(DETAIL.title.en);
    await expect(closeButton(page, "en")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("375x812: no horizontal scroll and the frame is visible", async ({ page, request }) => {
    await openDetail(page, request, detailPath(DETAIL_KUDO.id), { width: 375, height: 812 });
    await expect(frame(page)).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("heart: like, reload keeps it, unlike; one RPC per click", async ({ page, request }) => {
    const { sub } = await openDetail(page, request, detailPath(TARGET_ID));
    const heart = frame(page).getByTestId("kudo-hearts");
    await expect(heart).toHaveAttribute("aria-pressed", "false");
    await expect(heart).toHaveAttribute("aria-label", heartLabel(TARGET_HEARTS));
    await heart.click();
    await expect(heart).toHaveAttribute("aria-pressed", "true");
    await expect(heart).toHaveAttribute("aria-label", heartLabel(TARGET_HEARTS + 1));
    await expect.poll(async () => (await heartCalls(request, sub)).length).toBe(1);

    await page.reload();
    const reloaded = frame(page).getByTestId("kudo-hearts");
    await expect(reloaded).toHaveAttribute("aria-pressed", "true");
    await expect(reloaded).toHaveAttribute("aria-label", heartLabel(TARGET_HEARTS + 1));
    await reloaded.click();
    await expect(reloaded).toHaveAttribute("aria-pressed", "false");
    await expect.poll(async () => (await heartCalls(request, sub)).length).toBe(2);
    expect(await heartCalls(request, sub)).toEqual([
      { p_kudo_id: TARGET_ID, p_liked: true },
      { p_kudo_id: TARGET_ID, p_liked: false },
    ]);
  });

  test("own Kudo: the heart is disabled and a click sends nothing", async ({ page, request }) => {
    const { sub } = await openDetail(page, request, detailPath(OWN_ID));
    const heart = frame(page).getByTestId("kudo-hearts");
    await expect(heart).toBeDisabled();
    await expect(heart).toHaveAttribute("data-own", "true");
    await heart.click({ force: true }); // a disabled button fires no click
    await page.waitForTimeout(500); // a request would reach the fake well within this
    expect(await heartCalls(request, sub)).toHaveLength(0);
  });
});
