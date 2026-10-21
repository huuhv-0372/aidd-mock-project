// Profile (MoMorph 3FoIx6ALVb "Profile bản thân", w4WUvsJ9KI "Profile người khác"): /profile (self) and /profile/<id> (other).
// Phase 01 RED: every positive case fails at its first profile assertion: the 200 check (no profile route yet, the catch-all answers 404),
// or for the redirect case the hero testid.
// The guard cases (bad ids 404, guest to /login) already pass and stay as guards. Contract: support/profile-contract.ts.
// Fixtures: support/kudos-fixtures.mjs (board people and rows) and support/profile-fixtures.mjs (busy and sparse profiles).
// Signed-in cases run on AUTHED (3103, fake Supabase); guest cases on PAST (3101, anonymous). Each case mints its own sub.
import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext, type Locator, type Page } from "@playwright/test";
import { SEL, TXT, WIDGET, recipientBox, signInAs, writeDialog } from "./support/kudos-contract";
import { heartCalls, heartIn, heartLabel } from "./support/kudo-hearts-contract";
import { DETAIL, detailPath } from "./support/kudo-detail-contract";
import { PROFILE, PROFILE_PATH, PROFILE_TXT, profilePath } from "./support/profile-contract";
import { BUSY_PROFILE, SPARSE_PROFILE } from "./support/profile-fixtures.mjs";
import { EMPTY_USER_ID, KUDOS, PEOPLE, personId, viewerStats } from "./support/kudos-fixtures.mjs";

const AUTHED = process.env.E2E_AUTHED_URL || "http://localhost:3103";
const PAST = process.env.E2E_PAST_URL || "http://localhost:3101";
const UNKNOWN_ID = "c1000000-0000-0000-0000-00000000ffff"; // valid uuid shape, no profile
const people = PEOPLE as Record<string, string[]>;

// Board fixtures. The .mjs fields infer as unions, so each one is coerced once here (as in kudo-detail.spec.ts).
const kudoId = (i: number) => String(KUDOS[i].id);
const receivedIds = (key: string) => KUDOS.filter((k) => String(k.recipient_key) === key).map((k) => String(k.id)); // newest first
const sentIds = (key: string) => KUDOS.filter((k) => String(k.sender_key) === key).map((k) => String(k.id));
const stats = viewerStats();
const VIEWER = { name: people.viewer[0], dept: people.viewer[1] };
const SELF_RECEIVED = receivedIds("viewer"); // KUDOS 1, 5, 13
const SELF_SENT = sentIds("viewer"); // KUDOS 0, 18
const OTHER = { key: "p01", id: personId("p01"), name: people.p01[0], dept: people.p01[1] }; // 3 received, 1 sent
const ANON_SENDER = { key: "p05", id: personId("p05"), name: people.p05[0] }; // sent an anonymous Kudo (SEC case)
const ANON_RECIPIENT = { key: "p06", id: personId("p06"), name: people.p06[0] }; // its only received Kudo is that anonymous one
const ANON_ALIAS = String(KUDOS[4].anonymous_name);
const HEART_KUDO = kudoId(5); // p06 -> viewer, not liked: a real KUDOS row (the heart fake refuses profile-only rows)
const HEART_COUNT = Number(KUDOS[5].heart_count);
const SENT_KUDO = kudoId(0); // viewer -> p01: on my Sent list, so my own heart is disabled
const HASHTAG_HREF = "/sun-kudos?hashtag=customer-focused"; // KUDOS 5's only hashtag

type OpenOpts = { sub?: string; locale?: "en"; width?: number; height?: number };

/** Signs in as `sub` (fresh by default), sets the viewport and an optional EN locale, then opens `path` on AUTHED. */
async function openProfile(page: Page, request: APIRequestContext, path: string, opts: OpenOpts = {}) {
  const sub = opts.sub ?? randomUUID();
  await page.setViewportSize({ width: opts.width ?? 1440, height: opts.height ?? 900 });
  await signInAs(page, request, sub);
  if (opts.locale) await page.context().addCookies([{ name: "NEXT_LOCALE", value: opts.locale, url: AUTHED }]);
  const res = await page.goto(`${AUTHED}${path}`);
  return { sub, status: res?.status() };
}

