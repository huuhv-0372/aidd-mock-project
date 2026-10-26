# Phase 01 — E2E RED gate

**Owner:** tester · **Priority:** P1 · **Status:** completed (2026-10-19: RED 70/70 fail đúng lý do, `reports/e2e-red-evidence.md`; 95 test cũ xanh; GREEN lần đầu 165/165; final-2: E2E 183/183, unit 501) · test_policy: e2e-red-first

## Context
- Test cases: `plans/momorph-specs/viet-kudo-ihQ26W78P2/test-cases.csv` (ID-0..56), `the-le-update-b1Filzi9i6/test-cases.csv`, `addlink-box-OyDLDuSGEa/test-cases.csv`, Homepage ID-54.
- [clarifications.md](clarifications.md). Hạ tầng có sẵn: `playwright.config.ts` (nhiều server), `tests/e2e/support/fake-supabase-server.mjs`, `kudos-fixtures.mjs`, `authed-session.ts`, `kudos-contract.ts`.

## Files (sở hữu)
- Tạo: `tests/e2e/write-kudo.spec.ts`, `tests/e2e/kudos-quick-actions.spec.ts`, `tests/e2e/support/write-kudo-fixtures.mjs` (tách khỏi `kudos-fixtures.mjs` vốn đã 286 dòng).
- Sửa: `fake-supabase-server.mjs` (route mới), `kudos-contract.ts` (test id / tên RPC dùng chung).

## Fake phải giống SQL (bài học #11)
- `POST /rest/v1/rpc/kudos_search_sunners` `{p_query,p_limit}`: so khớp không dấu, bỏ người đang đăng nhập, ≤10.
- `POST /rest/v1/rpc/create_kudo`: áp đúng mọi luật của phase 02 (sender ≠ recipient, title 1–100, content 1–5000, 1–5 hashtag có thật, ≤5 ảnh của chính mình (ban đầu prefix `{uid}/`, fix round 1 đổi sang `owner_id`), alias chỉ khi ẩn danh) → lỗi trả như PostgREST (`P0001`/`22023` + message); thành công thì chèn vào dữ liệu feed để /sun-kudos thấy Kudo mới.
- `POST|DELETE /storage/v1/object/kudo-images/...`: lưu trong bộ nhớ, ghi lại để test kiểm "lỗi RPC → ảnh bị xoá".
- Id fixture **không** phải UUID v4 (bài học zod `z.guid()`).

## Ca test (RED trước)
- Lối vào: Widget mở menu (ID-54 Homepage, FAB A/B/C) trên `/`, `/awards-information`, `/sun-kudos`; ✕ đỏ/Esc đóng; Thể lệ mở/đóng/cuộn, "Viết KUDOS" trong Thể lệ mở modal (TC_THELE_FUN_001/003/004); pill A.1 mở modal; khách bấm "Viết KUDOS" → `/login` (ID-1).
- Layout + mặc định: ID-2..6. Validate: ID-7, 11, 14, 48–52. Người nhận: ID-8..10, 25, 26. Mention: ID-12, 13, 33. Format: ID-27..32 (kiểm HTML `strong/em/s/ol/blockquote/a`). Hashtag: ID-15..17, 34..36, 53. Ảnh: ID-18..24, 37..40, 54, 55 (`setInputFiles` với file nhỏ thật, magic bytes đúng/sai). Ẩn danh: ID-41..44. Hủy/Gửi: ID-45..47 (payload RPC đúng: markdown, slug, alias).
- Add link: Text rỗng/khoảng trắng/101 ký tự; Link rỗng/`invalid-url`/`www`/`javascript:alert(1)`; hợp lệ → link chèn vào editor.
- Hoãn có lý do: ID-56 (mâu thuẫn, xem clarifications), TC_THELE_GUI_003/FUN_005 (N/A), hover/visual → phase 06.

## Steps
1. Viết fixture + route fake + 2 spec. 2. Chạy `npm run test:e2e -- tests/e2e/write-kudo.spec.ts tests/e2e/kudos-quick-actions.spec.ts`.
3. Ghi `reports/e2e-red-evidence.md`: `redTestFiles`, `redCommand`, `redExitCode`, `redFailure` (lỗi phải do thiếu UI/hành vi, không do config/server). Kiểm port 3100–3102 sạch trước khi chạy (bài học stale server).

## Success
Exit ≠ 0 đúng lý do; các spec cũ vẫn xanh (fake chỉ thêm route).
