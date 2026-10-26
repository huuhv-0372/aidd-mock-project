// Tìm kiếm profile Sunner on the Sun* Kudos Live board (MoMorph MaZUn5xHXZ, pill 2940:13450): type-ahead of up to 10 Sunners,
// a pick or Enter opens /profile/{id}. Selector + copy contract: support/kudos-contract.ts (PROFILE_SEARCH, profileSearch).
// Keyboard, Escape/Tab and the 375 / 1440 layout live in sun-kudos-profile-search-keyboard.spec.ts.
// Test cases: 1ce82447 + d3877e54 (display, placeholder), 9e689933 (100 accepted, 101 refused). Other cases are spec-driven
// (clarifications.md). Stale-answer cases: the answer lands after the box was cleared or blurred, so only the hook's guard hides it.
import { randomUUID } from "node:crypto";
import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { AUTHED, pathOf } from "./support/authed-session";
import {
  KUDOS_PATH, PROFILE_SEARCH, SEL, delaySearchRpc, failSearchRpc, kudoLog, openKudos, openProfileSearch, profileSearch, rpcCalls,
} from "./support/kudos-contract";
import { profilePath } from "./support/profile-contract";
import { sunnerIdByName } from "./support/write-kudo-fixtures.mjs";

const { box, submit, listbox, options, status } = profileSearch;
const AN_ID = String(sunnerIdByName("Nguyễn Văn An"));
const searches = async (request: APIRequestContext, sub: string) => rpcCalls(await kudoLog(request, sub), "kudos_search_sunners");
/** Lets the client apply an answer that just arrived, so "nothing happened" is judged after the app had its chance. */
const flushUi = (page: Page, ms = 150) => page.evaluate((wait) => new Promise<void>((done) => setTimeout(done, wait)), ms);