/** Opens a page that must exist. Its 200 check is the first red line of every positive case. */
async function openPage(page: Page, request: APIRequestContext, path: string, opts: OpenOpts = {}): Promise<string> {
  const { sub, status } = await openProfile(page, request, path, opts);
  expect(status, `GET ${path} must answer 200 (the profile route is not built yet)`).toBe(200);
  return sub;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const innerText = (page: Page) => page.locator("body").innerText();
const overflowX = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

const hero = (page: Page) => page.getByTestId(PROFILE.hero);
const heroName = (page: Page) => hero(page).getByRole("heading", { level: 1 });
const section = (page: Page) => page.getByTestId(PROFILE.kudos);
const cards = (page: Page) => section(page).getByTestId(SEL.kudoCard);
const card = (page: Page, id: string) => section(page).locator(`[data-testid="${SEL.kudoCard}"][data-kudo-id="${id}"]`);
const cardIds = (locator: Locator) => locator.evaluateAll((els) => els.map((el) => el.getAttribute("data-kudo-id")));
const direction = (page: Page) => page.getByTestId(PROFILE.kudosFilter);
const header = (page: Page) => page.getByRole("banner").getByRole("link", { name: SEL.headerLink, exact: true });
const footerLink = (page: Page) => page.getByRole("contentinfo").getByRole("link", { name: SEL.headerLink, exact: true });
const writeBar = (page: Page, name: string, locale: "vi" | "en" = "vi") =>
  page.getByRole("button", { name: PROFILE_TXT.writeBar[locale](name), exact: true });

/** Opens the direction dropdown and picks one option by its label. */
async function pickDirection(page: Page, label: string) {
  await direction(page).click();
  await page.getByRole("listbox").getByRole("option", { name: label, exact: true }).click();
}

test.describe("Profile: routes and guards", () => {
  test("signed in: /profile is the self view; header and footer 'Sun* Kudos' are current; no Write-KUDOS widget", async ({ page, request }) => {
    await openPage(page, request, PROFILE_PATH);
    await expect(page).toHaveTitle(PROFILE_TXT.pageTitle.self.vi);
    await expect(hero(page)).toBeVisible();
    await expect(header(page)).toHaveAttribute("aria-current", "page");
    await expect(footerLink(page)).toHaveAttribute("aria-current", "page");
    await expect(page.getByTestId(WIDGET.button)).toHaveCount(0);
  });

  test("another Sunner: /profile/<id> is that profile, with its title; header and footer are current", async ({ page, request }) => {
    await openPage(page, request, profilePath(OTHER.id));
    await expect(page).toHaveTitle(PROFILE_TXT.pageTitle.other(OTHER.name));
    await expect(heroName(page)).toHaveText(OTHER.name);
    await expect(header(page)).toHaveAttribute("aria-current", "page");
    await expect(footerLink(page)).toHaveAttribute("aria-current", "page");
  });

  test("/profile/<own sub> redirects to /profile and shows the self view", async ({ page, request }) => {
    const sub = randomUUID();
    await openProfile(page, request, profilePath(sub), { sub });
    await expect(hero(page)).toBeVisible();
    expect(new URL(page.url()).pathname).toBe(PROFILE_PATH);
    await expect(heroName(page)).toHaveText(VIEWER.name);
  });

  test("an unknown guid answers 404 with the not-found heading", async ({ page, request }) => {
    const { status } = await openProfile(page, request, profilePath(UNKNOWN_ID));
    expect(status).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: DETAIL.notFoundHeading })).toBeVisible();
  });

  test("malformed ids answer 404", async ({ page, request }) => {
    await signInAs(page, request, randomUUID());
    for (const id of ["not-a-uuid", "banana", "42", "11111111-1111-4111-8111", "%27%20or%201%3D1"]) {
      const res = await page.goto(`${AUTHED}${profilePath(id)}`);
      expect(res?.status(), id).toBe(404);
    }
  });

  test("guest on /profile or /profile/<id> lands on /login with no next, and no profile renders", async ({ page }) => {
    for (const path of [PROFILE_PATH, profilePath(OTHER.id)]) {
      await page.goto(`${PAST}${path}`);
      const url = new URL(page.url());
      expect(url.pathname, path).toBe("/login");
      expect(url.searchParams.has("next"), path).toBe(false);
      await expect(page.getByRole("button", { name: DETAIL.loginButton })).toBeVisible(); // guard: the login page really rendered
      await expect(page.locator('form input[name="next"]')).toHaveCount(0);
      expect(await innerText(page), path).not.toContain(OTHER.name);
    }
  });
});

