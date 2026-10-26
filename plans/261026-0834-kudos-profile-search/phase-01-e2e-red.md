---
phase: 01
title: "E2E RED: type-ahead tìm profile Sunner"
status: completed
owner: tester
effort: 0.75h
test_policy: e2e-red-first
blocked_by: []
---

# Phase 01 — E2E RED

## Context Links
- [plan.md](plan.md), [clarifications.md](clarifications.md) (authoritative)
- Specs/TC: `plans/momorph-specs/sun-kudos-live-board-MaZUn5xHXZ/{specs,test-cases}.csv`
- Mẫu: `tests/e2e/sun-kudos-feed.spec.ts` (ID-11 maxlength), `tests/e2e/write-kudo.spec.ts` (`sunnerSearches`, `kudoLog`)
- Fake: `tests/e2e/support/write-kudo-fixtures.mjs` (`searchSunners` đã có: bỏ dấu, tên hoặc email, loại người gọi, ≤10, không email)

## Overview
Priority P2. Viết một spec bền vững; FAIL bây giờ vì pill còn là nút `aria-disabled` (không có combobox), và là cổng GREEN của phase 03.

## Key Insights
- Fake `kudos_search_sunners` có sẵn: tái dùng, không thêm dữ liệu. Có người gần trùng tên (`Nguyễn Văn An/Bình`, `Trần Văn An`), 12 `Sunner Tester NN` (kiểm giới hạn 10), người gọi `E2E User` (kiểm loại chính mình).
- `fill()` không bị `maxlength` chặn (gán giá trị trực tiếp) → dùng `pressSequentially` cho ca 101 ký tự (như ID-11 của Spotlight) và kiểm thuộc tính `maxlength="100"`.
- Cạm bẫy debounce (memory `zod-refine-runs-past-max-and-debounce-e2e-race`): không bao giờ khẳng định "không có request" bên trong cửa sổ 150ms. Dùng **câu mồi dương**: sau thao tác cần chứng minh "không gọi", gõ một truy vấn thật, chờ option của nó hiện, rồi mới đọc log; log chỉ được chứa truy vấn mồi.
- Id kết quả là Sunner của board (`2a000000-…`), có `profile_card` trong fake; vẫn chỉ khẳng định đường dẫn URL, không khẳng định nội dung trang hồ sơ.

## Requirements
Spec `tests/e2e/sun-kudos-profile-search.spec.ts` (≤200 dòng; nếu dài, tách `…-keyboard.spec.ts`), mở bằng `openKudos(page, request, { sub: randomUUID() })` để log theo từng test. Ca:
1. TC `1ce82447` / `d3877e54`: vỏ `profile-search` hiện kính lúp + combobox có placeholder `Tìm kiếm profile Sunner`; pill A.1 (`kudos-compose-trigger`) vẫn bật.
2. Gõ `Nguyễn Văn` → listbox `Kết quả tìm kiếm Sunner` có `Nguyễn Văn An`, `Nguyễn Văn Bình`; mỗi option có tên + phòng ban, không chứa `@`; không có `E2E User`; log `kudos_search_sunners` có `p_query: "Nguyễn Văn"`, `p_limit: 10`, `p_name_only: false`. Không dấu (`nguyen van an`) vẫn ra `Nguyễn Văn An`.
3. Gõ `Sunner Tester` → đúng 10 option.
4. Click option → URL pathname = `/profile/{id}` (`profilePath` của `profile-contract.ts`).
5. Enter không chọn mũi tên → mở kết quả đầu; `ArrowDown` + `Enter` → mở đúng dòng thứ nhất; `ArrowDown`×2 + `Enter` → dòng thứ hai; `ArrowUp` khi chưa chọn → dòng cuối, `ArrowDown` ở dòng cuối → quay về dòng đầu; combobox có `aria-activedescendant` trỏ option đang chọn. Bấm kính lúp = Enter.
6. `Escape` đóng listbox, giữ nguyên chữ trong ô; Tab đóng listbox.
7. Không khớp (`zzzz`) → dòng trạng thái `Không tìm thấy Sunner nào.`, không có option, không điều hướng.
8. TC `9e689933` (theo clarifications): `maxlength="100"`; gõ 101 ký tự → giá trị dài 100; 100 ký tự không có lỗi.
9. Rỗng / toàn khoảng trắng: Enter và bấm kính lúp không đổi URL, không listbox, không thông báo lỗi (`role="alert"` không có); log không có truy vấn rỗng (mẫu "câu mồi dương" ở trên).
10. Phản hồi cũ không ghi đè mới: `delaySearchRpc(request, sub, 800)`, gõ `Sunner Tester`, chờ log có lệnh đó, `delaySearchRpc(…, 0)`, xoá và gõ `Nguyễn Văn An`; chờ option của truy vấn mới, rồi chờ thêm `800 + 300`ms (chỗ duy nhất được chờ cố định: chờ một phản hồi mà fake giữ đúng 800ms) và khẳng định không có option `Sunner Tester`.
11. Lỗi server: helper mới `failSearchRpc(request, sub, on)` (mô phỏng `delaySearchRpc`: cờ theo `sub`, fake trả 500 kèm chuỗi `boom-secret-detail`) → dòng trạng thái lỗi chung `Không tìm kiếm được, hãy thử lại.`; trang không chứa `boom-secret-detail`; gõ lại sau khi tắt cờ thì hoạt động.
12. 375px: pill tìm kiếm nằm dưới A.1 (`top` lớn hơn đáy A.1), rộng bằng A.1 (±1px); không cuộn ngang; mở listbox: rộng bằng pill, mỗi option cao ≥44px, kính lúp ≥44×44; phần tử trên cùng tại giữa option đầu chính là option đó (không bị Highlight đè; kiểm cả ở 1440).
13. EN (`/en`): placeholder `Search for Sunner profile`, trạng thái `No Sunner found.`.

