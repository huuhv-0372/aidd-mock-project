# E2E RED evidence — Viết Kudos (#12), phase 01

Policy `e2e-red-first`. Date 2026-10-19. Owner: tester. No app code touched (nothing under `app/`, `components/`, `lib/`, `supabase/`).

## Selector contract (UI agents implement against this)

Source of truth in code: `tests/e2e/support/kudos-contract.ts` (`WIDGET`, `RULES`, `ADD_LINK`, `WRITE`, `TOOLBAR`, `errorId`, helpers). Default locale `vi`. Roles + accessible names first; `data-testid` only where listed.
Global rules: every dialog is a native `<dialog>` (role `dialog`). Recipient listbox, mention list and hashtag dropdown render **inside** the Viết Kudo `<dialog>`. Do not set `maxlength` on the Add link inputs (the error must be reachable by typing 101 / 2049 chars).

### Entry points (specs: `kudos-quick-actions.spec.ts`)

| Thing | Contract |
|---|---|
| Widget toggle | existing `data-testid="widget-button"` (keep). Click opens the menu. |
| Menu | `data-testid="widget-menu"`, visible while open. Items: `button` "Thể lệ", `button` "Viết KUDOS". Guest (Homepage, no session): "Thể lệ" is a `button`, "Viết KUDOS" is a `link` with `href="/login"`. |
| Red ✕ | `data-testid="widget-close"` (visible while the menu is open). Click and `Esc` both close the menu; `widget-button` is visible again. |
| Pill A.1 | existing `data-testid="kudos-compose-trigger"`. Must become an enabled control (today `aria-disabled="true"`) that opens the Viết Kudo modal directly. Search pill next to it stays as is. |
| Thể lệ panel | `dialog` named exactly "Thể lệ" (heading "Thể lệ"). Scroll container `data-testid="rules-scroll"` (the element whose `scrollTop` changes). Six badges `data-testid="rules-badge"`. Footer: `button` "Đóng" (closes panel), `button` "Viết KUDOS" (closes panel, opens modal). |
| Menu after pick | "Thể lệ" opens the panel; "Viết KUDOS" opens the modal. Tests do not assert whether the menu stays open behind them. |

### Viết Kudo modal (spec: `write-kudo.spec.ts`)

| Thing | Contract |
|---|---|
| Dialog | name "Gửi lời cám ơn và ghi nhận đến đồng đội" (aria-labelledby the heading of that text). Esc, `Hủy`, click on backdrop close it **and discard** the form (reopen = empty). |
| Người nhận | `combobox` whose name matches /Người nhận/, `placeholder="Tìm kiếm"`, `aria-invalid="true"` on error. Typing any non-empty (after trim) query calls the `searchSunners` action with the **trimmed** query (RPC `kudos_search_sunners`, `p_query`). Suggestions: `role="option"` (name contains the full name; no email). Choosing one puts the full name in the combobox value and closes the list. |
| Danh hiệu | `textbox` named /Danh hiệu/ (required). |
| Editor | `data-testid="kudo-editor"` = the contenteditable (role textbox). Empty first `<p data-placeholder="Hãy gửi gắm lời cám ơn và ghi nhận đến đồng đội tại đây nhé!">`. Output tags: `strong`, `em`, `s`, `ol > li`, `blockquote`, `a[href]`. |
| Toolbar | `button` names "In đậm", "In nghiêng", "Gạch ngang", "Danh sách đánh số", "Chèn liên kết", "Trích dẫn"; toggles carry `aria-pressed`; clicking one keeps the editor selection. |
| Mention | typing `@name` opens `data-testid="mention-list"` (options `role="option"`); picking inserts `<span data-type="mention" data-id="{sunnerId}">@{Full name}</span>`; list closes. Sent as `@[Full name](id)`. |
| Hashtag | `button` "+ Hashtag" opens `data-testid="hashtag-dropdown"` (one `role="option"` per catalog tag, accessible name = `name_vi`). Dropdown **stays open on pick**; an outside click closes it. Chips `data-testid="hashtag-chip"` (text contains the name) each with a `button` named /Xóa/. At 5 chips the unselected options are `aria-disabled="true"` (clicking them adds nothing), "+ Hashtag" stays visible, text "Tối đa 5" is visible. |
| Image | `button` "+ Image" (hidden at 5 images). `data-testid="kudo-image-input"` = `<input type=file multiple>`, always in the DOM while the dialog is open; cap 5 even for a 6-file selection. Thumbnails `data-testid="image-thumb"` each with a `button` named /Xóa ảnh/. Client checks browser MIME (jpeg/png/webp) and size (≤5 MB) only; it must **not** sniff bytes — the server action does (magic bytes), so a `.jpg` with PDF bytes gives a thumbnail first, then an `error-images` after Gửi. |
| Anonymous | `checkbox` "Gửi lời cám ơn và ghi nhận ẩn danh" (default off). Checked → `textbox` named "Tên ẩn danh" (optional, ≤50); unchecked → field gone and alias NOT sent. |
| Footer | `button` "Hủy", `button` "Gửi" (exact names). Gửi is `disabled`/`aria-disabled` until recipient + title + content + ≥1 hashtag. While sending: Gửi disabled **and** `aria-busy="true"`, a second click sends nothing. Success: modal closes, page stays. |
| Errors | `data-testid="error-{field}"`, `field` = `recipient`, `title`, `content`, `hashtags`, `images`, `form`. Required text "Không được để trống" (blur on recipient/title/editor; closing the hashtag dropdown with 0 chips). `error-images` text matches /định dạng/i for pdf/mp4/txt. `error-form` = one generic line for any server failure (never `err.message`). |

