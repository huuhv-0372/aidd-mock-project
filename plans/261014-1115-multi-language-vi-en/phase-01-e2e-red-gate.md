# Phase 01 — E2E RED gate + unit test locale

**Context:** [plan.md](plan.md) · test case nguồn: `plans/momorph-specs/homepage-saa-i87tDx10uM/test-cases.csv`
(ID-10, 24, 25, 26, 58), `plans/momorph-specs/login-GzbNeVGJHz/test-cases.csv` (language rows) ·
hạ tầng E2E có sẵn: `playwright.config.ts`, `tests/e2e/support/`.

## Overview
Priority P2 · Status completed · 0.5h. Viết test trước; phải đỏ đúng lý do (chưa có chuyển ngôn ngữ).

## Requirements
- E2E `tests/e2e/language-switch.spec.ts`:
  1. Mặc định: `/` hiện `VN` + cờ VN, `<html lang="vi">`, footer "Tiêu chuẩn chung" (ID-10).
  2. Mở dropdown: đúng 2 option VN, EN, mỗi option có cờ (ID-24, ID-58, dropdown spec A.1/A.2).
  3. Chọn EN → header nav, footer ("General standards", "Copyright © Sun* 2025"), event info
     ("Time:", "Venue:") đổi sang EN, nút hiện `EN`, `<html lang="en">`; URL vẫn là `/` (ID-25).
  4. Reload và điều hướng sang `/awards-information` → vẫn EN (cookie bền).
  5. Chọn lại VN → về tiếng Việt (ID-26).
  6. `/login` (guest, trước khi đăng nhập): đổi EN có tác dụng.
- Unit `tests/unit/locale.test.ts`: `resolveLocale(cookieValue)` — `undefined`/rác/`"jp"` → `vi`;
  `"en"` → `en`; schema zod của `setLocale` từ chối giá trị ngoài `vi|en`.
- Chuỗi EN mong đợi lấy từ MoMorph localizations (đã xác nhận), không tự dịch.

## Related Code Files
- Tạo: `tests/e2e/language-switch.spec.ts`, `tests/unit/locale.test.ts`.

## Implementation Steps
1. Đọc spec E2E hiện có (`homepage-guest.spec.ts`, `login.spec.ts`) để dùng lại server/fixture.
2. Viết 2 file test trên; import `lib/i18n/locales.ts` theo hợp đồng ở plan.md (chưa tồn tại → đỏ).
3. Chạy `npx playwright test language-switch` một mình (không chạy song song build — xem memory
   stale server), ghi bằng chứng đỏ vào `reports/e2e-red-evidence.md`.

## Todo
- [x] E2E 6 kịch bản (8 test trong `language-switch.spec.ts`) · [x] unit resolveLocale + schema · [x] bằng chứng RED (`reports/e2e-red-evidence.md`)

## Success Criteria
Mọi test mới đỏ vì thiếu tính năng (không vì lỗi cú pháp/fixture); test cũ không bị chạm.

## Risks
Port 3100–3103 còn `next start` cũ → kiểm tra & kill trước khi chạy.

## Security
Không áp dụng (chỉ test).
