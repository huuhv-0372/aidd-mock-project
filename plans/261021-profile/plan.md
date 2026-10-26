---
title: "Profile — /profile (bản thân) và /profile/<id> (người khác)"
description: "Figma 362:5037: hero, bộ sưu tập icon, thống kê (mình) hoặc thanh gửi lời cảm ơn (người khác), KUDOS Đã nhận/Đã gửi với cuộn vô hạn."
status: completed
priority: P2
effort: 7h
branch: main
tags: [feature, ui, figma, i18n, database]
blockedBy: []
blocks: []
created: 2026-10-21
work_type: feature
test_policy: e2e-red-first
spec_waived: "SDD mode disabled (takumi.sddMode: off)"
---

# Profile

MoMorph `3FoIx6ALVb` (Figma `362:5037`) + `w4WUvsJ9KI` (người khác: MoMorph chưa có ảnh, người dùng gửi ảnh ngày 2026-10-21). Specs/test case: `plans/momorph-specs/profile-ban-than-3FoIx6ALVb/`. Ảnh: `figma/`. Quyết định: [clarifications.md](clarifications.md) (Session 2 đổi các mặc định theo ảnh người khác).

| # | Phase | Owner | Effort | Status |
|---|-------|-------|--------|--------|
| 01 | E2E RED `tests/e2e/profile.spec.ts` (+ `support/profile-contract.ts`, fake `profile_card` / `kudos_profile_feed` trong `support/profile-fixtures.mjs`) | tester | 1h | completed (RED 27/30 fail, exit 1; regression 120/120; [báo cáo](reports/tester-261021-red.md)) |
| 02a | UI: hero, hàng icon, khung thống kê 680, thanh gửi lời cảm ơn, tiêu đề KUDOS + dropdown, danh sách thẻ, messages `profile` vi/en | momorph-ui-implementer | 2.25h | completed (kèm polish vòng 1: `KudosKvBackdrop`, band 6deg, tooltip 375, trigger 64px, padding 40; [báo cáo](reports/ui-261022-profile.md), [polish](reports/ui-261022-profile-polish-1.md)) |
| 02b | Dữ liệu + route: migration `20261022100000_create_profile_rpcs` (+ down, verify), `lib/profiles/*`, `app/[locale]/profile/` (page + `[id]`), unit | implementer (strong) | 2h | completed (SQL thật 14/14 PASS; [báo cáo](reports/impl-261022-02b-data-route.md)) |
| 02c | Modal Viết Kudo điền sẵn người nhận: `openComposer({ recipient })` → form khởi tạo người nhận + unit | implementer (balanced) | 0.5h | completed ([báo cáo](reports/impl-261022-02c-composer-prefill.md)) |
| 03 | GREEN + visual 1440/375 + SQL thật + review + docs + riskGate | tester + reviewer + doc-writer | 1.25h | completed (riskGate đã ký 2026-10-22; evidence gate SEALED; docs: README, codebase-summary, permissions, changelog) |

02a / 02b / 02c chạy song song sau RED, sở hữu file tách rời; không agent nào build hay chạy E2E (chỉ phase 03).

## Hợp đồng giữa các phase
- Kiểu dùng chung (controller tạo sẵn, các agent chỉ đọc): `lib/profiles/profile-types.ts` (`ProfilePageData`, `LoadMoreProfileKudos`, `ProfileKudosDirection`). Thư mục lib là `lib/profiles/` (đã có `get-current-profile.ts`), không tạo `lib/profile/`.
- 02a ghép toàn trang trong `components/profile/profile-view.tsx`: `ProfileView({ data: Extract<ProfilePageData, { status: "ok" }>, locale, dict: Dictionary, loadMore: LoadMoreProfileKudos })` = `KudosComposer` › `ProfilePageLayout` › `KudoHeartsProvider(setKudoHeart)` › hero, hàng icon, thống kê (mình) hoặc thanh gửi lời cảm ơn (người khác), phần KUDOS. Các mảnh khác trong `components/profile/*` do 02a tự chia.
- 02a cũng export `ProfilePageLayout({ locale, shell, children })`: header + footer, cả hai `activeHref = SUN_KUDOS_PATH`, không widget. Trang dùng nó cho lỗi tải hồ sơ: `<p role="alert">{dict.profile.loadError}</p>`.
- `dict.profile` (02a, `messages/{vi,en}/profile.ts` + đăng ký trong `index.ts`): bắt buộc có `metaTitleSelf`, `metaTitleOther` (`"{name} | SAA 2025"`), `loadError`; còn lại do 02a đặt (hero, icons, writeBar "Gửi lời cám ơn và ghi nhận tới {name}", kudos…).
- 02b (route + dữ liệu):
  - `app/[locale]/profile/page.tsx` + `[id]/page.tsx`: metadata, `notFound()` / `redirect("/profile")` trước khi render, rồi `<ProfileView …/>`;
  - `getProfilePageData(id: string | null, client?)` → `ProfilePageData`, bọc `cache()` để metadata và trang dùng chung một lần gọi;
  - `loadMoreProfileKudos(input: unknown)`: server action, zod → `LoadMoreProfileKudosResult`.
