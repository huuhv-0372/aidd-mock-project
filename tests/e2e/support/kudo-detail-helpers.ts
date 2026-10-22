import { randomUUID } from "node:crypto";
import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { AUTHED } from "./authed-session";
import { DETAIL } from "./kudo-detail-contract";
import { KUDOS_FAKE, signInAs } from "./kudos-contract";

// Shared by the kudo-detail*.spec.ts files: open the page signed in, the frame and the Đóng button.

export type DetailMode = "leak-sender" | "own-anon";

/** Sets how the fake's kudo_detail misbehaves for this sub (kudo-detail-fake.mjs); omit the mode for the faithful RPC. */
export const setDetailMode = (request: APIRequestContext, sub: string, mode: DetailMode | "off") =>
  request.get(`${KUDOS_FAKE}/__kudo-detail-mode?sub=${sub}&mode=${mode}`);

/** Signs in as a fresh user (or `opts.sub`), optionally sets EN and a fake mode, then navigates on AUTHED. */
export async function openDetail(
  page: Page,
  request: APIRequestContext,
  path: string,
  opts: { width?: number; height?: number; locale?: "en"; sub?: string; mode?: DetailMode } = {},
): Promise<{ status: number | undefined; sub: string }> {
  const sub = opts.sub ?? randomUUID();
  await page.setViewportSize({ width: opts.width ?? 1440, height: opts.height ?? 900 });
  await signInAs(page, request, sub);
  if (opts.mode) expect((await setDetailMode(request, sub, opts.mode)).ok()).toBe(true);
  if (opts.locale) await page.context().addCookies([{ name: "NEXT_LOCALE", value: opts.locale, url: AUTHED }]);
  const res = await page.goto(`${AUTHED}${path}`);
  return { status: res?.status(), sub };
}

export const frame = (page: Page) => page.getByTestId(DETAIL.frame);
export const closeButton = (page: Page, locale: "vi" | "en" = "vi") =>
  page.getByRole("button", { name: DETAIL.close[locale], exact: true });

const atUrl = (page: Page, url: string | RegExp) =>
  expect(page).toHaveURL(url, { timeout: 100 }).then(
    () => true,
    () => false,
  );

/**
 * Clicks Đóng until the page ends up at `url`: a click before the button hydrates does nothing, so it is retried.
 * A click that did navigate, only slowly, must not be retried against a button that is already gone: each attempt first
 * checks the URL, and clicks only while the button is there.
 */
export async function clickCloseUntil(page: Page, url: string | RegExp): Promise<void> {
  await expect(async () => {
    if (await atUrl(page, url)) return;
    const close = closeButton(page);
    if (await close.isVisible()) await close.click({ timeout: 2_000 });
    await expect(page).toHaveURL(url, { timeout: 2_000 });
  }).toPass({ timeout: 15_000 });
}