test.describe("Tìm kiếm profile Sunner: type-ahead", () => {
  test("1ce82447 / d3877e54: pill has a magnifier and a combobox with the VI placeholder; pill A.1 stays enabled", async ({ page, request }) => {
    await openProfileSearch(page, request, { sub: randomUUID() });
    await expect(box(page)).toHaveAttribute("placeholder", PROFILE_SEARCH.placeholder);
    await expect(submit(page)).toBeVisible();
    await expect(page.getByTestId(SEL.composeTrigger)).toBeEnabled();
  });

  test("Nguyễn Văn: named Sunners with department, no email, accent-free query, caller excluded, trimmed query sent", async ({ page, request }) => {
    const sub = randomUUID();
    await openProfileSearch(page, request, { sub });
    await box(page).fill(" Nguyễn Văn ");
    await expect(listbox(page).getByRole("option", { name: "Nguyễn Văn An" })).toBeVisible();
    await expect(listbox(page).getByRole("option", { name: "Nguyễn Văn An" })).toContainText("CEVC1");
    await expect(listbox(page).getByRole("option", { name: "Nguyễn Văn Bình" })).toBeVisible();
    for (const text of await options(page).allTextContents()) expect(text).not.toContain("@");
    expect(await searches(request, sub)).toContainEqual(expect.objectContaining({ p_query: "Nguyễn Văn", p_limit: 10, p_name_only: false }));

    await box(page).fill("nguyen van an");
    await expect(listbox(page).getByRole("option", { name: "Nguyễn Văn An" })).toBeVisible();

    await box(page).fill("E2E User"); // the signed-in caller is never suggested
    await expect(status(page)).toContainText(PROFILE_SEARCH.noResult);
    await expect(options(page)).toHaveCount(0);
  });

  test("Sunner Tester: exactly 10 suggestions out of 12 matches", async ({ page, request }) => {
    await openProfileSearch(page, request, { sub: randomUUID() });
    await box(page).fill("Sunner Tester");
    await expect(options(page)).toHaveCount(10);
  });

  test("click a suggestion: URL becomes /profile/{id} of that Sunner", async ({ page, request }) => {
    await openProfileSearch(page, request, { sub: randomUUID() });
    await box(page).fill("Nguyễn Văn");
    await listbox(page).getByRole("option", { name: "Nguyễn Văn An" }).click();
    await page.waitForURL((url) => url.pathname === profilePath(AN_ID));
  });

  test("zzzz: one status line 'Không tìm thấy Sunner nào.', no options, Enter does not navigate", async ({ page, request }) => {
    await openProfileSearch(page, request, { sub: randomUUID() });
    await box(page).fill("zzzz");
    await expect(status(page)).toContainText(PROFILE_SEARCH.noResult);
    await expect(options(page)).toHaveCount(0);
    await page.keyboard.press("Enter");
    await box(page).fill("Nguyễn Văn An"); // positive sentinel: a real answer shows, so the Enter above did not navigate away
    await expect(options(page).first()).toContainText("Nguyễn Văn An");
    expect(pathOf(page)).toBe(KUDOS_PATH);
  });

  test("9e689933: maxlength 100 stops the 101st character; a 100-character query is searched without an error", async ({ page, request }) => {
    const sub = randomUUID();
    await openProfileSearch(page, request, { sub });
    await expect(box(page)).toHaveAttribute("maxlength", "100");
    await box(page).pressSequentially("a".repeat(101)); // fill() ignores maxlength; typing respects it
    await expect(box(page)).toHaveValue("a".repeat(100));
    await expect(status(page)).toContainText(PROFILE_SEARCH.noResult);
    await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toHaveCount(0); // skips the empty Next.js route announcer
    const queries = (await searches(request, sub)).map((c) => String(c.p_query));
    expect(queries).toContain("a".repeat(100));
    expect(queries.every((q) => q.length <= 100)).toBe(true);
  });

  test("blank or spaces: Enter and the magnifier do nothing; no empty query is sent", async ({ page, request }) => {
    const sub = randomUUID();
    await openProfileSearch(page, request, { sub });
    await box(page).fill("Nguyễn Văn An"); // a real answer first, so the session is proven to search
    await expect(options(page).first()).toContainText("Nguyễn Văn An");
    const actionPosts: string[] = []; // bodies of every server-action POST from here on (the Sunner search is one)
    const onRequest = (req: { method(): string; headers(): Record<string, string>; postData(): string | null }) => {
      if (req.method() === "POST" && req.headers()["next-action"]) actionPosts.push(req.postData() ?? "");
    };
    page.on("request", onRequest);
    await box(page).fill("   ");
    await page.keyboard.press("Enter");
    await submit(page).click();
    await flushUi(page, 400); // past the 150 ms debounce, so a blank request that was going to leave has left
    expect(actionPosts, "blank input must send no server action at all").toEqual([]);
    expect(pathOf(page)).toBe(KUDOS_PATH);
    await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toHaveCount(0); // skips the empty Next.js route announcer
    await expect(listbox(page)).toHaveCount(0);
    // Positive sentinel: a real query whose answer is visible; the listener must see it, or the zero count above proves nothing.
    await box(page).fill("Sunner Tester");
    await expect(options(page)).toHaveCount(10);
    page.off("request", onRequest);
    expect(actionPosts.some((body) => body.includes("Sunner Tester")), "the listener sees a real search").toBe(true);
    const queries = (await searches(request, sub)).map((c) => String(c.p_query));
    expect(queries.every((q) => q.trim().length > 0)).toBe(true);
  });

  // An answer that arrives after the box was cleared, or after focus left it, has no newer answer behind it: only the `latest`
  // check in use-profile-search.ts keeps its rows off the page. A hook without that check would open the listbox here.
  for (const [label, leave] of [
    ["the box was cleared", (page: Page) => box(page).fill("")],
    ["focus left the box (Tab)", (page: Page) => page.keyboard.press("Tab")],
  ] as const) {
    test(`a slow answer after ${label} is dropped: no listbox, no status line; the box still works`, async ({ page, request }) => {
      const sub = randomUUID();
      await openProfileSearch(page, request, { sub });
      await delaySearchRpc(request, sub, 2000); // the fake logs the call on arrival, then holds the answer 2 s
      const answered = page.waitForResponse((r) => r.request().method() === "POST" && (r.request().postData() ?? "").includes("Sunner Tester"));
      await box(page).fill("Sunner Tester");
      await expect.poll(async () => (await searches(request, sub)).some((c) => c.p_query === "Sunner Tester")).toBe(true); // in flight
      await leave(page);
      await answered; // the held answer has reached the page (headers in; Response.finished() hung in 3 of 10 repeats, so it is not used)
      await flushUi(page, 500); // then time for the body to be read and React to commit: a late render would be on screen by now
      await expect(listbox(page)).toHaveCount(0);
      await expect(status(page)).toBeEmpty();
      await delaySearchRpc(request, sub, 0);
      await box(page).fill("Nguyễn Văn An"); // positive: a fresh query still answers after the drop
      await expect(options(page).first()).toContainText("Nguyễn Văn An");
    });
  }

  test("a slow answer for an old query never replaces the newer one", async ({ page, request }) => {
    const sub = randomUUID();
    await openProfileSearch(page, request, { sub });
    await delaySearchRpc(request, sub, 800);
    await box(page).fill("Sunner Tester");
    await expect.poll(async () => (await searches(request, sub)).some((c) => c.p_query === "Sunner Tester")).toBe(true);
    await delaySearchRpc(request, sub, 0);
    await box(page).fill("Nguyễn Văn An");
    await expect(options(page).first()).toContainText("Nguyễn Văn An");
    await page.waitForTimeout(800 + 300); // the one fixed wait: the held "Sunner Tester" answer lands within 800 ms of its arrival
    await expect(options(page).first()).toContainText("Nguyễn Văn An");
    await expect(listbox(page).getByRole("option", { name: /Sunner Tester/ })).toHaveCount(0);
  });

  test("server error: generic line, the internal detail never reaches the page, and the box works again", async ({ page, request }) => {
    const sub = randomUUID();
    await openProfileSearch(page, request, { sub });
    await failSearchRpc(request, sub, true);
    await box(page).fill("Nguyễn Văn An");
    await expect(status(page)).toContainText(PROFILE_SEARCH.error);
    expect(await page.content()).not.toContain("boom-secret-detail");
    await failSearchRpc(request, sub, false);
    await box(page).fill("Nguyễn Văn Bình");
    await expect(options(page).first()).toContainText("Nguyễn Văn Bình");
  });

  test("EN: placeholder and the no-result line follow the NEXT_LOCALE cookie", async ({ page, request }) => {
    await page.context().addCookies([{ name: "NEXT_LOCALE", value: "en", url: AUTHED }]);
    await openKudos(page, request, { sub: randomUUID() });
    const en = page.getByRole("combobox", { name: PROFILE_SEARCH.placeholderEn });
    await expect(en, "EN: the search combobox must be named 'Search for Sunner profile'").toBeVisible();
    await en.fill("zzzz");
    await expect(status(page)).toContainText(PROFILE_SEARCH.noResultEn);
  });
});
