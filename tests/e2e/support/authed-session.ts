import { expect, type APIRequestContext, type Page } from "@playwright/test";

// Authed server (launched event, fake Supabase) and past server (anonymous -> /login). URLs come from playwright.config.ts.
export const AUTHED = process.env.E2E_AUTHED_URL || "http://localhost:3103";
export const PAST = process.env.E2E_PAST_URL || "http://localhost:3101";
const FAKE = process.env.E2E_FAKE_SUPABASE_URL || "http://127.0.0.1:54398";

export const pathOf = (page: Page) => new URL(page.url()).pathname;

/** Mints a fake-Supabase session and sets it as the authed server's cookie (same flow as homepage specs). */
export async function signIn(page: Page, request: APIRequestContext): Promise<void> {
  const res = await request.get(`${FAKE}/__mint`);
  expect(res.ok()).toBe(true);
  const minted = await res.json();
  expect(minted.value.length).toBeLessThan(3180); // one @supabase/ssr cookie chunk
  await page.context().addCookies([{ name: minted.name, value: minted.value, url: AUTHED }]);
}