## Architecture
Chỉ test. Selector theo hợp đồng trong plan.md (thêm hằng `PROFILE_SEARCH` + chuỗi vào `tests/e2e/support/kudos-contract.ts`, xoá chuỗi tạm nếu 02a/02b chốt khác thì sửa ở 03).

## Related Code Files
- Tạo: `tests/e2e/sun-kudos-profile-search.spec.ts` (+ tách thứ hai nếu >200 dòng), `plans/261026-0834-kudos-profile-search/reports/e2e-red-evidence.md`.
- Sửa: `tests/e2e/support/kudos-contract.ts` (hằng + `failSearchRpc`), `tests/e2e/support/write-kudo-fixtures.mjs` (+ route điều khiển trong `fake-supabase-server.mjs` nếu control endpoint khai báo ở đó): chỉ thêm cờ `failSearch`, giữ nguyên hành vi cũ.
- Không xoá file; không sửa `playwright.config.ts`.

## Implementation Steps
1. `netstat -ano | findstr "3100 3101 3102 3103 54398"`: cổng phải trống (xem memory `e2e-stale-server-and-subagent-claims`).
2. Thêm cờ `failSearch` + helper; viết spec theo các ca trên.
3. `npm run test:e2e -- tests/e2e/sun-kudos-profile-search.spec.ts`; tắt server còn mở.
4. Ghi `redTestFiles`, `redCommand`, `redExitCode`, `redFailure` vào `reports/e2e-red-evidence.md`. RED hợp lệ = assertion hỏng vì thiếu combobox (`getByRole('combobox', …)` không thấy), không phải lỗi cổng/server/fake.
5. `npx tsc --noEmit`, `npm run lint`; `tests/e2e/write-kudo.spec.ts` vẫn xanh (fake đổi không phá route cũ).

## Todo List
- [x] Cờ `failSearch` + `failSearchRpc` — `reports/e2e-red-evidence.md` § Support changes
- [x] 13 ca trong spec (≤200 dòng/file) — 18 test case trên 2 file (`sun-kudos-profile-search.spec.ts` 169 dòng, `…-keyboard.spec.ts` 118 dòng); tách thứ hai theo phép của plan, xem Scope drift trong plan.md
- [x] RED exit ≠ 0 vì đúng lý do, evidence ghi đủ 4 trường — `reports/e2e-red-evidence.md`, `evidence/e2e-red-run.log` (`EXIT=1`, 18 failed)
- [x] tsc + lint sạch, `write-kudo.spec.ts` xanh — `reports/e2e-red-evidence.md` § Regression: 75 passed, tsc 0, lint 0

## Success Criteria
- [x] `redExitCode ≠ 0`, `redFailure` nêu "combobox không tồn tại" — exit 1, fail trên `getByRole('combobox', …)` (`reports/e2e-red-evidence.md`)
- [x] Không ca nào hỏng vì hạ tầng — ca lỗi build (SecurityFatalError) đã được retry, log cũ giữ trong `evidence/`
- [x] Đúng trường ca TC `1ce82447`, `d3877e54`, `9e689933` — có trong spec (`reports/e2e-red-evidence.md` § Contract)

## Risk Assessment
| Rủi ro | L/I | Cách đỡ |
|---|---|---|
| Ca debounce/"không có request" flaky | M/M | câu mồi dương; ca 10 là chỗ duy nhất chờ cố định |
| Ca trễ phụ thuộc thứ tự thật | M/M | chờ log có lệnh trễ trước khi đổi độ trễ; `expect.poll`, không sleep khác |
| Hằng chuỗi lệch với 02a/02b | M/L | chuỗi lấy từ hợp đồng plan.md; 03 chỉnh nếu cần, ghi vào evidence |

## Security Considerations
Ca 2/11 kiểm: không có email trong option, lỗi 500 không lộ chuỗi nội bộ, truy vấn gửi đã trim.

## Scope Contract
- **Changed:** tests/e2e (spec mới, `kudos-contract.ts`, fake: cờ `failSearch`).
- **Impacted:** mọi spec dùng fake Supabase (`write-kudo*`, `edit-kudo`, profile, hearts).
- **Will verify:** spec mới (RED, ở tầng E2E: nghiệm thu hành vi người dùng thấy) + `write-kudo.spec.ts` để chắc fake còn nguyên.
- **Deliberately skipped:** các spec còn lại (fake chỉ thêm cờ, không đổi route cũ); chạy đủ ở phase 03.

## Next Steps
Mở khoá 02a và 02b với `redTestFiles` / `redCommand` / `redExitCode` / `redFailure`.

## MoMorph refs:
- Sun* Kudos - Live board: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/MaZUn5xHXZ
- Clarifications: plans/261026-0834-kudos-profile-search/clarifications.md
- testPolicy: e2e-red-first
