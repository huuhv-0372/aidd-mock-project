---
title: "Module Admin và màn Admin - User"
description: "Khu /admin chỉ cho vai trò admin: bảng người dùng (lọc, tìm, sắp xếp, phân trang, xuất CSV) và đổi vai trò User/Admin qua RPC."
status: completed
priority: P2
effort: 8h
branch: feature.new.admin_user
tags: [feature, ui, figma, i18n, database, security]
blockedBy: []
blocks: []
created: 2026-10-23
work_type: feature
test_policy: e2e-red-first
spec_waived: "SDD mode disabled (takumi.sddMode: off)"
---

# Admin - User

MoMorph `-u1lKib0JL` (Figma `773:26403`, fileKey `9ypp4enmFmdK3YAFJLIu6C`, **không có spec/test case**). Ảnh: `figma/admin-user-773-26403.png` (1440 rộng). Có spec cho menu tài khoản: MoMorph `54rekaCHG1` (Profile / Dashboard / Logout, Dashboard chỉ admin). Quyết định và giả định: [clarifications.md](clarifications.md). GitHub issue #21 (PR sẽ ghi `Closes #21`). Liên quan: `261022-edit-kudo` (mẫu chia phase), `261021-profile` (luật `distinct_senders`).

| # | Phase | Owner | Effort | Status |
|---|-------|-------|--------|--------|
| 01 | [E2E RED](phase-01-e2e-red.md): `tests/e2e/admin-users.spec.ts`, `support/admin-users-contract.ts`, `support/admin-users-fake.mjs` (RPC giả `is_admin`, `admin_list_users`, `admin_set_user_role`) | tester | 1h | completed (RED 37/39 fail đúng lý do, 2 ca khách→/login vốn xanh; hồi quy 49/49; [báo cáo](reports/tester-261023-red.md)) |
| 02a | [UI](phase-02a-ui.md): vỏ admin, trang, bảng, bộ lọc, phân trang, menu "…" + hộp xác nhận, mục Dashboard ở menu tài khoản, messages vi/en | momorph-ui-implementer | 3h | completed (+ polish 1, fix 2; [báo cáo](reports/ui-261023-admin-users.md)) |
| 02b | [Dữ liệu](phase-02b-data.md): migration `20261024100000_create_admin_users` (+ down, verify), `lib/admin/*`, zod, Server Action đổi vai trò, route xuất CSV, unit | implementer (strong) | 2.5h | completed (+ polish 1, fix 2; [02b](reports/impl-261023-02b-data.md), [polish](reports/impl-261023-polish-1-data.md), [fix 2](reports/impl-261023-fix-2-data.md)) |
| 03 | [GREEN + visual + SQL thật + review + docs](phase-03-green-verify-docs.md) | tester + reviewer + doc-writer | 1.5h | completed (GREEN 3: vitest 1054/1054, E2E 356/356; review SEALED 9; riskGate ký; docs 4 file; issue #21; commit `78a17b6` + `cad306e`, PR #22) |

02a / 02b song song sau RED, file tách rời (danh sách ở từng phase); không agent nào build hay chạy E2E (chỉ phase 03).

## Hợp đồng giữa các phase
- Controller viết trước, trước khi cho 01/02a/02b chạy: `lib/admin/admin-user-types.ts` (`AdminUserRow`, `AdminUserFilters`, `AdminUsersPage`, `SetUserRoleResult`, `ADMIN_USER_SORT_KEYS`, `ADMIN_PAGE_SIZE = 20`, `ADMIN_EXPORT_MAX_ROWS = 5000`) và hằng `ADMIN_PATH = "/admin"`, `ADMIN_USERS_PATH = "/admin/users"` trong `lib/navigation/routes.ts`.
- Tham số URL của `/admin/users`: `unit` (mã phòng ban), `level` (0-4), `role` (`user`|`admin`), `q` (≤100), `sort` (`sent`|`received`|`hearts`|`level`|`badges`|`time6`|`last_login`), `dir` (`asc`|`desc`), `page` (≥1). Giá trị mặc định thì bỏ khỏi URL. 02b: `parseAdminUserFilters(raw)` + `adminUsersHref(partial)`; 02a chỉ gọi, không tự ghép URL.
- RPC (02b viết, 01 giả lập, cùng tên và cột): `is_admin() → boolean`; `admin_list_users(p_department, p_level, p_role, p_search, p_sort, p_dir, p_limit, p_offset)` → mỗi dòng có `user_id, row_no, full_name, email, department, sent, received, hearts, level, badges, time_to_6_badges, last_sign_in_at, role, total_count, sum_sent, sum_received`; `admin_set_user_role(p_user_id, p_role) → text` (`ok|forbidden|self|not_found|invalid`).
- `AdminUsersPage = { status: "ok"; rows; total; sumSent; sumReceived; viewerId } | { status: "error" }`. Chữ ký đầy đủ các hàm 02b mà 02a gọi: [phase-02a-ui.md](phase-02a-ui.md) mục Architecture (không đổi tên/thứ tự tham số khi chưa báo controller).
- Server Action `setUserRole({ userId, role })` → `SetUserRoleResult`; UI chỉ hiển thị theo `error`, không nhận chữ từ server.
- Xuất CSV: `GET /admin/users/export?<cùng tham số lọc, bỏ page>` (route handler dưới `app/[locale]/admin/users/export/`, không đụng `proxy.ts`). Cột CSV cố định tiếng Anh theo Figma.
- E2E (01): `support/admin-users-contract.ts` là nguồn selector và chữ; 02a/02b chỉ đọc. Tiền tố `data-testid="admin-*"` do contract định nghĩa.

## Ước lượng
~8h, ~40 file (≈26 mới). Doc: README, changelog, permissions, codebase-summary, system-architecture.

## Rủi ro (chi tiết ở từng phase)
- Leo thang đặc quyền (người thường tự thành admin, gọi RPC trực tiếp) → mở: `role` không có policy ghi, mọi RPC kiểm `is_admin()` trong DB, vai trò đọc từ DB mỗi lần (không nhét vào JWT); SQL verify.
- Lộ email/dữ liệu cho người không phải admin → mở: RPC trả 0 dòng, trang `forbidden()` (403), route CSV 403.
- Cột `role NOT NULL` làm hỏng trigger đăng nhập → mở: có mặc định `'user'`, trigger không bao giờ ghi `role`; kiểm một lần đăng nhập Google thật sau migration.
- Khoá admin cuối cùng / hai admin hạ nhau cùng lúc → mở: chặn tự đổi vai trò + khoá tư vấn giao dịch trong RPC.
- CSV injection → mở: tiền tố `'` + unit test.
- Kích thước Worker gzip (hiện 2258 KiB) → mở: không thêm thư viện mới.

## Hoàn tác
Mỗi phase độc lập: 01 xoá file test; 02a/02b revert commit; SQL: `supabase/rollbacks/20261024100000_create_admin_users_down.sql` (bỏ RPC, `is_admin`, cột `role`; mất vai trò admin đã gán, gán lại bằng SQL).

## Done quan sát được
Admin mở `/admin/users` thấy bảng khớp ảnh 1440; non-admin nhận HTTP 403; đổi vai trò người khác có xác nhận và dòng cập nhật; dòng của mình không có hành động đổi vai trò; xuất CSV mở đúng trong Excel; `admin-users.spec.ts` xanh, E2E đầy đủ, vitest, lint, build, SQL verify thật đều PASS.

## Kết quả (2026-10-23)
- **Đã xong:** 01, 02a (+ polish 1, fix 2), 02b (+ polish 1, fix 2), 03, docs (README, changelog, permissions, codebase-summary), issue #21. Trên cây: vitest 1054/1054, tsc 0, lint 0, build ok (lần đầu dừng ở cảnh báo Next 16.4.0, chạy lại thì pass), `admin-users-actions` ×10 50/50, `admin-users` ×3 117/117, full E2E 356/356, 0 flaky. Commit `78a17b6` (feat) + `cad306e` (docs), PR #22 (`Closes #21`, chờ merge).
- **SQL thật (chủ dự án, 2026-10-23):** migration chạy ok. Verify lần 1 lỗi trong script (`pg_catalog.unnest(a,b,c)` nhiều mảng → lỗi `rows from`). Lần 2 V4 FAIL do artifact script (PL/pgSQL cache biểu thức đơn giản một lần mỗi transaction, `vau_call` dùng `execute`). Lần 3 24/24 PASS. Ảnh: `reports/sql-verify-261023-run2-pass-1.png`, `reports/sql-verify-261023-run2-pass-2.png`; isolation read committed, không override (`reports/sql-isolation-261023.png`).
- **Review:** lượt 1 REWORK 8, 0 Critical (H1 export bị cắt ở db-max-rows; M1 tim của Kudo ẩn danh, chủ dự án chọn loại trừ; các Low) → polish 1 → re-review 1 REWORK 9 (concurrency chưa được chứng minh; 2 Low mới) → chủ dự án cho sửa 2 Low + ghi isolation → re-review 2 SEALED 9, 0 Critical (`reports/reviewer-261023-*`). L1 (Promise.all ở header) không làm: `is_admin` bị revoke với anon, khách vào `/` sẽ sinh lỗi 42501.
- **riskGate:** chủ dự án ký 2026-10-23 (`evidence/inspection-verdict.json` humanSignedOff true). Evidence gate hard SEALED exit 0.
- **Quyết định của chủ dự án:** Level = hạng Hero 0-4; nút "…" = đổi User↔Admin có xác nhận, không đổi chính mình; tab khác `aria-disabled`; phân trang server 20/trang; Total Heart loại Kudo ẩn danh (khác `kudos_my_stats`); CSV giữ dấu phẩy; sửa 2 Low của re-review trước commit.
- **Lệch kế hoạch:**
  - Export: route đọc theo khúc 1000 dòng, toàn bộ hoặc không có gì (`lib/admin/fetch-admin-users-for-export.ts`); từ chối `userId` lặp.
  - Hàng menu "…" đặt lại vị trí khi cuộn, chỉ đóng khi nút ra khỏi viewport hoặc khỏi hộp bảng (sửa race E2E).
  - Header: nhãn đúng 2 dòng, nowrap.
  - E2E: 7 file spec thay vì 2; thêm `admin-users-dataset.mjs`, `admin-users-helpers.ts`. Controller sửa 1 locator (nhãn bộ lọc qua `aria-labelledby`), bỏ gợi ý Role sr-only.
  - Unit: 9 file thay vì 7 (thêm export-route, get-is-admin).
  - Tên báo cáo ghi ngày 261023 (plan ghi 261024): `ui-261023-admin-users.md`, `impl-261023-02b-data.md`, `tester-261023-green-1..3.md`, `reviewer-261023-*`.
  - Worker gzip 2347.94 KiB (main 2258.47, +89.5 KiB). Vượt ngưỡng "≤ 2258" đặt ở phase 03; vẫn dưới giới hạn 3 MiB của Worker free. Chưa có quyết định chấp nhận.
  - Docs: README, changelog, permissions, codebase-summary.
  - Effort thực tế: chưa ghi nhận.
- **Lệch visual, owner chấp nhận:** phân trang + 20 dòng/trang (không có trong Figma); "(N)" = tổng số lọc sống; hàng tiêu đề 64.5 so với 65px; "Kudos (642)" 85 so với 83px. Layout 375/768 tự thiết kế (không có Figma).
- **Deferred (không chặn):**
  - Vai trò đọc được với mọi người đã đăng nhập (owner chấp nhận).
  - Kiểm Excel: dấu phẩy trong CSV (owner).
  - Bộ lọc Unit rỗng cho tới khi `profiles.department` có dữ liệu.
  - Trang Overview/Review content/Settings; audit đổi vai trò; nhập phòng ban; `next` sau đăng nhập cho `/admin`.
  - Nâng Next 16.4.0 hay không (build dừng cảnh báo lần đầu): chủ dự án.
- **Còn lại (chưa đóng):**
  1. Gán admin đầu tiên bằng SQL, kiểm `is_admin()` bằng tài khoản của mình; đăng nhập Google thật sau migration (trigger không hỏng). Chưa có ghi nhận. Owner: chủ dự án. Xong khi có kết quả ghi vào reports.
  2. Worker gzip vượt ngưỡng 2258 KiB đã đặt. Owner: controller hỏi chủ dự án, chọn chấp nhận (ghi vào plan) hoặc giảm. Xong khi có quyết định ghi vào plan.
  3. Thử hai phiên đồng thời với `admin_set_user_role` (tuỳ chọn trong phase 02b, reviewer ghi concurrency unproven). Owner: controller. Xong khi có kết quả hoặc ghi chấp nhận rủi ro.
  4. Commit + PR `Closes #21`: xong (PR #22, chờ merge).
- **Ước lượng thực tế:** chưa ghi nhận (plan ~8h: 1 + 3 + 2.5 + 1.5).
- **Rủi ro:**
  - Leo thang đặc quyền → **đóng**: SQL 24/24 (V3-V5, V9), E2E 403 và 0 dòng, riskGate ký.
  - Lộ email cho người không phải admin → **đóng**: E2E 403 không có email trong HTML; SQL V5; route CSV 403. Vai trò đọc được là Deferred.
  - Fake lệch SQL nên E2E xanh giả → **đóng**: SQL thật 24/24 chứng minh các luật.
  - Cột `role` làm hỏng trigger đăng nhập → **mở**: SQL V2 PASS trong block rollback; đăng nhập Google thật chưa ghi nhận (Còn lại 1).
  - Khoá admin cuối / hai admin hạ nhau cùng lúc → **mở**: chặn `self` + advisory lock + SQL V9 PASS; chưa có thử hai phiên đồng thời (Còn lại 3).
  - CSV injection → **đóng**: unit + E2E ca 8. Excel chưa kiểm (Deferred).
  - Kích thước Worker → **mở**: 2347.94 KiB, vượt ngưỡng đã đặt, dưới 3 MiB (Còn lại 2).
  - Không có admin sau migration → **mở**: chờ bước gán admin (Còn lại 1).
  - Cảnh báo Next 16.4.0 làm build dừng lần đầu → **mở**: chủ dự án quyết (Deferred).
