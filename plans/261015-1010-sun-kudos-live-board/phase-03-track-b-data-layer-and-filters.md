---
phase: 03
title: "Track B: tầng dữ liệu, bộ lọc URL, Server Action phân trang, logic thuần"
status: completed
owner: implementer
effort: 2h
test_policy: e2e-red-first
blocked_by: [02]
---

# Phase 03 — Tầng dữ liệu + logic

## Context
- Hợp đồng RPC: [database-design.md](database-design.md); kiểu TS: `lib/kudos/kudo-types.ts` (02 bước 1).
- Mẫu: `lib/profiles/get-current-profile.ts` (client server, zod `safeParse`, không throw, log đầy đủ server-side); `lib/i18n/set-locale-action.ts` (Server Action + zod).
- Chỉ cần 02 bước 1 (types) để bắt đầu; không cần migration đã chạy (unit test dùng client giả).

## Goal
Mọi thứ không phải giao diện: lấy dữ liệu board, parse/validate, bộ lọc trên URL, phân trang, quy tắc danh hiệu/hoa thị, định dạng giờ, bố cục + toán pan/zoom Spotlight. Viết test trước (RED → GREEN).

## Owned files
- Create:
  - `lib/validation/kudos.ts` — zod cho dòng Kudo/Person/Spotlight/Stats/Gift; `kudosFiltersSchema`; `loadMoreKudosInputSchema` (cursor `created_at` ISO + `id` uuid, filter).
  - `lib/kudos/get-kudos-board-data.ts` — gọi song song `kudos_highlight`, `kudos_feed` (trang 1), `kudos_spotlight`, `kudos_my_stats`, `kudos_latest_gift_recipients`, `hashtags`, `departments`; mỗi khối parse riêng, lỗi khối nào thì khối đó `null` (UI hiện lỗi chung tại khối đó), không throw.
  - `lib/kudos/load-more-kudos-action.ts` — `"use server"`; zod → `kudos_feed`; trả `{ items, nextCursor }` hoặc `{ error: 'generic' }`.
  - `lib/kudos/parse-kudos-filters.ts` — `searchParams` → `{hashtag?, department?}` đối chiếu danh mục (lạ → bỏ); `buildKudosFilterHref(current, patch)`.
  - `lib/kudos/hero-title.ts` — `heroTier(distinctSenders)`, `starCount(kudosReceived)` (ngưỡng ở `database-design.md`).
  - `lib/kudos/format-kudo-time.ts` — `HH:mm - MM/DD/YYYY` theo UTC+7 (dùng `Intl` với `timeZone: 'Asia/Ho_Chi_Minh'`).
  - `lib/kudos/kudo-plain-text.ts` — Markdown con → plain text cho card (bỏ ký hiệu, mention `@[Tên](id)` → `@Tên`).
  - `lib/kudos/spotlight-layout.ts` — vị trí tất định theo hash `id` trên canvas 1152×? (lấy kích thước từ Figma node `2940:14174`), tránh chồng chữ theo lưới ô; cỡ chữ theo `kudos_count`.
  - `lib/kudos/pan-zoom.ts` — kẹp scale (vd 0.5–3), kẹp pan trong biên, zoom quanh con trỏ.
  - `tests/unit/*.test.ts` tương ứng (1 file / module).
- Edit: `lib/navigation/routes.ts` — thêm `kudoDetailHref(id)` (`/sun-kudos/{id}`), `profileHref(id)` (`/profile/{id}`); `tests/unit/routes.test.ts`.

## Steps
1. Unit test RED cho: ngưỡng danh hiệu (0,1,4,5,9,10,20,21) và hoa thị (9,10,19,20,49,50); giờ (biên nửa đêm UTC → ngày VN); parse filter (slug lạ, mã có `&`/dấu cách, rỗng); `buildKudosFilterHref` xoá param khi bỏ chọn; zod từ chối dòng thiếu cột; layout tất định (2 lần gọi = nhau, không 2 node trùng ô); pan-zoom kẹp biên; action từ chối cursor sai, `p_limit` > 20.
2. Viết code cho GREEN. `get-kudos-board-data` nhận client tuỳ chọn như `getCurrentProfile` để test không cần `next/headers`.
3. Action: không bao giờ trả `err.message`; `console.error` đầy đủ phía server.
4. `npx tsc --noEmit`, `npm run lint`, `npm test` xanh. **Không** chạy `npm run test:e2e`/`next build` (chạy song song với Track A — xem memory pitfalls).

## Success criteria
- [x] Unit test xanh, mỗi module ≤ 200 dòng (đếm dòng: lớn nhất `spotlight-board.tsx` 200, `spotlight-layout.ts` 199; `evidence/temper-results.json` vitest 312/312).
- [x] Zod parse thành công fixture của 01 (`tests/e2e/support/kudos-fixtures.mjs`) — test đọc fixture có trong `tests/unit/` (`get-kudos-board-data.test.ts`, `kudos-validation.test.ts`).

## Risks
| Risk | L/I | Counter |
|------|-----|---------|
| Server Action thành endpoint lọt dữ liệu | L/H | zod + RPC tự kiểm `is_allowed_account`; action chỉ đọc |
| Lệch giờ do timezone máy | M/M | Luôn `timeZone` cố định; test với giờ biên |
| Layout Spotlight chồng chữ khi nhiều tên | M/M | Lưới ô + đo theo độ dài tên; test với 200 tên |

## Security
Validate mọi input client bằng zod trước RPC (CLAUDE.md). Không dùng service-role; mọi truy vấn qua client SSR của người dùng.

## MoMorph refs:
- Sun* Kudos - Live board: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/MaZUn5xHXZ
- Clarifications: plans/261015-1010-sun-kudos-live-board/clarifications.md
- testPolicy: e2e-red-first

## Completion notes (2026-10-15)
- [x] Steps 1–4: unit test RED → GREEN (vitest 312/312). `tsc`, lint sạch. Không chạy E2E/build trong phase này (đúng quy tắc song song).
- Module đã có: `lib/kudos/{get-kudos-board-data,load-more-kudos-action,parse-kudos-filters,kudos-filter-href,hero-title,format-kudo-time,kudo-plain-text,spotlight-layout,pan-zoom}.ts`, `lib/validation/kudos.ts`.
- Đổi ngoài kế hoạch: `kudos-filter-href.ts` tách riêng để zod không vào bundle client; `fetchKudosSpotlight` tách khỏi `getKudosBoardData` (review fix round 1). Chi tiết ở `plan.md` → Scope drift.
- Spotlight layout: 22 case (6 bề rộng desktop + 6 phone/tablet, 20/60/105/200 tên); vùng loại trừ chỉnh qua 2 vòng fix.
- Review (SEALED 9): không còn Critical trong tầng này. Low còn lại: `kudos_spotlight` recipients không giới hạn (deferred).
