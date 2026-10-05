# Clarifications — F001 Countdown Prelaunch Screen

## Session 2026-10-05

- Q: Target datetime cho countdown lấy từ đâu — API (như spec gốc màn Countdown ghi) hay biến môi
  trường (như spec Homepage SAA ghi)? → A: Biến môi trường `NEXT_PUBLIC_EVENT_START_AT`
  (ISO-8601, Asia/Ho_Chi_Minh). Lý do: mốc thời gian là cấu hình vận hành tĩnh, không cần backend
  riêng chỉ để trả về 1 giá trị. (Quyết định bởi agent, ghi tại technical-spec.md D1 — không chặn
  tiến độ, có thể đảo lại nếu sau này cần đổi mốc không redeploy.)
- Q: Cơ chế "khóa điều hướng" (FR5/FR6) triển khai ở tầng nào? → A: Next.js `middleware.ts` ở
  root, áp dụng toàn site, so sánh thời gian hiện tại với target datetime từ cùng biến môi trường
  trên. (technical-spec.md D2.)
- Q: Test policy cho screen này — `e2e-red-first` hay `visual-contract`? Spec có mô tả hành vi
  navigation (khóa/mở khóa điều hướng), nhưng project chưa có bất kỳ test runner nào (không
  Playwright, không Vitest/Jest) — chỉ có `.env.test.example` trỏ tới `playwright.config.ts` chưa
  tồn tại. → A: **`visual-contract`**. User xác nhận không scaffold runner ở task này; verify
  bằng build + kiểm tra thủ công. Thiết lập Playwright là việc riêng, làm sau khi thực sự cần test
  E2E.
- Q: Trường "tên ẩn danh" khi gửi Kudos ẩn danh dùng để làm gì? → **Chưa trả lời, out of scope cho
  plan này** (thuộc màn "Viết Kudo", không phải Countdown). Giữ nguyên trong backlog của màn đó.

## Test Policy (ghi theo momorph-development.md)

- `testPolicy: visual-contract`
- `testRunner: none` — chưa có project E2E runner
- `redTestFiles: []`
- `redCommand: not-applicable`
- `redExitCode: not-applicable`
- `redFailure: not-applicable`
- `redEvidence: not-applicable (visual-contract)`
