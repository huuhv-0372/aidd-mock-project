# Phase 02b — Dữ liệu (migration, RPC, lib/admin, CSV, Server Action)

## Context Links
- [plan.md](plan.md), [clarifications.md](clarifications.md) (định nghĩa cột, quyết định)
- Mẫu SQL: `supabase/migrations/20261012133000_create_profiles.sql` (`is_allowed_account`, **trigger đăng nhập không được raise**), `20261015100000_create_kudos.sql` (`kudos_my_stats` ~dòng 482 = định nghĩa hearts; `kudos_person_json` = luật `distinct_senders`), `20261022100000_create_profile_rpcs.sql` (kiểu RPC đọc: security definer, `search_path = ''`, kiểm tài khoản trước, người bị từ chối nhận rỗng/null), `20261023100000_create_update_kudo_rpc.sql` (+ down, verify) làm mẫu header và verify
- Mẫu TS: `lib/profiles/get-current-profile.ts` (client tiêm được, không throw), `lib/kudos/get-kudos-board-data.ts` (`readBlock`), `lib/kudos/parse-kudos-filters.ts`, `lib/kudos/kudos-filter-href.ts`, `lib/kudos/update-kudo-action.ts` (Server Action + zod), `lib/kudos/hero-title.ts`, `lib/kudos/format-kudo-time.ts`

## Overview
- Priority: P2. Status: completed (2026-10-23). Owner: `implementer` (strong, vì RBAC + migration). Effort: 2.5h. Song song với 02a.
- Cột `profiles.role`, `is_admin()`, hai RPC, toàn bộ `lib/admin/*`, route CSV, Server Action, unit test. Không chạy build/E2E/SQL thật (SQL thật do chủ dự án ở phase 03).
- Kết quả (2026-10-23): completed (+ polish 1, fix 2); báo cáo `reports/impl-261023-02b-data.md`, `impl-261023-polish-1-data.md`, `impl-261023-fix-2-data.md`. SQL thật 24/24 PASS ở lần chạy thứ 3 (hai lần trước lỗi script). Lệch: 9 file unit (thêm export-route, get-is-admin); thêm `lib/admin/fetch-admin-users-for-export.ts`; export đọc theo khúc 1000.

## Key Insights
- Đây là phase **an toàn trọng yếu** (RBAC + migration + đổi dữ liệu): phase 03 chạy đầy đủ, không rút gọn.
- Cột mới `role text not null default 'user'` an toàn cho trigger đăng nhập vì: `handle_auth_user_profile` chỉ chèn `(id, email)`, `handle_auth_identity_profile` chỉ chèn `(id, email, full_name, avatar_url)`, cả hai nhánh `on conflict do update` chỉ set `email`/`full_name`/`avatar_url`/`updated_at` — không nhánh nào ghi hay đọc `role`, và mặc định luôn thoả ràng buộc kiểm. `add column ... default` (hằng) là thay đổi metadata trên PG ≥ 11, khoá `ACCESS EXCLUSIVE` rất ngắn trên `profiles`: chạy ngoài giờ cao điểm và **kiểm một lần đăng nhập Google thật** sau đó (như migration kudos).
- `profiles` không có policy ghi và `authenticated` chỉ có `grant select` (xác nhận trong migration profiles dòng 63-79): người dùng không ghi được `role` qua API; chỉ hàm security definer ghi. Verify phải chứng minh `update … set role` bị từ chối.
- `distinct_senders` loại Kudo ẩn danh (`kudos_person_json`): Level khớp hạng Hero trên Hồ sơ. Ngưỡng 1/5/10/21 nằm ở **một** chỗ trong SQL (CASE), kèm chú thích trỏ `hero-title.ts`; TS không lặp lại (SQL trả sẵn `level`), nên không thêm hàm TS chỉ để test dùng; verify SQL kiểm biên 0,1,4,5,9,10,20,21.
- Mọi thứ phía TS đọc vai trò qua RPC `is_admin()` (DB), không từ JWT → hạ quyền có hiệu lực ngay.
- Route handler nằm trong `app/[locale]/…` nên layout admin **không** bọc nó: tự kiểm admin.

