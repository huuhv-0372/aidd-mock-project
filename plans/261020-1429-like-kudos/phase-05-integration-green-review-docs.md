# Phase 05 — Tích hợp, GREEN, thử thật, review, docs

**Owner:** implementer + tester (+ reviewer, doc-writer) · **Priority:** P1 · **Status:** completed (GREEN, review SEALED 9, docs; migration + verify 7/7 PASS trên Supabase thật 2026-10-20 và một lượt thả tim thật; issue #10) · **Effort:** 1.5h

## Steps
1. Nối action thật vào provider (`page.tsx`). `tsc` 0, lint 0.
2. Tester (Scope Contract bên dưới): `npm test`; `npm run build`; `npm run test:e2e` toàn bộ (fake đổi → chạy rộng); `kudo-hearts.spec.ts --repeat-each=5` (0 flaky). Kiểm port sạch trước/sau.
3. Visual (Playwright MCP): thẻ feed + Highlight ở 1440 và 375, trạng thái xám/đỏ/focus; so Figma `I3127:21871;256:5175` (vị trí, cỡ chữ không đổi so với #11).
4. **Thử thật ngay** (trước review): người dùng chạy migration + verify phase 02, đăng nhập Google, thả/bỏ tim một Kudo người khác, kiểm `select * from kudo_hearts where user_id = …` và sidebar người gửi. Ghi `reports/db-verify-result.md`.
5. OpenNext build + wrangler dry-run: Worker gzip vẫn < 3072 KiB.
6. Review 1 lượt (template reviewer); sửa Critical/High; evidence gate `--stage hard` (echo đủ mọi tiêu chí, temper-results chỉ từ lần chạy cuối trên code đóng băng); riskGate cần người ký.
7. Docs (doc-writer): RPC `set_kudo_heart` vào `docs/system/permissions.md`, `README.md`, `docs/codebase-summary.md`, mục changelog 2026-10-20.

## Scope Contract
- **Changed:** RPC mới ghi `kudo_hearts`; Server Action mới; `KudoHearts` thành nút client; provider bọc board; toast tách ra `components/ui`.
- **Impacted:** thẻ Highlight + feed (`sun-kudos*.spec.ts`), Copy Link toast, infinite scroll, `kudos_my_stats`.
- **Will verify:** verify SQL trên Supabase thật (data mutation → safety-critical, chạy đủ); unit action; full E2E (fake + contract đổi); repeat spec mới.
- **Deliberately skipped:** màn Homepage/Hệ thống giải/Viết Kudo chỉ chạy trong full E2E, không test riêng — không dùng file nào bị sửa.

## Tiêu chí nghiệm thu
1. Bấm tim Kudo người khác: tim đỏ, số +1; bấm lại: xám, số −1 (`7a7ec63e`).
2. Mỗi người chỉ 1 lượt tim / Kudo; bấm lặp không cộng thêm (`91e102ba`).
3. Kudo mình gửi: nút tim disabled, không gọi server (`63645b03`).
4. Mỗi lượt tim cộng 1 tim cho người gửi; ngày đặc biệt cộng 2; bỏ tim thu hồi đúng 1 hoặc 2 (`31936b72`, verify H4).
5. Hai thẻ cùng Kudo (Highlight + feed) đồng bộ ngay.
6. Lỗi server: trạng thái hoàn lại + thông báo chung; không lộ lỗi nội bộ.
7. Ghi chỉ qua RPC; bảng `kudo_hearts` vẫn không đọc/ghi thẳng được; anon bị từ chối.

## Success
Unit + full E2E xanh, verify SQL PASS thật, thử thật OK, review không còn Critical, docs cập nhật. Commit chờ người dùng duyệt (không push).