- 02c: `useKudosComposer().openComposer(options?: { recipient?: RecipientChoice })`; không tham số = hành vi cũ (trang chủ, board, widget không đổi).
- E2E (01): `tests/e2e/support/profile-contract.ts` là nguồn selector/chữ; 02a/02b/02c chỉ đọc.

## Kết quả (2026-10-22)
- **Đã xong:** 01, 02a (kèm polish vòng 1), 02b, 02c. Trên cây đã tích hợp: E2E 298/298 (profile 30/30), vitest 826/826, lint sạch, tsc 0, build ok; Worker gzip 2259 KiB (View Kudo 2241, +18 KiB, dưới 3 MiB).
- **SQL thật:** migration + verify chạy trên Supabase, 14/14 PASS (người dùng chạy).
- **Review:** lượt 1 REWORK 8 (DRY lớp nền KV, đã sửa bằng `KudosKvBackdrop`); re-review SEALED 9, 0 Critical/High; Low: 4 defer, 1 reject.
- **Visual 1440/375:** khớp trong 1px ở các phần đo được, không cuộn ngang ở 375. Lệch còn lại owner đã chấp nhận: nền trang người khác, bút chì chỉ trên Kudo của mình, dòng "Bạn đã xem hết Kudos.".
- **Lệch kế hoạch:** polish vòng 1 thêm vào 02a, tách `KudosKvBackdrop` chạm `kudos-kv-banner` và `kudo-detail-layout` của board; bút chì `KudoPostCard` đổi theo `is_mine` (đổi cả board); gradient 6deg thay 8deg; padding thống kê 40 từ md. Effort thực tế chưa ghi nhận.
- **Còn lại (phase 03):**
  - riskGate: chờ người dùng ký. Blocker: `inspection-verdict.json` còn `humanSignedOff: false`. Xong khi controller ghi `humanSignedOff: true`.
  - Commit: controller. Xong khi có commit conventional trên `feature.new.profiles`, không push, không kèm `.playwright-mcp/`.
  - Docs: doc-writer, song song. Xong khi roadmap, changelog, system-architecture, code-standards được cập nhật.
  - Sau khi ký: controller đổi phase 03 và plan sang `completed`.

## Ước lượng
~7h (chỉ trang của mình ~5h). Khoảng **36 file**: tạo mới ~24 (migration ×3, 2 route, 3 lib/profile, 7 components/profile, messages vi/en, E2E spec + contract, 5 unit test), sửa ~9 (fake Supabase/fixtures, `kudos-composer-provider`, `use-write-kudo-form`, write-kudo dialog/form props, `kudo-types` hoặc validation, `lib/i18n` dictionary index, routes nếu cần), docs 3–4.

## Rủi ro
- Lộ số/thẻ Kudo ẩn danh qua "Đã gửi" của người khác → RPC trả 0 dòng khi `p_profile <> auth.uid()`, UI không có mục "Đã gửi"; reviewer kèm checklist SQL/ẩn danh; người dùng chạy file verify.
- Migration + RPC security definer → full unit + E2E, ký riskGate sau khi chạy SQL thật.
- Đổi API `openComposer` dùng chung → E2E Viết Kudo chạy lại toàn bộ.
- Ảnh "Profile người khác" chỉ có bản người dùng gửi (MoMorph chưa có node) → đo từ ảnh; dải nền trang người khác được chấp nhận khác ảnh (clarifications 2026-10-22).