### Add link (`OyDLDuSGEa`)

Opened by the toolbar button "Chèn liên kết". Nested `dialog` named "Add link" (heading "Add link"). Inputs: `textbox` "Text" and `textbox` "Link" (exact names, empty on open). Buttons `button` "Hủy", `button` "Lưu". Errors `data-testid="error-text"` / `error-link` inside it. Lưu with valid data closes only Add link and inserts `<a href="{link}">{text}</a>` in the editor. `Esc`/Hủy close only Add link (the Viết Kudo modal stays). Rules: Text 1–100 and not whitespace-only; Link http/https only, 5–2048 chars (`javascript:`, `ftp:`, `www`, `invalid-url` rejected).

### What the app must send (checked through the fake's log)

- `create_kudo` args: `p_recipient_id`, `p_title` (trimmed), `p_content` (Markdown: `**b**`, `@[Tên](id)`), `p_hashtag_slugs` (catalog slugs), `p_image_urls` (public URLs in file order, `[]` if none), `p_is_anonymous`, `p_anonymous_name` (null/absent when not anonymous; null or `""` when anonymous without alias).
- Storage: upload with an **explicit `contentType`** (jpeg/png/webp). supabase-js defaults a Buffer to `text/plain` and the fake — like the bucket's `allowed_mime_types` — answers 415. Path exactly `{uid}/{uuid}.{jpg|png|webp}`. RPC failure after upload → `remove()` of every uploaded path.
- A validation failure (zod, spoofed image) must happen **before** any upload and any `create_kudo` call.

## Result

- **redTestFiles:** `tests/e2e/write-kudo.spec.ts` (55 tests), `tests/e2e/kudos-quick-actions.spec.ts` (15 tests); support: `tests/e2e/support/write-kudo-fixtures.mjs` (new), `fake-supabase-server.mjs` (routes added only), `kudos-contract.ts`.
- **redCommand:** `npm run test:e2e -- tests/e2e/write-kudo.spec.ts tests/e2e/kudos-quick-actions.spec.ts` (repo root; runs `next build` first, then `playwright test`, 2 workers, ports 3100–3103 + 54398 verified free before and after).
- **redExitCode:** `1` (captured with `echo EXIT=$?`; Playwright summary `70 failed`).
- **Counts:** `write-kudo.spec.ts` 55 fail / 0 pass; `kudos-quick-actions.spec.ts` 15 fail / 0 pass. Total 70 fail / 0 pass. Build, typecheck and server start were clean, no config/dependency error.
- **redFailure (representative, all caused by the missing UI):**
  - 54 tests: `Error: pill A.1 must be an enabled control (today aria-disabled, display-only)` — `expect(getByTestId('kudos-compose-trigger')).toBeEnabled()`: 53 in `openWriteModal` (shared entry of the modal tests in `write-kudo.spec.ts`) + 1 in the "Pill A.1" test of `kudos-quick-actions.spec.ts`.
  - 16 tests: `expect(getByTestId('widget-menu')).toBeVisible() failed … element(s) not found` — widget click opens nothing (`kudos-quick-actions.spec.ts:16`; 2 of them are the "success from / and /awards-information" cases in `write-kudo.spec.ts`).
  - No timeout, `ECONNREFUSED`, `EADDRINUSE`, module or syntax error in the log. Slowest test 10.8 s.
