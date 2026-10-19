import { expect, type APIRequestContext, type Page } from "@playwright/test";

// Sun* Kudos Live board (MoMorph MaZUn5xHXZ, route /sun-kudos). Selector + expectation contract shared by
// sun-kudos.spec.ts and sun-kudos-feed.spec.ts and by phases 02-07 (they must match these exactly).
// Fixture data: kudos-fixtures.mjs (mirrors supabase/migrations/20261015100000_create_kudos.sql).

export const KUDOS_PATH = "/sun-kudos";
export const KUDOS_FAKE = process.env.E2E_FAKE_SUPABASE_URL || "http://127.0.0.1:54398";

export const SEL = {
  headerLink: "Sun* Kudos", // header link, aria-current="page" on this route
  kv: "kudos-kv", // text: "Hệ thống ghi nhận và cảm ơn"
  composeTrigger: "kudos-compose-trigger", // aria-disabled="true", placeholder below
  highlight: "highlight-kudos", // heading "HIGHLIGHT KUDOS"
  highlightSlide: "highlight-slide", // middle slide carries aria-current="true"
  highlightPage: "highlight-page", // text "n/m"
  spotlight: "spotlight-board",
  spotlightTotal: "spotlight-total", // text "{total} KUDOS"
  spotlightNode: "spotlight-node", // link href /sun-kudos/{last_kudo_id}; data-match="true" on search hits
  allKudos: "all-kudos", // heading "ALL KUDOS"
  kudoCard: "kudo-card", // data-kudo-id; children below
  stats: "kudos-stats", // sidebar: five label + value rows
  gifts: "gift-recipients", // heading "10 SUNNER NHẬN QUÀ MỚI NHẤT"
  giftItem: "gift-recipient",
} as const;

export const TXT = {
  kv: "Hệ thống ghi nhận và cảm ơn",
  composePlaceholder: "Hôm nay, bạn muốn gửi lời cảm ơn và ghi nhận đến ai?",
  highlightHeading: "HIGHLIGHT KUDOS",
  allKudosHeading: "ALL KUDOS",
  emptyFeed: "Hiện tại chưa có Kudos nào.",
  emptyGifts: "Chưa có dữ liệu",
  giftsHeading: "10 SUNNER NHẬN QUÀ MỚI NHẤT",
  toast: "Link copied — ready to share!",
  copyLink: "Copy Link",
  viewDetails: "Xem chi tiết",
  statLabels: [
    "Số Kudos bạn nhận được:",
    "Số Kudos bạn đã gửi:",
    "Số tim bạn nhận được:",
    "Số Secret Box bạn đã mở:",
    "Số Secret Box chưa mở:",
  ],
} as const;

/** Mirrors the rendered "HH:mm - MM/DD/YYYY" label, always Vietnam time (UTC+7) regardless of the runner TZ. */
export function formatKudoTime(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 7 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())} - ${p(d.getUTCMonth() + 1)}/${p(d.getUTCDate())}/${d.getUTCFullYear()}`;
}

/** Signs in on the authed server as a chosen JWT sub (default: a random user). Same cookie flow as authed-session.ts. */
export async function signInAs(page: Page, request: APIRequestContext, sub?: string): Promise<void> {
  const url = `${KUDOS_FAKE}/__mint${sub ? `?sub=${encodeURIComponent(sub)}` : ""}`;
  const res = await request.get(url);
  expect(res.ok()).toBe(true);
  const minted = await res.json();
  const authed = process.env.E2E_AUTHED_URL || "http://localhost:3103";
  await page.context().addCookies([{ name: minted.name, value: minted.value, url: authed }]);
}

/** Opens /sun-kudos signed in at a viewport; the content assertions belong to the spec, not this helper. */
export async function openKudos(page: Page, request: APIRequestContext, opts: { width?: number; sub?: string } = {}) {
  await page.setViewportSize({ width: opts.width ?? 1440, height: 900 });
  await signInAs(page, request, opts.sub);
  const authed = process.env.E2E_AUTHED_URL || "http://localhost:3103";
  await page.goto(`${authed}${KUDOS_PATH}`);
}
