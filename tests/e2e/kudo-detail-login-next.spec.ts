// View Kudo: the post-login `next` target (review 261021 T4). Only `/sun-kudos/<guid>` may carry a user back; every other
// shape ends on "/", on the same origin. The Google round trip is stubbed: the authorize request is answered by the test
// (no network) and the fake Supabase answers the PKCE code exchange (POST /auth/v1/token), so the real sign-in action,
// the real cookie and the real /auth/callback run. Allow-list rules themselves: tests/unit (post-login-next).
import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { POST_LOGIN_NEXT_COOKIE } from "@/lib/auth/post-login-next";
import { AUTHED } from "./support/authed-session";
import { DETAIL, detailPath } from "./support/kudo-detail-contract";
import { frame } from "./support/kudo-detail-helpers";
import { signInAs } from "./support/kudos-contract";
import { DETAIL_KUDO } from "./support/kudos-fixtures.mjs";

const TARGET = detailPath(DETAIL_KUDO.id);
const loginUrl = (next: string) => `${AUTHED}/login?next=${encodeURIComponent(next)}`;

const REJECTED = [
  "//evil.example",
  "/\\evil.example", // a real backslash
  "%2F%2Fevil.example",
  "https://evil.example",
  `${TARGET}/../../x`,
  `${TARGET}?x=1`,
];

test.describe("View Kudo: signed in on /login?next=", () => {
  test("a Kudo path lands on that Kudo (id case is normalised)", async ({ page, request }) => {
    await signInAs(page, request, randomUUID());
    await page.goto(loginUrl(TARGET));
    expect(new URL(page.url()).pathname).toBe(TARGET);
    await expect(frame(page)).toBeVisible();

    await page.goto(loginUrl(detailPath(DETAIL_KUDO.id.toUpperCase())));
    expect(new URL(page.url()).pathname).toBe(TARGET);
  });

  test("every other shape ends on / of the same origin", async ({ page, request }) => {
    await signInAs(page, request, randomUUID());
    for (const next of REJECTED) {
      await page.goto(loginUrl(next));
      const url = new URL(page.url());
      expect(url.origin, `origin after next=${next}`).toBe(AUTHED);
      expect(`${url.pathname}${url.search}`, `target after next=${next}`).toBe("/");
    }
  });
});

/** Guest on the login page (with `next`, if given), then the sign-in button; the authorize request is caught, not sent. */
async function submitGuestLogin(page: Page, next: string | null): Promise<URL[]> {
  const authorize: URL[] = [];
  await page.route("**/auth/v1/authorize**", (route) => {
    authorize.push(new URL(route.request().url()));
    return route.fulfill({ status: 200, contentType: "text/html", body: "<p>stubbed authorize</p>" });
  });
  await page.goto(next === null ? `${AUTHED}/login` : loginUrl(next));
  if (next !== null) await expect(page.locator('form input[type="hidden"][name="next"]')).toHaveValue(next);
  await page.getByRole("button", { name: DETAIL.loginButton }).click();
  await expect.poll(() => authorize.length, { message: "the sign-in action redirected to authorize" }).toBe(1);
  await page.waitForURL("**/auth/v1/authorize**"); // the stubbed navigation has landed, so a later goto cannot cut it short
  return authorize;
}

const nextCookie = async (page: Page) => (await page.context().cookies(AUTHED)).find((c) => c.name === POST_LOGIN_NEXT_COOKIE);

test.describe("View Kudo: guest sign-in carries the target in a cookie", () => {
  test("authorize gets a constant redirect_to; the cookie holds the path, httpOnly, Lax", async ({ page }) => {
    const [authorize] = await submitGuestLogin(page, TARGET);
    expect(authorize.searchParams.get("redirect_to"), "redirect_to has no next").toBe(`${AUTHED}/auth/callback`);
    expect(authorize.searchParams.has("next")).toBe(false);
    expect(authorize.searchParams.get("provider")).toBe("google");
    const cookie = await nextCookie(page);
    expect(cookie, "post-login cookie is set").toBeDefined();
    expect(decodeURIComponent(cookie!.value)).toBe(TARGET);
    expect(cookie!.httpOnly).toBe(true);
    expect(cookie!.sameSite).toBe("Lax");
  });

  test("callback with the cookie: signed in on the Kudo and the cookie no longer holds it", async ({ page }) => {
    await submitGuestLogin(page, TARGET);
    await page.goto(`${AUTHED}/auth/callback?code=stub-code`);
    expect(new URL(page.url()).pathname).toBe(TARGET);
    await expect(frame(page)).toBeVisible(); // the session set by the exchange is accepted by the page
    expect(await nextCookie(page), "the one-shot cookie is deleted").toBeUndefined();
  });

  test("callback with a tampered cookie: ends on / of the same origin", async ({ page }) => {
    await submitGuestLogin(page, TARGET);
    await page.context().addCookies([
      { name: POST_LOGIN_NEXT_COOKIE, value: encodeURIComponent("//evil.example"), url: AUTHED, httpOnly: true, sameSite: "Lax" },
    ]);
    await page.goto(`${AUTHED}/auth/callback?code=stub-code`);
    const url = new URL(page.url());
    expect(url.origin).toBe(AUTHED);
    expect(`${url.pathname}${url.search}`).toBe("/");
    expect(await nextCookie(page), "the one-shot cookie is deleted").toBeUndefined();
  });

  test("signing in without a next deletes a stale post-login cookie", async ({ page }) => {
    await page.context().addCookies([
      { name: POST_LOGIN_NEXT_COOKIE, value: encodeURIComponent(TARGET), url: AUTHED, httpOnly: true, sameSite: "Lax" },
    ]);
    await submitGuestLogin(page, null);
    expect(await nextCookie(page), "the sign-in action deleted the stale cookie").toBeUndefined();
  });
});
