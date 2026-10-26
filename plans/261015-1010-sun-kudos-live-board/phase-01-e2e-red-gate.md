---
phase: 01
title: "E2E RED gate + fake Supabase RPC fixtures"
status: completed
owner: tester
effort: 2h
test_policy: e2e-red-first
blocked_by: []
---

# Phase 01 — E2E RED gate

## Goal
Spec E2E bền vững từ `test-cases.csv` + `clarifications.md`, FAIL bây giờ vì đúng lý do (authed `/sun-kudos` đang là 404) và là cổng GREEN cho phase 07. Fake Supabase trả dữ liệu Kudo qua đúng hợp đồng RPC trong `database-design.md`, để E2E chạy thật (lọc thật, phân trang thật) mà không cần DB.

## Owned files
- Create: `tests/e2e/sun-kudos.spec.ts` (layout, highlight, lọc), `tests/e2e/sun-kudos-feed.spec.ts` (feed, sidebar, spotlight, copy link) — mỗi file ≤200 dòng; `tests/e2e/support/kudos-fixtures.mjs` (dữ liệu giả); `tests/e2e/support/kudos-contract.ts` (selector + chuỗi mong đợi); `reports/e2e-red-evidence.md`.
- Edit: `tests/e2e/support/fake-supabase-server.mjs` — thêm route `POST /rest/v1/rpc/kudos_{feed,highlight,spotlight,my_stats,latest_gift_recipients}`, `GET /rest/v1/{hashtags,departments}`; tôn trọng `p_hashtag`, `p_department`, cursor, `p_limit`. Kịch bản rỗng: JWT `sub` = `EMPTY_USER_ID` → mọi RPC trả rỗng / 0. Giữ nguyên các route cũ.
- Không sửa `playwright.config.ts` trừ khi bắt buộc (ghi lý do).

## Selector contract (02–07 phải khớp; chép làm comment đầu spec)
- Header `aria-current="page"` trên link `Sun* Kudos`. KV `getByTestId('kudos-kv')` chứa `Hệ thống ghi nhận lời cảm ơn`; ô A.1 `getByTestId('kudos-compose-trigger')` placeholder `Hôm nay, bạn muốn gửi lời cảm ơn và ghi nhận đến ai?`, `aria-disabled="true"`.
- Highlight `getByTestId('highlight-kudos')`: heading `HIGHLIGHT KUDOS`; nút lọc `getByRole('button', {name: 'Hashtag'})`, `{name: 'Phòng ban'}` (có `aria-expanded`); listbox option `getByRole('option', {name})`, option chọn có `aria-selected="true"`. Slide `getByTestId('highlight-slide')` (slide giữa có `aria-current="true"`); nút `getByRole('button', {name: 'Kudo trước'})` / `{name: 'Kudo sau'}`; trang `getByTestId('highlight-page')` text `n/m`.
- Card (cả 2 khu): `getByTestId('kudo-card')` với `data-kudo-id`; trong card: `kudo-sender`, `kudo-recipient` (link `/profile/{id}`), `kudo-time` (`HH:mm - MM/DD/YYYY`), `kudo-title`, `kudo-content`, `kudo-hashtag` (button), `kudo-hearts` (aria-label `N lượt thả tim`, `data-liked`, `data-own`), nút `Copy Link`, link `Xem chi tiết` (`/sun-kudos/{id}`, chỉ highlight), `kudo-image` (≤5).
- Spotlight `getByTestId('spotlight-board')`: `getByTestId('spotlight-total')` = `{total} KUDOS`, node `getByTestId('spotlight-node')` (link `/sun-kudos/{last_kudo_id}`), ô `getByRole('searchbox', {name: 'Tìm kiếm'})` maxlength 100, nút `getByRole('button', {name: 'Pan/Zoom'})` (`aria-pressed`).
- All Kudos `getByTestId('all-kudos')`: heading `ALL KUDOS`; empty `Hiện tại chưa có Kudos nào.`.
- Sidebar `getByTestId('kudos-stats')`: 5 dòng label + số (`Số Kudos bạn nhận được:` ...), nút `Mở Secret Box` `aria-disabled="true"`; `getByTestId('gift-recipients')` heading `10 SUNNER NHẬN QUÀ MỚI NHẤT`, item `gift-recipient`; rỗng `Chưa có dữ liệu`.
- Toast `getByRole('status')` text `Link copied — ready to share!`.

