# Phase 01 — E2E RED gate

**Owner:** tester · **Priority:** P1 · **Status:** completed (RED exit 1, 10 fail / 11 pass, đúng lý do; `reports/e2e-red-evidence.md`) · **Effort:** 0.75h · test_policy: e2e-red-first

## Context
- Test cases `plans/momorph-specs/sun-kudos-live-board-MaZUn5xHXZ/test-cases.csv`: `7a7ec63e` (toggle), `91e102ba` (1 lượt/người), `63645b03` (Kudo của mình disabled), `31936b72` (x2 → chỉ verify SQL, phase 02).
- [clarifications.md](clarifications.md). Hạ tầng: `playwright.config.ts`, `tests/e2e/support/{fake-supabase-server.mjs,kudos-fixtures.mjs,kudos-contract.ts,authed-session.ts}`.
- Fixture đã có: `KUDOS[0]` của mình, `KUDOS[1]` đã tim, `KUDOS[2]` chưa tim (`sun-kudos-feed.spec.ts:90-96`).

## Files (sở hữu)
- Tạo: `tests/e2e/kudo-hearts.spec.ts`.
- Sửa: `fake-supabase-server.mjs` (route `POST /rest/v1/rpc/set_kudo_heart`; tách `kudo-hearts-fake.mjs` nếu file > 200 dòng), `kudos-contract.ts` (tên RPC, chuỗi lỗi), `sun-kudos-feed.spec.ts:90-96` (role `img` → `button`, `aria-pressed`).

## Fake phải giống SQL
- `{p_kudo_id, p_liked}`: không đăng nhập/sai domain → `22023 forbidden`; id lạ → `22023 not_found`; Kudo của mình → `22023 own_kudo`; ngược lại đặt trạng thái idempotent, cập nhật `heart_count` + `liked_by_me` trong fixture (để tải lại trang thấy kết quả), trả `[{liked, heart_count}]`.
- Ghi log mọi lần gọi (payload) để test kiểm số lần gọi; có công tắc ép lỗi 500 / 22023 cho ca hoàn lại.

## Ca test (RED trước)
1. Bấm tim Kudo chưa tim: xám → đỏ, số +1, `aria-pressed=true`; đúng **1** lần gọi RPC với `{p_kudo_id, p_liked:true}`. Bấm lại: đỏ → xám, số −1, payload `p_liked:false`.
2. Tải lại trang: trạng thái giữ nguyên (fake đã lưu).
3. Đồng bộ: Kudo có ở cả Highlight và feed → bấm ở một thẻ, thẻ kia đổi số + màu.
4. Kudo của mình: nút `disabled`, bấm không gọi RPC (đếm = 0).
5. Bấm nhanh 2 lần: nút khoá khi chờ → chỉ 1 lần gọi; trạng thái cuối khớp server.
6. Lỗi server: số + màu về như cũ, toast lỗi hiện (`role=status`), nút mở lại.
7. Thẻ nạp thêm qua infinite scroll cũng thả tim được.
8. Bàn phím: Tab tới nút, Space/Enter đổi trạng thái.

## Steps
1. Viết route fake + spec. 2. Kiểm port 3100–3102 sạch. 3. `npm run test:e2e -- tests/e2e/kudo-hearts.spec.ts tests/e2e/sun-kudos-feed.spec.ts`.
4. Ghi `reports/e2e-red-evidence.md`: `redTestFiles`, `redCommand`, `redExitCode`, `redFailure` (phải fail vì chưa có nút, không vì config/server).

## Success
Exit ≠ 0 đúng lý do; mọi spec khác vẫn xanh (fake chỉ thêm route).