test.describe("Profile: my own page", () => {
  test("hero: avatar, name, department and the New Hero badge; no stars below 10 Kudos", async ({ page, request }) => {
    await openPage(page, request, PROFILE_PATH);
    await expect(heroName(page)).toHaveText(VIEWER.name);
    await expect(hero(page)).toContainText(VIEWER.dept);
    await expect(hero(page).getByTestId(PROFILE.avatar)).toBeVisible();
    await expect(hero(page).getByTestId(PROFILE.heroBadge)).toContainText("New Hero"); // 3 distinct senders
    await expect(hero(page).getByTestId(PROFILE.heroStars)).toHaveCount(0); // 3 received: under the first star
  });

  test("icons: six grey slots under the first-person heading", async ({ page, request }) => {
    await openPage(page, request, PROFILE_PATH);
    const icons = page.getByTestId(PROFILE.icons);
    await expect(icons.getByRole("heading", { name: PROFILE_TXT.iconsHeading.self.vi, exact: true })).toBeVisible();
    await expect(icons.getByTestId(PROFILE.iconSlot)).toHaveCount(6);
  });

  test("statistics: my five counters; Mở Secret Box stays aria-disabled and opens nothing", async ({ page, request }) => {
    await openPage(page, request, PROFILE_PATH);
    const panel = page.getByTestId(PROFILE.stats);
    const values = [stats.received, stats.sent, stats.hearts_received, stats.boxes_opened, stats.boxes_unopened];
    for (const [i, label] of TXT.statLabels.entries()) {
      await expect(panel).toContainText(new RegExp(`${escapeRe(label)}\\s*${values[i]}\\b`));
    }
    const openBox = page.getByRole("button", { name: PROFILE_TXT.secretBox, exact: true });
    await expect(openBox).toHaveAttribute("aria-disabled", "true");
    await openBox.click({ force: true }); // a plain click would wait on aria-disabled; forced, it must still open nothing
    await expect(writeDialog(page)).toBeHidden();
  });

  test("KUDOS: eyebrow, heading, and the dropdown reads Đã nhận (3) with Đã gửi (2) as its other option", async ({ page, request }) => {
    await openPage(page, request, PROFILE_PATH);
    await expect(section(page)).toContainText(PROFILE_TXT.eyebrow);
    await expect(section(page).getByRole("heading", { name: PROFILE_TXT.kudosHeading, exact: true })).toBeVisible();
    await expect(direction(page)).toHaveText(PROFILE_TXT.received.vi(stats.received));
    await direction(page).click();
    const listbox = page.getByRole("listbox");
    await expect(listbox.getByRole("option", { name: PROFILE_TXT.received.vi(stats.received), exact: true })).toHaveAttribute("aria-selected", "true");
    await expect(listbox.getByRole("option", { name: PROFILE_TXT.sent.vi(stats.sent), exact: true })).toBeVisible();
    await expect(listbox.getByRole("option")).toHaveCount(2);
  });

  test("Đã gửi lists only my sent Kudos; Đã nhận restores the received list", async ({ page, request }) => {
    await openPage(page, request, PROFILE_PATH);
    await expect.poll(() => cardIds(cards(page))).toEqual(SELF_RECEIVED);
    await pickDirection(page, PROFILE_TXT.sent.vi(stats.sent));
    await expect.poll(() => cardIds(cards(page))).toEqual(SELF_SENT);
    await expect(direction(page)).toHaveText(PROFILE_TXT.sent.vi(stats.sent));
    await pickDirection(page, PROFILE_TXT.received.vi(stats.received));
    await expect.poll(() => cardIds(cards(page))).toEqual(SELF_RECEIVED);
    await expect(direction(page)).toHaveText(PROFILE_TXT.received.vi(stats.received));
  });

  test("re-picking the active option closes the list and changes nothing", async ({ page, request }) => {
    await openPage(page, request, PROFILE_PATH);
    await expect.poll(() => cardIds(cards(page))).toEqual(SELF_RECEIVED);
    let feedRequests = 0;
    page.on("request", (req) => {
      if (req.method() === "POST" && req.headers()["next-action"]) feedRequests += 1; // a feed page is a server action
    });
    await direction(page).click();
    await page.getByRole("listbox").getByRole("option", { name: PROFILE_TXT.received.vi(stats.received), exact: true }).click();
    await expect(page.getByRole("listbox")).toBeHidden();
    await page.waitForTimeout(500); // a feed request would reach the server well within this
    expect(feedRequests).toBe(0);
    await expect.poll(() => cardIds(cards(page))).toEqual(SELF_RECEIVED);
  });

  test("no write bar on my own profile: the statistics card takes its place", async ({ page, request }) => {
    await openPage(page, request, PROFILE_PATH);
    await expect(page.getByTestId(PROFILE.stats)).toBeVisible();
    await expect(page.getByRole("button", { name: /Gửi lời cám ơn|Send thanks/ })).toHaveCount(0);
  });

  test("a card links as on the board: name links to the profile, hashtag to the board filter, content to the Kudo", async ({ page, request }) => {
    const sub = await openPage(page, request, PROFILE_PATH);
    const c = card(page, HEART_KUDO);
    await expect(c).toBeVisible();
    await expect(c.getByTestId("kudo-sender")).toHaveAttribute("href", profilePath(personId("p06")));
    await expect(c.getByTestId("kudo-recipient")).toHaveAttribute("href", profilePath(sub));
    await expect(c.getByTestId("kudo-hashtag")).toHaveAttribute("href", HASHTAG_HREF);
    await expect(c.locator(`a[href="${detailPath(HEART_KUDO)}"]`)).toHaveCount(1);
    await c.getByTestId("kudo-content").click();
    await expect(page).toHaveURL(new RegExp(`${detailPath(HEART_KUDO)}$`));
  });

  test("Copy Link writes the Kudo's link to the clipboard and shows the board toast", async ({ page, request }) => {
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin: AUTHED });
    await openPage(page, request, PROFILE_PATH);
    await card(page, HEART_KUDO).getByRole("button", { name: TXT.copyLink, exact: true }).click();
    await expect(page.getByRole("status")).toContainText(TXT.toast);
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`${AUTHED}${detailPath(HEART_KUDO)}`);
  });

  test("heart: like, reload keeps it, unlike; one set_kudo_heart call per click", async ({ page, request }) => {
    const sub = await openPage(page, request, PROFILE_PATH);
    const heart = heartIn(page, PROFILE.kudos, HEART_KUDO);
    await expect(heart).toHaveAttribute("aria-pressed", "false");
    await expect(heart).toHaveAttribute("aria-label", heartLabel(HEART_COUNT));
    await heart.click();
    await expect(heart).toHaveAttribute("aria-pressed", "true");
    await expect(heart).toHaveAttribute("aria-label", heartLabel(HEART_COUNT + 1));
    await expect.poll(async () => (await heartCalls(request, sub)).length).toBe(1);

    await page.reload();
    const reloaded = heartIn(page, PROFILE.kudos, HEART_KUDO);
    await expect(reloaded).toHaveAttribute("aria-pressed", "true");
    await expect(reloaded).toHaveAttribute("aria-label", heartLabel(HEART_COUNT + 1));
    await reloaded.click();
    await expect(reloaded).toHaveAttribute("aria-pressed", "false");
    await expect.poll(async () => (await heartCalls(request, sub)).length).toBe(2);
    expect(await heartCalls(request, sub)).toEqual([
      { p_kudo_id: HEART_KUDO, p_liked: true },
      { p_kudo_id: HEART_KUDO, p_liked: false },
    ]);
  });

  test("a Kudo I sent: its heart is disabled and a click sends nothing", async ({ page, request }) => {
    const sub = await openPage(page, request, PROFILE_PATH);
    await pickDirection(page, PROFILE_TXT.sent.vi(stats.sent));
    await expect.poll(() => cardIds(cards(page))).toEqual(SELF_SENT);
    const heart = heartIn(page, PROFILE.kudos, SENT_KUDO);
    await expect(heart).toBeDisabled();
    await expect(heart).toHaveAttribute("data-own", "true");
    await heart.click({ force: true }); // a disabled button fires no click
    await page.waitForTimeout(500);
    expect(await heartCalls(request, sub)).toHaveLength(0);
  });

  test("375x812: no horizontal scroll", async ({ page, request }) => {
    await openPage(page, request, PROFILE_PATH, { width: 375, height: 812 });
    await expect(hero(page)).toBeVisible();
    expect(await overflowX(page)).toBeLessThanOrEqual(0);
  });

  test("EN: title, icons heading, and the Received / Sent labels", async ({ page, request }) => {
    await openPage(page, request, PROFILE_PATH, { locale: "en" });
    await expect(page).toHaveTitle(PROFILE_TXT.pageTitle.self.en);
    await expect(page.getByTestId(PROFILE.icons).getByRole("heading", { name: PROFILE_TXT.iconsHeading.self.en, exact: true })).toBeVisible();
    await expect(direction(page)).toHaveText(PROFILE_TXT.received.en(stats.received));
    await direction(page).click();
    await expect(page.getByRole("listbox").getByRole("option", { name: PROFILE_TXT.sent.en(stats.sent), exact: true })).toBeVisible();
  });

  test("no Kudos yet: zero counts, the received empty line, then the sent empty line", async ({ page, request }) => {
    await openPage(page, request, PROFILE_PATH, { sub: EMPTY_USER_ID });
    await expect(heroName(page)).toHaveText(VIEWER.name);
    await expect(page.getByTestId(PROFILE.stats)).toContainText(new RegExp(`${escapeRe(TXT.statLabels[0])}\\s*0\\b`));
    await expect(direction(page)).toHaveText(PROFILE_TXT.received.vi(0));
    await expect(section(page).getByText(PROFILE_TXT.emptyReceived, { exact: true })).toBeVisible();
    await expect(cards(page)).toHaveCount(0);
    await pickDirection(page, PROFILE_TXT.sent.vi(0));
    await expect(section(page).getByText(PROFILE_TXT.emptySent.vi, { exact: true })).toBeVisible();
  });

  test("EN: the empty Sent line", async ({ page, request }) => {
    await openPage(page, request, PROFILE_PATH, { sub: EMPTY_USER_ID, locale: "en" });
    await pickDirection(page, PROFILE_TXT.sent.en(0));
    await expect(section(page).getByText(PROFILE_TXT.emptySent.en, { exact: true })).toBeVisible();
  });
});