## Requirements
**Migration `20261024100000_create_admin_users.sql`** (header như các file trước: Migration/Purpose/Prereq/How to run/CAUTION/Verify/Rollback, một transaction, chạy lại được):
1. `alter table public.profiles add column if not exists role text not null default 'user';` rồi `drop constraint if exists profiles_role_known` + `add constraint profiles_role_known check (role in ('user','admin'))`. Không backfill (mặc định đã là `user`).
2. `public.is_admin() returns boolean` — `stable security definer set search_path = ''`: `false` nếu `auth.uid()` null hoặc `is_allowed_account(jwt email, app_metadata)` không đạt; ngược lại `exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')`.
3. `public.admin_list_users(p_department text, p_level smallint, p_role text, p_search text, p_sort text, p_dir text, p_limit integer, p_offset integer)` — `stable security definer`, **`if not public.is_admin() then return; end if;`** đầu tiên (0 dòng, không lỗi). Cột trả về: `user_id, row_no, full_name, email, department, sent, received, hearts, level, badges, time_to_6_badges, last_sign_in_at, role, total_count, sum_sent, sum_received`.
   - Tính gộp một lần (join các bảng con đã `group by`, không truy vấn lồng từng dòng): `sent`/`received` (đếm `kudos`), `hearts` (`sum(hearts_awarded)` trên Kudo người đó gửi), `distinct_senders` (`count(distinct sender_id) filter (where not is_anonymous)` theo người nhận) → `level` bằng CASE (≥21→4, ≥10→3, ≥5→2, ≥1→1, else 0), `badges`/`time_to_6_badges` từ `secret_boxes` (`opened_at is not null`; `count(distinct badge)`; chỉ khi =6 lấy `max` của `min(opened_at)` theo huy hiệu), `last_sign_in_at` từ `auth.users`.
   - Lọc: `department = p_department`, `level = p_level`, `role = p_role`, search `ilike` trên `full_name` và `email` với mẫu `'%' || escaped || '%'` (thoát `\`, `%`, `_`; `btrim`, `left(…,100)`; rỗng = bỏ lọc). `p_level` ngoài 0..4 hoặc `p_role` lạ → 0 dòng (không lỗi).
   - Sắp xếp **không dùng SQL động**: `sort_key` số (đếm/level/epoch của thời gian) chọn bằng `CASE p_sort`; `order by (case when p_dir='asc' then sort_key end) asc nulls last, (case when p_dir='desc' then sort_key end) desc nulls last, created_at, id`. `p_sort`/`p_dir` lạ → thứ tự mặc định (`created_at, id` tăng dần).
   - `row_no = row_number() over (<cùng thứ tự>)` tính **trước** `limit/offset` (CTE `ranked`), rồi `where row_no > v_offset order by row_no limit v_limit`. `total_count`, `sum_sent`, `sum_received` = hàm cửa sổ `count/sum(...) over ()` trên tập đã lọc. `v_limit := least(greatest(coalesce(p_limit,20),1),5000)`, `v_offset := greatest(coalesce(p_offset,0),0)`.
4. `public.admin_set_user_role(p_user_id uuid, p_role text) returns text` — `volatile security definer`. Thứ tự: `pg_advisory_xact_lock(hashtext('admin_set_user_role'))` → `is_admin()` sai → `'forbidden'` → `p_user_id = auth.uid()` → `'self'` → `p_role` không thuộc `('user','admin')` → `'invalid'` → `update public.profiles set role = p_role, updated_at = now() where id = p_user_id` không có dòng → `'not_found'` → `'ok'`. (Khoá chống hai admin hạ nhau cùng lúc; `forbidden` đứng trước `self` để người thường không dò được gì.)
5. `revoke execute … from public, anon` và `grant execute … to authenticated` cho cả ba hàm.

**`supabase/rollbacks/20261024100000_create_admin_users_down.sql`**: drop ba hàm, drop constraint + cột `role` (cảnh báo mất vai trò admin đã gán), `begin/commit`, chạy lại được.

**`supabase/verify/20261024100000_create_admin_users_verify.sql`** (mỗi dòng PASS/FAIL, người dùng + Kudo tạm rồi rollback trong sub-block, giả `set local role` + `request.jwt.claims`, như verify profile): 
V1 cột `role` not null, mặc định `user`, check chặn `'root'`; V2 mô phỏng đường trigger đăng nhập (chèn `auth.users` tạm → profile có `role = 'user'`, không lỗi); V3 `authenticated` `update profiles set role` bị từ chối (`42501`) và `insert` bị từ chối; V4 `is_admin`: admin hợp lệ true, user false, admin nhưng JWT không đạt quy tắc tài khoản false, không claims false, `anon` execute bị `42501`; V5 `admin_list_users`: người thường 0 dòng, anon `42501`; V6 số liệu: `sent/received/hearts` khớp `kudos_my_stats` của cùng người, level đúng ở biên 0/1/4/5/9/10/20/21 và Kudo ẩn danh không tính, `badges` đếm huy hiệu khác nhau (trùng huy hiệu không tăng), `time_to_6_badges` null khi <6 và đúng `max(min)` khi =6, `last_sign_in_at` null; V7 lọc: phòng ban, level, role, search có `%` và `_` là ký tự thường, `\`, độ dài >100; V8 sắp xếp + `null` cuối + ổn định khi bằng nhau + `row_no` liên tục qua trang + `total_count`/`sum_*` cố định mọi trang + clamp `p_limit` (0, -5, 99999) và `p_offset` âm; V9 `admin_set_user_role`: `forbidden` (user), `self`, `invalid`, `not_found`, `ok` đổi `role` và `updated_at`, hạ quyền xong `is_admin` của người đó = false ngay, anon `42501`; V10 `sort`/`dir` lạ → thứ tự mặc định. Đồng thời in lệnh gán admin đầu tiên (comment) cho chủ dự án.

**lib/validation/admin-users.ts** (zod): `adminUserRowSchema` (khớp cột RPC), `adminUserFiltersSchema` (`unit` chuỗi ≤64 hoặc null, `level` 0-4, `role`, `q` trim ≤100, `sort`, `dir`, `page` int ≥1 kẹp ≤ 100000), `setUserRoleInputSchema` (`.strict()`: `userId: z.guid()`, `role: enum`). Giá trị sai thì rơi về mặc định (không ném lỗi, trang vẫn 200).

**lib/admin/**: `get-is-admin.ts` (`getIsAdmin(client?)` gọi RPC `is_admin`, mọi lỗi → log + `false`), `require-admin.ts` (`requireAdmin()`: bọc `cache()` quanh `getIsAdmin`, sai thì `forbidden()`), `parse-admin-user-filters.ts`, `admin-users-href.ts` (`adminUsersHref(partial)` bỏ giá trị mặc định, `adminExportHref(filters)` bỏ `page`; **an toàn cho client**, không import server), `get-admin-users.ts` (`getAdminUsers(filters, client?)`: RPC → zod → `AdminUsersPage` kèm `viewerId` từ `getClaims()`; lỗi → `{status:"error"}`; hàm lõi `fetchAdminUsers(filters, { limit, offset })` dùng lại cho export), `get-admin-department-codes.ts` (đọc bảng `departments`, lỗi → `null`), `format-admin-datetime.ts` (`dd/MM/yyyy` + `HH:mm`, múi giờ cố định `Asia/Ho_Chi_Minh`, không hợp lệ/null → `null`), `users-csv.ts` (`buildUsersCsv(rows): string` — BOM, CRLF, ô nguy hiểm thêm `'` đầu, bọc `"`), `set-user-role-action.ts` (`"use server"`: zod → RPC `admin_set_user_role` → ánh xạ `ok|forbidden|self|not_found|invalid`→`SetUserRoleResult`; lỗi RPC/ngoại lệ log và trả `server`; không trả `err.message`).

**Route `app/[locale]/admin/users/export/route.ts`** (`GET`): `getIsAdmin()` sai → 403 (thân rỗng/chữ chung); parse filter từ query (bỏ `page`); `fetchAdminUsers(filters, { limit: ADMIN_EXPORT_MAX_ROWS, offset: 0 })`; lỗi → 500 chung; `total` > `ADMIN_EXPORT_MAX_ROWS` → 413; thành công → `text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="users-YYYYMMDD.csv"`, `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`.

## Architecture
```
trang/Server Action/route ──(cookie, server client)──> RPC (security definer, is_admin() ở đầu)
 profiles + kudos + kudo_hearts + secret_boxes + auth.users --> hàng + total_count/sum_* --> zod --> AdminUsersPage
setUserRole: zod -> admin_set_user_role -> 'ok'|'forbidden'|'self'|'not_found'|'invalid' -> SetUserRoleResult -> (client) router.refresh()
export: filters(URL) -> fetchAdminUsers(limit 5000) -> buildUsersCsv -> Response(BOM + CRLF + guard)
```

## Related Code Files
**Tạo** (sở hữu 02b): 3 file SQL (migration, down, verify); `lib/validation/admin-users.ts`; `lib/admin/{get-is-admin,require-admin,parse-admin-user-filters,admin-users-href,get-admin-users,get-admin-department-codes,format-admin-datetime,users-csv,set-user-role-action}.ts`; `app/[locale]/admin/users/export/route.ts`; `tests/unit/{parse-admin-user-filters,admin-users-href,get-admin-users,users-csv,format-admin-datetime,set-user-role-action,admin-users-validation}.test.ts`
**Không đụng**: `lib/admin/admin-user-types.ts` và `lib/navigation/routes.ts` (controller; sai thì báo), `lib/validation/profile.ts` và `PROFILE_COLUMNS` (cố ý giữ nguyên), `components/**`, `messages/**`, `app/[locale]/admin/{layout,page}.tsx`, `app/[locale]/admin/users/page.tsx` (02a), `proxy.ts`, `tests/e2e/**`.

## Implementation Steps
1. Đọc contract kiểu và mẫu SQL; viết migration + down; soát tay: mọi hàm có `search_path = ''`, tên có schema, không SQL động, thứ tự kiểm quyền.
2. Viết verify theo V1-V10 (mẫu verify của profile/update-kudo); soát tay luật khớp fake của phase 01 (đọc `admin-users-fake.mjs`, không sửa).
3. zod + `lib/admin/*` + Server Action + route.
4. Unit test (TDD: ca trước mã): parse (mặc định, sai kiểu, `q` quá dài, `page` lạ), href (vòng khứ hồi với parse, bỏ mặc định, mã hoá `q` và `unit` chứa `&`/`#`/`%`), CSV (BOM, CRLF, 4 ký tự nguy hiểm + tab + CR, dấu phẩy/nháy/xuống dòng, tiếng Việt, null → rỗng), `get-admin-users` (RPC trả hàng, rỗng, lỗi zod, lỗi RPC → `error`, không throw), `set-user-role-action` (đầu vào sai không gọi RPC; ánh xạ đủ 5 kết quả + lỗi RPC → `server`; không lộ message), `format-admin-datetime`, zod.
5. `npx vitest run` đúng các file mới (phase 02b được chạy vitest trên file của mình, không build/E2E); báo cáo `reports/impl-261024-02b-data.md`.

## Todo
- [x] migration + down + verify
- [x] zod + `lib/admin/*`
- [x] Server Action + route CSV
- [x] unit (9 file + support)
- [x] báo cáo

## Success Criteria
- SQL: soát tay đủ checklist; verify có 10 nhóm kiểm (phase 03 chạy thật, mọi dòng PASS).
- Unit xanh; không file >200 dòng; không `err.message` nào ra client; không import server vào `admin-users-href.ts`.
- Chữ ký khớp phần "Chữ ký 02b" của phase 02a (không đổi tên/thứ tự tham số).

## Risk Assessment
- **Trigger đăng nhập hỏng vì cột mới (Thấp × Rất cao)**: mặc định hằng + check thoả sẵn + trigger không ghi `role`; verify V2; kiểm đăng nhập thật sau migration. Hoàn tác = file down.
- **Leo thang đặc quyền (Thấp × Rất cao)**: không policy ghi, `revoke`/`grant` tường minh, vai trò đọc từ DB, V3-V5/V9.
- **Mất admin cuối / race (Thấp × Cao)**: chặn `self` + khoá tư vấn; V9; thử tay hai phiên đồng thời ở phase 03 (tuỳ chọn).
- **Hiệu năng RPC (Thấp × Thấp)**: quét toàn bộ mỗi lần gọi; vài trăm người, chấp nhận; có chỉ mục sẵn `kudos_sender_id_idx`, `kudos_recipient_id_idx`, `secret_boxes_owner_id_idx`. Đo ở phase 03 nếu dữ liệu thật lớn.
- **Lệch fake ↔ SQL (Trung × Trung)**: verify SQL và fake phản chiếu cùng danh sách luật; phase 03 đối chiếu.
- **CSV injection (Trung × Trung)**: `'` đầu ô + unit; BOM không làm hỏng cột đầu.
- **Route CSV quên kiểm admin vì layout không bọc (Trung × Cao)**: kiểm tường minh + E2E 403.

## Security Considerations
- RBAC chỉ ở DB: `is_admin()` ở đầu mọi RPC admin; `anon` không có `execute`; kiểm tài khoản (`is_allowed_account`) trong `is_admin`.
- Không để lộ khác biệt "không tồn tại" và "không có quyền" ngoài mức cần: người thường luôn `forbidden`/0 dòng; `self` chỉ trả cho admin.
- Server Action: Origin tự kiểm của Next; thêm zod `.strict()`; `userId` là guid. Route GET chỉ đọc, `no-store`, không CORS.
- Không log email/tên; log lỗi chỉ mã. Không dùng service-role (`admin.ts` không tồn tại, không cần).
- Gán admin đầu tiên bằng SQL thủ công, ghi vào docs; không có đường API tạo admin đầu tiên.

## Next Steps
Cùng 02a hợp nhất ở phase 03: build, E2E, chủ dự án chạy migration + verify thật, gán admin đầu tiên.
