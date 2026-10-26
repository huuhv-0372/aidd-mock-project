---
title: "Sun* Kudos - Live board (feature #11, kèm VI/EN)"
description: "Màn Sun* Kudos: Highlight top 5, Spotlight Board, All Kudos (infinite scroll), lọc hashtag/phòng ban, thống kê cá nhân, 10 Sunner nhận quà; DB Supabase thiết kế đủ cho #11/#12/#13."
status: completed
priority: P1
effort: 16h
branch: main
tags: [feature, ui, momorph, database, i18n]
blockedBy: []
blocks: []
created: 2026-10-15
work_type: feature
test_policy: e2e-red-first
spec_waived: "SDD mode disabled (takumi.sddMode: off)"
---

# Sun* Kudos - Live board

MoMorph: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/MaZUn5xHXZ (node `2940:13431`).
Inputs: [clarifications.md](clarifications.md), [database-design.md](database-design.md), `plans/momorph-specs/sun-kudos-live-board-MaZUn5xHXZ/`.
Plan sau dựa vào plan này: #12 Viết Kudo, #13 Like, Secret Box.

**Trạng thái: completed (2026-10-15).** 7 phase xong; verify SQL thật 20/20 PASS (`reports/db-verify-result.md`); review SEALED 9; riskGate đã ký (hoang.van.huu); evidence gate SEALED. Còn follow-up ở mục 5, 8, 9 và Deferred.

## Quyết định kiến trúc

- **DB một lần cho #11/#12/#13**: bảng giao dịch không grant trực tiếp; đọc qua 5 RPC `security definer` (che người gửi ẩn danh); RLS bật trên mọi bảng mới.
- Danh hiệu/hoa thị tính ở TS thuần; lọc trên URL; feed phân trang bằng Server Action + keyset; Spotlight tự viết, không thư viện.

## Phases

| # | Phase | Owner | Effort KH | Status |
|---|-------|-------|-----------|--------|
| 01 | [E2E RED gate + fake RPC fixtures](phase-01-e2e-red-gate.md) | tester | 2h | completed |
| 02 | [Track B: migration, RLS, RPC đọc, seed](phase-02-track-b-database-migration-and-seed.md) | implementer | 3h | in-review (chưa chạy trên DB thật) |
| 03 | [Track B: tầng dữ liệu, lọc, phân trang, logic](phase-03-track-b-data-layer-and-filters.md) | implementer | 2h | completed |
| 04 | [Track A: route, KV, Highlight carousel, card](phase-04-track-a-kv-and-highlight-carousel.md) | momorph-ui-implementer | 3h | in-review (pixel Figma chưa đo) |
| 05 | [Track A: All Kudos feed + sidebar](phase-05-track-a-all-kudos-feed-and-sidebar.md) | momorph-ui-implementer | 2.5h | in-review (pixel Figma chưa đo) |
| 06 | [Track A: Spotlight Board](phase-06-track-a-spotlight-board.md) | momorph-ui-implementer | 2h | in-review (pixel Figma chưa đo) |
| 07 | [Tích hợp, i18n, GREEN, visual, review, docs](phase-07-integration-i18n-green-review.md) | implementer + tester | 1.5h | in-review (còn bước 5, 6, 8) |

## Effort: kế hoạch vs thực tế

Kế hoạch 16h (tổng 7 phase; Track A/B chạy song song). Thực tế: **≥3h57m** đồng hồ từ 10:10 đến bằng chứng cuối 14:07 ICT (`temper-results.json`, npm test sau sửa test). Chưa tính phần người dùng (SQL thật, đăng nhập, ký duyệt). Giờ kết thúc hiện tại không đo được trong phiên này. Evidence không có mốc theo phase nên không tách giờ từng phase.

## Bằng chứng

- `evidence/temper-results.json` (13:28–14:07): lint 0 · tsc 0 · vitest 312/312 · `next build` + Playwright 94/94 · kudos specs 100/100 (20 case × 5) · overlap check trên DOM thật: 345 node × 15 bề rộng, 0 giao nhau · npm test 312/312 sau sửa hằng test `TICKER_ROW` 24→19.
- Review: `reports/review-pass-1-verdict.json` REWORK 7 (1 Critical, 2 Medium, 3 Low) → fix round 1 → fix round 2 (overlay Spotlight) → `evidence/inspection-verdict.json` SEALED 9, criticalCount 0, `humanSignedOff: false`.
- Visual (`reports/visual-check.md`, bản fix round 1 final): không tràn ngang 1440/375 VI+EN; focus thấy được; hashtag 44px. Figma chỉ so bố cục bằng mắt, không so pixel.
- RED (`reports/e2e-red-evidence.md`): 19 fail / 1 pass, lỗi đúng lý do. **Chưa có bằng chứng**: kết quả verify DB (`reports/db-verify-result.md`), đăng nhập Google thật, OpenNext preview có đăng nhập.

## Việc còn lại (owner · điều kiện xong)

