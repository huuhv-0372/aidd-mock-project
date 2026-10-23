import { randomUUID } from "node:crypto";
import { expect, type APIRequestContext, type Locator, type Page } from "@playwright/test";
import { ADMIN_USERS_PATH } from "../../../lib/navigation/routes";
import { AUTHED, pathOf } from "./authed-session";
import { COLUMNS, TID, type ColumnKey, type Locale, PAGE_SIZE } from "./admin-users-contract";

// Shared by the admin-users specs. Each test signs in with its own sub, so parallel workers never share role state.
const FAKE = process.env.E2E_FAKE_SUPABASE_URL || "http://127.0.0.1:54398";
export { AUTHED, FAKE, pathOf, ADMIN_USERS_PATH };

/** A fresh non-v4 uuid-shaped sub per test (the fake keys every world by it). */
export function freshSub(): string {
  return `a9000000-0000-0000-0000-${randomUUID().split("-")[4]}`;
}

/** Mints a fake-Supabase session for a new sub; an admin sub is switched on first. Returns the sub. */
export async function signInAs(page: Page, request: APIRequestContext, role: "user" | "admin"): Promise<string> {
  const sub = freshSub();
  if (role === "admin") {
    expect((await request.get(`${FAKE}/__admin-mode?sub=${sub}&role=admin`)).ok()).toBe(true);
  }
  const res = await request.get(`${FAKE}/__mint?sub=${sub}`);
  expect(res.ok()).toBe(true);
  const minted = await res.json();
  expect(minted.value.length).toBeLessThan(3180); // one @supabase/ssr cookie chunk
  await page.context().addCookies([{ name: minted.name, value: minted.value, url: AUTHED }]);
  return sub;
}

export async function setLocale(page: Page, locale: Locale): Promise<void> {
  if (locale === "en") await page.context().addCookies([{ name: "NEXT_LOCALE", value: "en", url: AUTHED }]);
}

/** Signs in as an admin (default) and opens /admin/users with an optional query string (no leading "?"). */
export async function openUsers(
  page: Page,
  request: APIRequestContext,
  options: { query?: string; locale?: Locale; role?: "user" | "admin" } = {},
) {
  const sub = await signInAs(page, request, options.role ?? "admin");
  await setLocale(page, options.locale ?? "vi");
  const response = await page.goto(`${AUTHED}${ADMIN_USERS_PATH}${options.query ? `?${options.query}` : ""}`);
  return { sub, response };
}

export const rows = (page: Page) => page.getByTestId(TID.row);
export const rowOf = (page: Page, userId: string) => page.locator(`[data-testid="${TID.row}"][data-user-id="${userId}"]`);
export const cellIn = (row: Locator, col: ColumnKey) => row.getByTestId(TID.cell(col));
/** Every cell of one column across the visible rows, as innerText (dates keep their line break). */
export const columnTexts = (page: Page, col: ColumnKey) => page.getByTestId(TID.cell(col)).allInnerTexts();

/** Reads one column across pages 1..pages of the same query (the list is server-paged, 20 rows per page). */
export async function collectColumn(page: Page, query: string, col: ColumnKey, pages: number): Promise<string[]> {
  const out: string[] = [];
  for (let n = 1; n <= pages; n += 1) {
    await page.goto(`${AUTHED}${ADMIN_USERS_PATH}?${query ? `${query}&` : ""}page=${n}`);
    out.push(...(await columnTexts(page, col)).map((t) => t.trim()));
  }
  return out;
}

/** User ids across pages 1..pages of one query, in display order. */
export async function collectUserIds(page: Page, query: string, pages: number): Promise<string[]> {
  const out: string[] = [];
  for (let n = 1; n <= pages; n += 1) {
    await page.goto(`${AUTHED}${ADMIN_USERS_PATH}?${query ? `${query}&` : ""}page=${n}`);
    out.push(...(await rows(page).evaluateAll((els) => els.map((el) => el.getAttribute("data-user-id") ?? ""))));
  }
  return out;
}

/** Page count of the fixture for a given total (20 per page). */
export const pagesFor = (total: number) => Math.ceil(total / PAGE_SIZE);

/** Digits of a text, read as an integer ("(1 234)" and "45 người dùng" both work). */
export const digitsOf = (text: string) => Number(text.replace(/\D/g, ""));

/** "dd/MM/yyyy\nHH:mm" -> a sortable key "yyyyMMddHHmm"; "-" -> null. */
export function dateKey(text: string): string | null {
  const m = /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/.exec(text);
  return m ? `${m[3]}${m[2]}${m[1]}${m[4]}${m[5]}` : null;
}

/** The sort key the URL uses for a column (null when the column is not sortable). */
export const sortKeyOf = (col: ColumnKey) => COLUMNS.find((c) => c.key === col)?.sort ?? null;

/** Parses "rgb(r, g, b)" from computed style. */
export function rgbOf(color: string): [number, number, number] {
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(color);
  if (!m) throw new Error(`not an rgb colour: ${color}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}
export const isRed = ([r, g, b]: [number, number, number]) => r >= 150 && g <= 100 && b <= 100;
