// View Kudo hardening (review 261021 T1, T2, T3, T5): untrusted content never becomes markup or a live link, uuid ids
// behave like Postgres, the Đóng button keeps the board's filter, an anonymous Kudo never shows its sender.
// Fixtures: support/kudos-fixtures.mjs (XSS_KUDO, KUDOS[4] anonymous) + support/kudo-detail-fake.mjs (leak / own-anon modes).
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { AUTHED } from "./support/authed-session";
import { DETAIL, detailPath } from "./support/kudo-detail-contract";
import { clickCloseUntil, frame, openDetail } from "./support/kudo-detail-helpers";
import { KUDOS_PATH, SEL, signInAs } from "./support/kudos-contract";
import {
  DETAIL_KUDO, KUDOS, PEOPLE, XSS_KUDO, XSS_LINE_LABELS, XSS_RAW_IMG, XSS_RAW_SCRIPT, personIdFor,
} from "./support/kudos-fixtures.mjs";

const ANON = KUDOS[4]; // anonymous, sent by p05 to p06 (kudo_detail serves every feed Kudo)
const ANON_ALIAS = String(ANON.anonymous_name);
const ANON_SENDER_KEY = String(ANON.sender_key);
const REAL_SENDER_NAME = (PEOPLE as Record<string, string[]>)[ANON_SENDER_KEY][0];
const REAL_SENDER_ID = personIdFor(ANON_SENDER_KEY);
const OWN_ID = String(KUDOS[0].id); // sent by the viewer
const FILTER = "dedicated"; // a real hashtag slug; KUDOS[3] carries it and is on the first feed page
const FILTERED_BOARD = `${KUDOS_PATH}?hashtag=${FILTER}`;
const FILTERED_CARD_ID = String(KUDOS[3].id);

test.describe("View Kudo: untrusted content (T1)", () => {
  test("javascript / data / vbscript links and raw HTML stay inert text", async ({ page, request }) => {
    await openDetail(page, request, detailPath(XSS_KUDO.id));
    const f = frame(page);
    await expect(f).toBeVisible();
    for (const label of Object.values(XSS_LINE_LABELS)) {
      await expect(f.getByTestId("kudo-content"), `label stays as plain text: ${label}`).toContainText(label);
    }
    for (const label of ["a", "b", "c", "d"]) {
      await expect(f.getByRole("link", { name: label, exact: true }), `no anchor labelled ${label}`).toHaveCount(0);
    }
    await expect(page.getByRole("main")).toHaveCount(1); // guard: an absent <main> must not pass the checks below
    const schemes = await page.getByRole("main").locator("a[href]").evaluateAll((anchors) => anchors.map((a) => new URL((a as HTMLAnchorElement).href).protocol));
    expect(schemes.filter((s) => s !== "http:" && s !== "https:"), "no link inside main leaves http(s)").toEqual([]);
    await expect(f.getByTestId("kudo-content"), "raw HTML is shown as literal text").toContainText(XSS_RAW_IMG);
    await expect(f.getByTestId("kudo-content")).toContainText(XSS_RAW_SCRIPT);
    await expect(f.locator("img[src='x'], script"), "raw HTML made no element").toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { __xss?: unknown }).__xss), "no injected handler ran").toBeUndefined();
  });
});

test.describe("View Kudo: uuid ids (T2)", () => {
  test("an upper-case id of an existing Kudo opens it (Postgres uuids ignore case)", async ({ page, request }) => {
    const { status } = await openDetail(page, request, detailPath(DETAIL_KUDO.id.toUpperCase()));
    expect(status).toBe(200);
    await expect(frame(page)).toBeVisible();
    await expect(frame(page)).toHaveAttribute("data-kudo-id", DETAIL_KUDO.id);
    await expect(frame(page).getByText(DETAIL_KUDO.title, { exact: true })).toBeVisible();
  });

  test("a malformed id is the 404 page, whatever the database would say", async ({ page, request }) => {
    const { status } = await openDetail(page, request, detailPath("not-a-uuid"));
    expect(status).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: DETAIL.notFoundHeading })).toBeVisible();
  });
});

test.describe("View Kudo: Đóng keeps where the viewer came from (T3)", () => {
  test("from a filtered board: Đóng returns to the same filtered board", async ({ page, request }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await signInAs(page, request, randomUUID());
    await page.goto(`${AUTHED}${FILTERED_BOARD}`);
    const card = page.getByTestId(SEL.allKudos).locator(`[data-testid="${SEL.kudoCard}"][data-kudo-id="${FILTERED_CARD_ID}"]`);
    await card.locator(`a[href="${detailPath(FILTERED_CARD_ID)}"]`).click();
    await expect(page).toHaveURL(`${AUTHED}${detailPath(FILTERED_CARD_ID)}`);
    await clickCloseUntil(page, `${AUTHED}${FILTERED_BOARD}`); // a push to /sun-kudos would lose the filter
    await expect(card, "the filtered Kudo is on the board again").toBeVisible();
  });

  test("previous page on another origin: Đóng goes to /sun-kudos", async ({ page, request }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await signInAs(page, request, randomUUID());
    await page.goto("data:text/html,<title>elsewhere</title><p>elsewhere</p>");
    await page.goto(`${AUTHED}${detailPath(FILTERED_CARD_ID)}`);
    await clickCloseUntil(page, `${AUTHED}${KUDOS_PATH}`);
  });
});

test.describe("View Kudo: anonymous sender (T5)", () => {
  test("an anonymous Kudo shows the alias and the real sender is nowhere in the page", async ({ page, request }) => {
    await openDetail(page, request, detailPath(ANON.id));
    await expect(frame(page).getByTestId("kudo-sender")).toHaveText(ANON_ALIAS);
    const html = await page.content();
    expect(html, "sender name").not.toContain(REAL_SENDER_NAME);
    expect(html, "sender id").not.toContain(REAL_SENDER_ID);
  });

  test("even when the RPC leaks a populated sender, the page still hides it", async ({ page, request }) => {
    await openDetail(page, request, detailPath(ANON.id), { mode: "leak-sender" });
    await expect(frame(page).getByTestId("kudo-sender")).toHaveText(ANON_ALIAS);
    await expect(frame(page).locator(`a[href*="${REAL_SENDER_ID}"]`)).toHaveCount(0);
    await expect(frame(page)).not.toContainText(REAL_SENDER_NAME);
  });

  test("own anonymous Kudo: alias shown and the heart is disabled", async ({ page, request }) => {
    await openDetail(page, request, detailPath(OWN_ID), { mode: "own-anon" });
    await expect(frame(page).getByTestId("kudo-sender")).toHaveText(ANON_ALIAS);
    const heart = frame(page).getByTestId("kudo-hearts");
    await expect(heart).toBeDisabled();
    await expect(heart).toHaveAttribute("data-own", "true");
  });
});