1. ~~SQL trên Supabase thật~~ — xong: migration + seed + verify 20/20 PASS (`reports/db-verify-result.md`). Chưa có lần chạy migration thứ 2 (idempotency) — làm khi deploy môi trường khác.
2. ~~Đăng nhập Google sau migrate~~ — xong: người dùng đăng nhập và mở `/sun-kudos` với dữ liệu seed (lộ lỗi zod uuid, đã sửa).
3. ~~Re-review fix round 2~~ — xong: SEALED 9, criticalCount 0 (`evidence/inspection-verdict.json`).
4. ~~Ký riskGate~~ — xong: `humanSignedOff: true` (hoang.van.huu, 2026-10-15); commit `feat(kudos)`.
5. OpenNext: `npm run preview` có đăng nhập thật, `/sun-kudos` không lỗi 1101, avatar Google hiện · owner: hoang.van.huu (cần login Google) · xong khi: ghi kết quả vào `reports/`. Build OpenNext exit 0, gzip 2219 KiB đã ghi ở `reports/e2e-green-evidence.md` (đo trước fix round, không thêm dependency).
6. ~~Docs~~ — xong: changelog 2026-10-15, `codebase-summary.md`, `docs/system/permissions.md`, README.
7. ~~Sửa `awards-information-nav.spec.ts` ID-12/14~~ — chấp nhận (controller + reviewer), ghi ở `reports/e2e-green-evidence.md`.
8. Chốt các lệch thiết kế: sidebar 5 hay 6 dòng (specs D.1 ghi 6), ngoại lệ Spotlight node < 44px ở 375, node font 12–22px, ticker 5 dòng · owner: hoang.van.huu · xong khi: ghi quyết định cho từng mục.
9. Câu hỏi mở: tim cộng cho người gửi hay người nhận (trước #13); chuỗi EN không có trong Figma cần BTC duyệt (`reports/en-localizations.md`) · owner: hoang.van.huu · xong khi: có trả lời và duyệt.

## Deferred / follow-ups (đã chấp nhận, không chặn commit)

- `kudos_spotlight` trả toàn bộ recipient, chưa giới hạn (Low).
- Regex `kudo-plain-text` O(n²), giới hạn bởi 5000 ký tự DB (Low).
- `TICKER_HEIGHT = 5*24` dư ~25px, an toàn (Low); chuông/tài khoản header 40px ở 1440 (shell dùng chung, có trước plan).
- Hover profile, click tiêu đề lọc (D.4), "10 Sunner thăng hạng", realtime: hoãn theo clarifications. `kudos-fixtures.mjs` 286 dòng (vượt 200), giữ vì tên file cố định.
- Review 4 commit (2026-10-15) → vòng sửa `plans/261019-0855-kudos-review-fixes/`: docs trạng thái DB, test ẩn danh E2E, fixture theo SQL, message e102ebe.

## Scope drift

- KV "Hệ thống ghi nhận và cảm ơn" theo Figma `2940:13439` (spec: "lời cảm ơn"): sửa 1 chuỗi test, đã log. Phòng ban 50 mã (plan ~49), theo node-tree `WXK5AYB_rG`.
- Hashtag EN tự dịch vì `list_file_localizations` không có 13 hashtag (chờ BTC, việc 9). Hashtag trên card là link, không phải button (phase 01 ghi button).
- Spotlight: canvas rộng 1152–1157 tuỳ viewport (plan 1152). Thêm vùng loại trừ overlay sau 2 vòng (ticker 375; rồi 1024/1280), đã đóng bằng review SEALED. Chi phí: 1 vòng review, 1 vòng tester, test layout 22 case.
- Test: hằng `TICKER_ROW` 24→19 và comment sửa sau review (chỉ sửa test, vùng an toàn giữ nguyên). Chi phí: 1 lần chạy lại npm test.
- Spotlight stream qua `<Suspense>` riêng, tách `fetchKudosSpotlight` (review fix round 1). Chi phí: thêm 1 hàm dữ liệu.
- Bỏ helper `kudo_matches_filters`, EXISTS inline (review: gọi theo từng dòng). Chi phí: sửa migration trước commit.
- `distinct_senders` loại kudo ẩn danh (Critical: lộ người gửi ẩn danh). Chi phí: tầng Hero không tính kudo ẩn danh; thêm verify B11.
- Lỗi sau khi chạy seed thật (2026-10-15): zod `z.uuid()` (RFC 4122) từ chối id seed `md5(label)::uuid` → Highlight/feed/Spotlight/quà đều "không tải được". Sửa: `lib/validation/kudos.ts` dùng `z.guid()` (khớp kiểu `uuid` của Postgres) + test hồi quy; unit 313/313. E2E không bắt được vì fixture dùng UUID v4.
- Sửa nền theo Figma (2026-10-15, người dùng báo chữ bị chìm): KV dùng Cover `25deg` 957px đáy trùng KV, band 512px nằm sau header; Spotlight ghép ảnh gốc (lá −64/0 + đen 70%, mạng −35/−35 `screen` `opacity-30` — opacity fill không có trong CSS, đo từ render Figma); kèm chỉnh pill 738/381, mũi tên trái, cột người 235px, icon lửa. E2E 94/94; ảnh `reports/visual/`.
- `kudos-filter-href.ts` tách riêng để zod không vào bundle client; verify `profiles` dùng department `CTO`. Chi phí: nhỏ.
- Theo ghi chú bàn giao (chưa có trong reports/): New Hero badge vẽ bằng CSS; vị trí sao là lựa chọn; asset demo tái dùng 3 avatar và 1 ảnh.

## Rủi ro

- Đóng: Spotlight chồng tên lên total/search/ticker/Pan-Zoom (0 giao nhau ở 15 bề rộng). Ảnh cuối feed trống (lazy-load, 4/4 complete). Dropdown lọc nhiều Tab stop (còn 1). Stale server E2E (netstat sạch). Critical lộ người gửi ẩn danh (đã sửa, B11).
- Mở: FK `profiles.department` làm hỏng đăng nhập (đóng khi làm việc 2). Fake RPC lệch SQL thật (đóng khi làm việc 1; zod fixture test giảm rủi ro). OpenNext 1101 (đóng khi làm việc 5). Bản dịch EN chưa duyệt (việc 9). Pixel Figma chưa đo (việc 8).