test.describe("Profile: another Sunner", () => {
  test("hero and icons: name, department, New Hero badge, six slots; no statistics card", async ({ page, request }) => {
    await openPage(page, request, profilePath(OTHER.id));
    await expect(heroName(page)).toHaveText(OTHER.name);
    await expect(hero(page)).toContainText(OTHER.dept);
    await expect(hero(page).getByTestId(PROFILE.heroBadge)).toContainText("New Hero"); // 3 received from 3 senders
    await expect(hero(page).getByTestId(PROFILE.heroStars)).toHaveCount(0);
    const icons = page.getByTestId(PROFILE.icons);
    await expect(icons.getByRole("heading", { name: PROFILE_TXT.iconsHeading.other.vi(OTHER.name), exact: true })).toBeVisible();
    await expect(icons.getByTestId(PROFILE.iconSlot)).toHaveCount(6);
    await expect(page.getByTestId(PROFILE.stats)).toHaveCount(0);
  });

  test("stars follow Kudos received: 13 received gives Super Hero and one star", async ({ page, request }) => {
    await openPage(page, request, profilePath(BUSY_PROFILE.id));
    await expect(heroName(page)).toHaveText(BUSY_PROFILE.full_name);
    // HeroBadge draws every tier except "New" as an artwork whose alt is the label, so the label is the image's name, not text.
    await expect(hero(page).getByTestId(PROFILE.heroBadge).getByRole("img", { name: "Super Hero" })).toBeVisible();
    await expect(hero(page).getByTestId(PROFILE.heroStars).locator("svg")).toHaveCount(1);
  });

  test("write bar opens Viết Kudo with this Sunner in the recipient box, and no suggestion list", async ({ page, request }) => {
    await openPage(page, request, profilePath(OTHER.id));
    await expect(writeBar(page, OTHER.name)).toBeVisible();
    await writeBar(page, OTHER.name).click();
    await expect(writeDialog(page)).toBeVisible();
    await expect(recipientBox(page)).toHaveValue(OTHER.name);
    await expect(recipientBox(page)).toBeEditable();
    await expect(writeDialog(page).getByRole("listbox")).toBeHidden();
  });

  test("KUDOS: a static received count, no direction dropdown, and 'Đã gửi' is nowhere on the page", async ({ page, request }) => {
    await openPage(page, request, profilePath(ANON_SENDER.id));
    await expect(heroName(page)).toHaveText(ANON_SENDER.name);
    await expect(section(page).getByText(PROFILE_TXT.receivedCount.vi(receivedIds(ANON_SENDER.key).length), { exact: true })).toBeVisible();
    await expect(direction(page)).toHaveCount(0);
    await expect(page.getByRole("option")).toHaveCount(0);
    expect(await innerText(page)).not.toContain(PROFILE_TXT.sentWord);
  });

  test("a received anonymous Kudo shows the alias, never the sender's name", async ({ page, request }) => {
    await openPage(page, request, profilePath(ANON_RECIPIENT.id));
    const anon = cards(page).first();
    await expect(anon.getByTestId("kudo-sender")).toHaveText(ANON_ALIAS);
    expect(await anon.getByTestId("kudo-sender").evaluate((el) => el.tagName)).toBe("SPAN");
    await expect(anon).not.toContainText(people.p05[0]);
  });

  test("infinite scroll: 10 cards, then all 13 in order with no duplicates, then the end line", async ({ page, request }) => {
    await openPage(page, request, profilePath(BUSY_PROFILE.id));
    const feed = cards(page);
    await expect(feed).toHaveCount(10);
    const scrollAndCount = async () => {
      await feed.last().scrollIntoViewIfNeeded();
      return feed.count();
    };
    await expect.poll(scrollAndCount, { timeout: 15_000 }).toBe(BUSY_PROFILE.kudoIds.length);
    await expect.poll(() => cardIds(feed)).toEqual(BUSY_PROFILE.kudoIds);
    await expect(section(page).getByText(PROFILE_TXT.feedEnd, { exact: true })).toBeVisible();
  });

  test("a Sunner with no avatar, department or Kudos renders without broken pieces", async ({ page, request }) => {
    await openPage(page, request, profilePath(SPARSE_PROFILE.id));
    await expect(heroName(page)).toHaveText(SPARSE_PROFILE.full_name);
    await expect(hero(page).getByTestId(PROFILE.avatar)).toBeVisible();
    await expect(hero(page).getByTestId(PROFILE.heroBadge)).toHaveCount(0);
    await expect(hero(page).getByTestId(PROFILE.heroStars)).toHaveCount(0);
    await expect(page.getByTestId(PROFILE.icons).getByTestId(PROFILE.iconSlot)).toHaveCount(6);
    await expect(section(page).getByText(PROFILE_TXT.receivedCount.vi(0), { exact: true })).toBeVisible();
    await expect(section(page).getByText(PROFILE_TXT.emptyReceived, { exact: true })).toBeVisible();
  });

  test("375x812: no horizontal scroll", async ({ page, request }) => {
    await openPage(page, request, profilePath(OTHER.id), { width: 375, height: 812 });
    await expect(hero(page)).toBeVisible();
    expect(await overflowX(page)).toBeLessThanOrEqual(0);
  });

  test("EN: title, possessive icons heading, write bar and static count; no 'Sent' anywhere in KUDOS", async ({ page, request }) => {
    await openPage(page, request, profilePath(OTHER.id), { locale: "en" });
    await expect(page).toHaveTitle(PROFILE_TXT.pageTitle.other(OTHER.name));
    await expect(page.getByTestId(PROFILE.icons).getByRole("heading", { name: PROFILE_TXT.iconsHeading.other.en(OTHER.name), exact: true })).toBeVisible();
    await expect(writeBar(page, OTHER.name, "en")).toBeVisible();
    await expect(section(page).getByText(PROFILE_TXT.receivedCount.en(receivedIds(OTHER.key).length), { exact: true })).toBeVisible();
    await expect(section(page)).not.toContainText(/Sent/);
  });
});