## Cases (theo TC_ID trong test-cases.csv)
1. `71b3ef43`: guest (PAST server) `/sun-kudos` → `/login`.
2. GUI layout: thứ tự KV → Highlight → Spotlight → All Kudos(+sidebar bên phải ở 1440) → footer; ở 375 sidebar xuống dưới feed.
3. `86092c3a` / `81446f61`: 5 slide; ở 1/5 nút trước disabled; bấm sau 4 lần → 5/5, nút sau disabled; trang hiển thị cập nhật.
4. `0e56cacb` / `159fed13`: mở dropdown, chọn hashtag → mọi card Highlight + All Kudos chứa tag đó, URL có `?hashtag=`, trang về `1/m`; bỏ chọn → đủ lại. Tương tự phòng ban (lọc theo phòng ban người nhận). Kết hợp 2 bộ lọc ra rỗng → text rỗng ở cả 2 khu.
5. `d01729d4`: click hashtag trên card → bộ lọc Hashtag = tag đó.
6. `9dfda316`: feed 10 card; cuộn tới cuối → thêm card (≥ 11), không trùng `data-kudo-id`; hết dữ liệu thì dừng.
7. `0adfd7ce`: Copy Link → clipboard = `{origin}/sun-kudos/{id}` (cấp quyền clipboard trong context), toast hiện.
8. `8c0d1781` / `31693bb7`: link `Xem chi tiết` và node Spotlight có href `/sun-kudos/{id}`; `2cd77a0c` / `630f42a3`: avatar/tên href `/profile/{id}` (chỉ assert href — trang đích là 404 theo clarifications).
9. Tim: kudo của mình `data-own="true"`; kudo đã tim `data-liked="true"`; số đúng fixture. Không click (toggle thuộc #13).
10. Sidebar: 5 số khớp fixture; 10 người nhận quà; `d662780b` + `926d92a5`: user rỗng → `Chưa có dữ liệu` + `Hiện tại chưa có Kudos nào.`.
11. Spotlight: tổng đúng; số node = số recipient fixture; `9e689933`: nhập 101 ký tự → giá trị dừng ở 100; tìm tên → node khớp có `data-match="true"`; `cac4b7a3`: Pan/Zoom đổi `aria-pressed`.
12. Ngôn ngữ: chuyển EN → heading/nhãn sidebar đổi sang EN (chuỗi lấy ở 07; RED tạm assert key VI đổi khác).

## Steps / Success
1. `netstat -ano | findstr "3100 3101 3102 3103 54398"` trước khi chạy; `npm run test:e2e -- tests/e2e/sun-kudos.spec.ts tests/e2e/sun-kudos-feed.spec.ts`.
2. RED hợp lệ = assertion thất bại vì thiếu nội dung trang, không phải lỗi server/port/fake. Ghi `redTestFiles`, `redCommand`, `redExitCode`, `redFailure` vào `reports/e2e-red-evidence.md`; tắt server đã mở.
3. `npx tsc --noEmit`, `npm run lint` sạch; spec cũ vẫn xanh (fake server đổi không phá route cũ).

## Risks
| Risk | L/I | Counter |
|------|-----|---------|
| Fake RPC lệch hợp đồng SQL thật | M/H | Hình dạng JSON lấy nguyên văn `database-design.md`; 03 parse bằng zod nên lệch sẽ lộ ra ngay |
| Clipboard trong headless | M/M | `context.grantPermissions(['clipboard-read','clipboard-write'])`; Chromium only |
| Infinite scroll flaky | M/M | `expect.poll` số card, cuộn bằng `scrollIntoViewIfNeeded` sentinel; không sleep cố định |

## MoMorph refs:
- Sun* Kudos - Live board: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/MaZUn5xHXZ
- Clarifications: plans/261015-1010-sun-kudos-live-board/clarifications.md
- testPolicy: e2e-red-first

## Completion notes (2026-10-15)
- [x] Steps 1–3: RED exit 1, 19 fail / 1 pass (guest redirect là regression guard). `redFailure`: `all-kudos › kudo-card` expected 10, received 0, do thiếu nội dung trang. Không có lỗi port/server/fake. `tsc` và lint sạch; spec cũ vẫn xanh.
- [x] Cổng GREEN ở phase 07: 94/94 toàn bộ và 100/100 hai spec Kudos (×5).
- Sửa spec sau RED (đã log trong `reports/e2e-green-evidence.md`): `kudos-contract.ts` đổi chuỗi KV; `cardById` scope vào feed; regex phòng ban; `awards-information-nav.spec.ts` ID-12/14 viết lại (ngoài danh sách cho phép, chờ xác nhận, xem plan việc 7).
- Còn mở: `kudos-fixtures.mjs` 286 dòng (vượt 200); sidebar 5 dòng trong khi specs D.1 ghi 6 (xem plan việc 8).
- Evidence: `reports/e2e-red-evidence.md`.