- **Limit of this RED:** every `write-kudo.spec.ts` body is behind the pill (and two behind the widget menu), so RED proves the entry is missing, not each assertion. The bodies beyond the entry have not run against a UI; the first GREEN run may need selector tweaks. The fake itself was exercised with real `@supabase/supabase-js` (scratch probe, not committed): search (accent, trim, ≤10, no self, no email keys), Storage multipart + raw upload, 415 for `text/plain`, 403 for another user's folder, bulk `remove`, public GET, every `create_kudo` error code (`forbidden`, `invalid_recipient`, `invalid_title`, `invalid_content`, `invalid_hashtags`, `invalid_images`, `invalid_alias`), success insert visible first in `kudos_feed`, injected 500.

## Test case → test mapping

| Test case | Test (file › title) |
|---|---|
| Viết Kudo ID-0, ID-2 | quick-actions › "FAB B (ID-0, ID-2) …" ×3 pages; write-kudo › every case opens the modal via pill A.1 |
| ID-1 (guest) | quick-actions › Guest › "'Viết KUDOS' is a link to /login" |
| ID-3 | write-kudo › layout › "ID-3 title on top; fields run …" |
| ID-4, 5, 6, 48 | write-kudo › layout › "ID-4, ID-5, ID-6, ID-48 placeholders …" |
| ID-48, 49 | layout › "ID-49 Gửi enables …" + 4 × "Gửi stays disabled without recipient/title/content/hashtag" |
| ID-7, 50 | Người nhận › "ID-7, ID-50 leaving Người nhận empty …" |
| ID-8, 25 | Người nhận › "ID-8, ID-25 typing filters Sunners ignoring accents …" |
| ID-9 | Người nhận › "ID-9 '@ # $' …" |
| ID-10 | Người nhận › "ID-10 surrounding spaces are trimmed …" |
| ID-26 | Người nhận › "ID-26 choosing a suggestion …" |
| (clarification: ≤10, no self) | Người nhận › "results cap at 10 and never include the signed-in user" |
| ID-11, 51 | Danh hiệu/nội dung › "ID-11, ID-51 leaving the content empty …" (+ title blank case) |
| ID-12, 13, 33 | Danh hiệu/nội dung › "ID-12, ID-13, ID-33 '@' + name …"; Gửi › "ID-27, ID-13 … Markdown" |
| ID-27, 28, 29, 32 | Danh hiệu/nội dung › 4 × "'In đậm' / 'In nghiêng' / 'Gạch ngang' / 'Trích dẫn' wraps …" |
| ID-30 | Danh hiệu/nội dung › "ID-30 'Danh sách đánh số' …" |
| ID-31 + Add link cases | write-kudo › Add link (6 tests: layout/defaults, valid, Text invalid, Link invalid, boundaries, Hủy/Esc) |
| ID-14, 52 | Hashtag › "ID-14, ID-52 closing the dropdown with no hashtag …" |
| ID-15, 34, 35 | Hashtag › "ID-15, ID-34, ID-35 picking tags …"; Gửi › "ID-47 …" |
| ID-36 | Hashtag › "ID-36 the x on a chip …" |
| ID-16, 17, 53 | Hashtag › "ID-16, ID-17, ID-53 five tags fit …" |
| ID-18, 21, 22, 37 | Image › "ID-21, ID-22, ID-37 …", "ID-18 three images …" |
| ID-19, 20, 38, 54 | Image › "ID-19, ID-20, ID-38, ID-54 …", "six files chosen at once …" |
| ID-39, 40 | Image › "ID-39, ID-40 the x removes …" |
| ID-23, 24, 55 | Image › 3 × "ID-23 / ID-24 / ID-55 … refused" |
| (clarification: 5 MB, magic bytes) | Image › "an image over 5 MB …", ".jpg that is really a PDF …" |
| ID-6, 41, 42, 43, 44 | anonymous › "ID-6, ID-41-44 the checkbox toggles …" |
| ID-46 (alias payload) | anonymous › 3 × "payload and board: …" (alias / default label / switched off) |
| ID-45 | Hủy, Gửi › 3 × "ID-45 Hủy / Esc / click on the backdrop …" |
| ID-47 | Hủy, Gửi › "ID-47 one tag, no image …" |
| ID-46 | Hủy, Gửi › "ID-46 two tags + two images …" (loading, double send, upload paths, URLs) |
| (decision: server error) | Hủy, Gửi › "server failure after upload …" (generic message, images deleted) |
| (decision: success stays / feed) | Hủy, Gửi › "on /sun-kudos the new Kudo leads …", "success from / and /awards-information …" |
| Homepage ID-54 | quick-actions › "ID-54 widget opens the menu …" ×3 pages |
| TC_THELE_GUI_001 | quick-actions › Thể lệ › "TC_THELE_GUI_001 …" |
| TC_THELE_FUN_001, 002 | quick-actions › Thể lệ › "FUN_001 … scrolls", "FUN_002 … does not scroll" |
| TC_THELE_FUN_003, 004 | quick-actions › "FAB A / TC_THELE_FUN_003, FUN_004 …" ×3 pages; guest "can open Thể lệ and close it" |
| Pill A.1 | quick-actions › "Pill A.1 on /sun-kudos …" |

