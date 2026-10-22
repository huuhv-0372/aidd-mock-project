import { randomUUID } from "node:crypto";
import { expect, type APIRequestContext, type Page } from "@playwright/test";

// Sun* Kudos Live board (MoMorph MaZUn5xHXZ, route /sun-kudos). Selector + expectation contract shared by
// sun-kudos.spec.ts and sun-kudos-feed.spec.ts and by phases 02-07 (they must match these exactly).
// Fixture data: kudos-fixtures.mjs (mirrors supabase/migrations/20261015100000_create_kudos.sql).

export const KUDOS_PATH = "/sun-kudos";
export const KUDOS_FAKE = process.env.E2E_FAKE_SUPABASE_URL || "http://127.0.0.1:54398";

export const SEL = {
  headerLink: "Sun* Kudos", // header link, aria-current="page" on this route
  kv: "kudos-kv", // text: "Hệ thống ghi nhận và cảm ơn"
  composeTrigger: "kudos-compose-trigger", // pill A.1: opens the Viết Kudo modal (#12; no longer aria-disabled), placeholder below
  highlight: "highlight-kudos", // heading "HIGHLIGHT KUDOS"
  highlightSlide: "highlight-slide", // middle slide carries aria-current="true"
  highlightPage: "highlight-page", // text "n/m"
  spotlight: "spotlight-board",
  spotlightTotal: "spotlight-total", // text "{total} KUDOS"
  spotlightNode: "spotlight-node", // link href /sun-kudos/{last_kudo_id}; data-match="true" on search hits
  allKudos: "all-kudos", // heading "ALL KUDOS"
  kudoCard: "kudo-card", // data-kudo-id; children below
  kudoEditIcon: "kudo-edit-icon", // pencil beside the title: only on a Kudo the viewer sent (owner decision 2026-10-22)
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

// Like Kudos (#13): the heart RPC (sets the state, not a toggle) and the rollback toast (VI, not from Figma). Helpers: kudo-hearts-contract.ts.
export const KUDO_HEART = { rpc: "set_kudo_heart", errorToast: "Không thả tim được, hãy thử lại." } as const;

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

// ---------------------------------------------------------------------------------------------------------------
// Viết Kudos (#12): Widget menu (Sv7DFwBw1h), Thể lệ panel (b1Filzi9i6), Viết Kudo modal (ihQ26W78P2), Add link (OyDLDuSGEa).
// Selector contract for write-kudo.spec.ts + kudos-quick-actions.spec.ts. Phases 04-06 implement against it:
//  - every dialog is a native <dialog> (role "dialog"); recipient listbox, mention list and hashtag dropdown render INSIDE it.
//  - roles + accessible names first; data-testid only where listed here. Test ids are literal, names are Vietnamese (default locale).
// Full table: plans/261019-1022-write-kudos/reports/e2e-red-evidence.md ("Selector contract").
// ---------------------------------------------------------------------------------------------------------------
export const COMPOSE_PATHS = ["/", "/awards-information", KUDOS_PATH] as const;
export const WIDGET = { button: "widget-button", menu: "widget-menu", close: "widget-close" } as const;
export const RULES = { title: "Thể lệ", scroll: "rules-scroll", badge: "rules-badge" } as const;
// VI per Figma OyDLDuSGEa (the EN dictionary keeps "Add link" / "Text" / "Link").
export const ADD_LINK = { title: "Thêm đường dẫn", text: "Nội dung", url: "URL" } as const;
export const WRITE = {
  title: "Gửi lời cám ơn và ghi nhận đến đồng đội", // dialog name (aria-labelledby the <h2>)
  editor: "kudo-editor", // the contenteditable (role textbox); empty <p data-placeholder="..."> carries the placeholder
  mentionList: "mention-list", // options are role "option"; a chosen mention renders [data-type="mention"][data-id]
  hashtagDropdown: "hashtag-dropdown", // role "option" per tag; stays open on pick; unselected rows aria-disabled at 5
  hashtagChip: "hashtag-chip", // text "#name" + a button named /Xóa/
  imageInput: "kudo-image-input", // <input type=file multiple>, always in the DOM while the dialog is open
  imageThumb: "image-thumb", // + a button named /Xóa ảnh/
  mention: '[data-type="mention"]',
  // Người nhận suggestion row (issue #17): avatar (40px, placeholder when null), name, department line only when set.
  recipientAvatar: "recipient-option-avatar",
  recipientName: "recipient-option-name",
  recipientDepartment: "recipient-option-department",
  placeholder: { recipient: "Tìm kiếm", editor: "Hãy gửi gắm lời cám ơn và ghi nhận đến đồng đội tại đây nhé!" },
} as const;
export const TOOLBAR = {
  bold: "In đậm", italic: "In nghiêng", strike: "Gạch ngang", list: "Danh sách đánh số", link: "Chèn liên kết", quote: "Trích dẫn",
} as const; // buttons with aria-pressed
export const REQUIRED_MSG = "Không được để trống";
/** Field error line: data-testid="error-{field}", field = recipient|title|content|hashtags|images|form (modal) · text|link (Add link). */
export const errorId = (field: string) => `error-${field}`;

export const writeDialog = (page: Page) => page.getByRole("dialog", { name: WRITE.title });
export const rulesDialog = (page: Page) => page.getByRole("dialog", { name: RULES.title, exact: true });
export const addLinkDialog = (page: Page) => page.getByRole("dialog", { name: ADD_LINK.title, exact: true });
export const widgetMenu = (page: Page) => page.getByTestId(WIDGET.menu);
/**
 * Opens the widget menu. The Homepage streams the widget behind a Suspense fallback pill with the same test id: for a moment
 * two widget-button elements exist (fallback + hidden resolved segment) and a click before hydration opens nothing,
 * so retry until the real widget is the only one and the click opens the menu.
 */
export const openWidgetMenu = async (page: Page) => {
  await expect(async () => {
    await expect(page.getByTestId(WIDGET.button)).toHaveCount(1, { timeout: 1_000 });
    await page.getByTestId(WIDGET.button).click({ timeout: 2_000 });
    await expect(widgetMenu(page)).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 15_000 });
};
export const recipientBox = (page: Page) => writeDialog(page).getByRole("combobox", { name: /Người nhận/ });
export const sendButton = (page: Page) => writeDialog(page).getByRole("button", { name: "Gửi", exact: true });
export const dialogHeading = (page: Page) => writeDialog(page).getByRole("heading", { name: WRITE.title });

/** Signs in as a fresh user (own JWT sub, so fake-side state is isolated per test) and opens a page. Returns the sub. */
export async function openAuthed(
  page: Page, request: APIRequestContext, path: string, opts: { width?: number; height?: number } = {},
): Promise<string> {
  const sub = randomUUID();
  await page.setViewportSize({ width: opts.width ?? 1440, height: opts.height ?? 900 });
  await signInAs(page, request, sub);
  await page.goto(`${process.env.E2E_AUTHED_URL || "http://localhost:3103"}${path}`);
  return sub;
}

/** /sun-kudos signed in, modal opened through pill A.1 (the entry that needs no widget). */
export async function openWriteModal(page: Page, request: APIRequestContext): Promise<string> {
  const sub = await openAuthed(page, request, KUDOS_PATH);
  const pill = page.getByTestId(SEL.composeTrigger);
  await expect(pill, "pill A.1 must be an enabled control (today aria-disabled, display-only)").toBeEnabled();
  await pill.click();
  await expect(writeDialog(page), "pill A.1 must open the Viết Kudo modal").toBeVisible();
  return sub;
}

export type KudoForm = { search?: string; recipient?: string | null; title?: string | null; text?: string | null; tags?: string[] };
export const VALID_KUDO = {
  search: "Nguyen Van An", recipient: "Nguyễn Văn An", title: "NGƯỜI TRUYỀN CẢM HỨNG", text: "Cảm ơn bạn đã hỗ trợ team", tags: ["Cống hiến"],
} satisfies KudoForm;

export async function pickHashtags(page: Page, names: string[]) {
  const dialog = writeDialog(page);
  const dropdown = dialog.getByTestId(WRITE.hashtagDropdown);
  for (const name of names) {
    if (!(await dropdown.isVisible())) await dialog.getByRole("button", { name: "+ Hashtag" }).click();
    await dropdown.getByRole("option", { name }).click();
  }
  if (await dropdown.isVisible()) await dialogHeading(page).click(); // outside click closes it
  await expect(dropdown).toBeHidden();
}

/** Fills the required fields; pass null for recipient/title/text (or tags: []) to leave that one empty. */
export async function fillKudo(page: Page, form: KudoForm = {}) {
  const f = { ...VALID_KUDO, ...form };
  const dialog = writeDialog(page);
  if (f.recipient !== null) {
    await recipientBox(page).fill(f.search);
    await dialog.getByRole("option", { name: f.recipient }).click();
  }
  if (f.title !== null) await dialog.getByRole("textbox", { name: /Danh hiệu/ }).fill(f.title);
  if (f.text !== null) {
    await dialog.getByTestId(WRITE.editor).click();
    await dialog.getByTestId(WRITE.editor).pressSequentially(f.text);
  }
  if (f.tags.length) await pickHashtags(page, f.tags);
}

// ---- fake Supabase test controls (write-kudo-fixtures.mjs): what the app really sent, keyed by the caller's sub ----
export type KudoLog = {
  rpc: { name: string; body: Record<string, unknown> }[];
  uploads: { path: string; size: number; mime: string; magic: string }[];
  deletes: string[];
  objects: string[];
};
export async function kudoLog(request: APIRequestContext, sub: string): Promise<KudoLog> {
  return (await request.get(`${KUDOS_FAKE}/__kudo-log?sub=${sub}`)).json();
}
export const rpcCalls = (log: KudoLog, name: string) => log.rpc.filter((c) => c.name === name).map((c) => c.body);
/** The next create_kudo for this sub fails with a server error (after validation passed), carrying a secret marker. */
export const failCreateRpc = (request: APIRequestContext, sub: string) => request.get(`${KUDOS_FAKE}/__kudo-fail-rpc?sub=${sub}`);
/** The next create_kudo for this sub that passes the fake's own validation is refused by the DB: 400, errcode 22023, message `code`. */
export const refuseCreateRpcOnce = (request: APIRequestContext, sub: string, code: string) => request.get(`${KUDOS_FAKE}/__kudo-refuse-once?sub=${sub}&code=${code}`);
export const delayCreateRpc = (request: APIRequestContext, sub: string, ms: number) => request.get(`${KUDOS_FAKE}/__kudo-delay?sub=${sub}&ms=${ms}`);

/** Holds back every kudos_search_sunners answer by `ms`; the call is logged on arrival, so "in flight" is observable. */
export const delaySearchRpc = (request: APIRequestContext, sub: string, ms: number) => request.get(`${KUDOS_FAKE}/__kudo-delay-search?sub=${sub}&ms=${ms}`);
/** While on, the hashtag catalog read of this sub answers 500 (the "+ Hashtag" dropdown then shows an error and a retry). */
export const failHashtagCatalog = (request: APIRequestContext, sub: string, on: boolean) => request.get(`${KUDOS_FAKE}/__kudo-fail-hashtags?sub=${sub}&on=${on ? 1 : 0}`);

/** Holds back every hashtag catalog read of this sub by `ms` before it answers (0 = no delay); a pending reload is then observable. */
export const delayHashtagCatalog = (request: APIRequestContext, sub: string, ms: number) => request.get(`${KUDOS_FAKE}/__kudo-delay-hashtags?sub=${sub}&ms=${ms}`);

/** Opens /sun-kudos signed in at a viewport; the content assertions belong to the spec, not this helper. */
export async function openKudos(page: Page, request: APIRequestContext, opts: { width?: number; sub?: string } = {}) {
  await page.setViewportSize({ width: opts.width ?? 1440, height: 900 });
  await signInAs(page, request, opts.sub);
  const authed = process.env.E2E_AUTHED_URL || "http://localhost:3103";
  await page.goto(`${authed}${KUDOS_PATH}`);
}