## Deferred (with reason)

- Viết Kudo **ID-56** — contradicts the decided disabled Gửi (clarifications.md); its intent is covered by the blur-error tests.
- **TC_THELE_GUI_003, TC_THELE_FUN_005** — N/A, the panel has no disabled footer state (clarifications.md).
- **TC_THELE_GUI_002, TC_THELE_GUI_004**, Add link GUI sizes/colours/browser matrix, every hover/focus/visual state — phase 06 visual comparison (`visual-contract`), not an E2E pass/fail.
- Free-form hashtag (`TeamWork`, `Tag1..3`) — N/A, only the 13 catalog tags can be chosen.
- Add link "open twice shows one instance" (second ACCESSING row) and double-click on Hủy — not testable in a modal that makes the page inert; skipped.
- Feed card with images from a freshly created Kudo (`next/image` host for the public Storage URL) — not in the E2E; check at phase 06 (the fake serves `GET /storage/v1/object/public/kudo-images/…`).

## Fake Supabase additions (test-only, `write-kudo-fixtures.mjs`)

- `kudos_search_sunners`, `create_kudo` mirror phase 02 (same check order, PostgREST error `400 / 22023 / {message: code}`); Storage `POST|PUT|DELETE /storage/v1/object/kudo-images/…` (own folder only → else 403, mime jpeg/png/webp → else 415, ≤5 MB → else 413), public `GET`.
- A created Kudo is stored per caller (JWT sub): only that user's `kudos_feed` page 1 shows it (first). Other tests/specs keep seeing the 28 base Kudos (isolation under `fullyParallel`).
- Test controls (GET, `?sub=`): `/__kudo-log` (RPC bodies, uploads incl. magic bytes, deletes, live objects), `/__kudo-fail-rpc` (next `create_kudo` fails with a 500 carrying the marker `boom-secret-detail`), `/__kudo-delay?ms=`.
- Not mirrored (known gaps): `is_allowed_account` (any valid JWT is allowed), `storage.objects.owner` column type, `kudos_my_stats.sent` does not count new Kudos, `unaccent` is approximated with NFD + `đ→d`. Fixture ids are not UUID v4 (`2a000000-…-0000000001NN` Sunners, `c2000000-…` Kudos).

## Existing-spec regression (fake changes must not break them)

`npx playwright test` on the 11 existing spec files that share the fake or the servers (`sun-kudos`, `sun-kudos-feed`, `homepage`, `homepage-guest`, `homepage-account-menu`, `awards-information`, `awards-information-nav`, `language-switch-authed`, `language-switch`, `login`, `countdown-prelaunch-gate`), same build as the RED run, 2 workers, ports clean before/after: **95 passed, 0 failed, exit 0 (2.1 min)**.

## Gates

`npx tsc --noEmit` exit 0; `npx eslint tests/e2e` exit 0.
