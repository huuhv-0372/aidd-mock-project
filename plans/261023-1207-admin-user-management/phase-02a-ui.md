# Phase 02a — UI (vỏ admin, bảng, bộ lọc, hành động)

## Context Links
- [plan.md](plan.md), [clarifications.md](clarifications.md), ảnh `figma/admin-user-773-26403.png`, contract E2E `tests/e2e/support/admin-users-contract.ts` (từ phase 01, chỉ đọc)
- MoMorph: fileKey `9ypp4enmFmdK3YAFJLIu6C`, screenId `-u1lKib0JL` (Figma `773:26403`), chính sách `e2e-red-first` (không có spec/test case); menu tài khoản `54rekaCHG1`
- Code mẫu: `components/site-shell/*` (header, `AccountMenu`, `use-dismissable`), `components/kudos/kudos-filter-dropdown.tsx`, `components/kudos-compose/use-modal-dialog.ts`, `components/ui/language-selector.tsx`, `lib/kudos/parse-kudos-filters.ts` + `kudos-filter-href.ts` (mẫu lọc trên URL)
- Controller phải đọc `momorph-implement-design/references/momorph-workflow.md` và truyền khối uỷ quyền MoMorph vào prompt (rule `momorph-awareness.md`).

## Overview
- Priority: P2. Status: completed (2026-10-23). Owner: `momorph-ui-implementer` (Track theo workflow, ảnh duy nhất). Effort: 3h. Chạy **song song** với 02b, sau RED.
- Dựng phần nhìn thấy và hành vi client của `/admin/users`, đọc dữ liệu qua hàm 02b (chữ ký ở dưới), không tự gọi Supabase.
- Kết quả (2026-10-23): completed (+ polish 1, fix 2); báo cáo `reports/ui-261023-admin-users.md`. Lệch: nhãn header đúng 2 dòng nowrap; menu "…" đặt lại vị trí khi cuộn; controller sửa 1 locator (nhãn bộ lọc qua `aria-labelledby`) và bỏ gợi ý Role sr-only.

## Key Insights
- Sắp xếp và phân trang là **link** (`<Link href={adminUsersHref(...)}>`) nên bảng là Server Component, không cần JS. Chỉ ba lá `"use client"`: bộ lọc + tìm kiếm (debounce), menu "…" + hộp xác nhận, và (nếu cần) mục Dashboard đã nằm trong `AccountMenu` có sẵn.
- Nút Export là `<a href={adminExportHref(filters)} download>`: không client, tải qua route 02b.
- Header admin khác header công khai (logo + "Admin", 4 tab, không có nav Awards/Kudos) nên là component riêng `admin-header`, nhưng **dùng lại** `LanguageSelector`, `NotificationButton`, `AccountMenu`. Footer chỉ một dòng chữ `shell.footer.copyright` giữa trang.
- `forbidden()` phải chạy trước khi stream (không `Suspense` bên trên layout/page) để status thật là 403; `await connection()` trước helper nuốt lỗi cookies (bài học PPR).
- Ảnh không có mobile/trạng thái rỗng/xác nhận/lỗi: tự thiết kế nhẹ, dùng token và kiểu modal có sẵn (modal `<dialog>` như Viết Kudo), đánh dấu `not from Figma`.

## Requirements
Chức năng:
- `/admin` → `redirect(ADMIN_USERS_PATH)`; `/admin/users` hiển thị bảng, bộ lọc, Export, phân trang theo trạng thái URL.
- Bộ lọc: Unit (50 mã từ `getAdminDepartmentCodes()`, kèm "Tất cả"), Level 0-4, Role User/Admin; chọn xong đẩy URL bằng `adminUsersHref({...filters, x, page: 1})`; Search debounce 300 ms, Enter gửi ngay, nút kính lúp; dropdown mở bằng bàn phím, Esc đóng, `aria-expanded`/`role="listbox"`.
- Bảng: 12 cột đúng thứ tự Figma; `<th scope="col" aria-sort>`; sort link ở 7 cột, tên truy cập "Sắp xếp theo {cột}"; dòng của người gọi (`user_id === viewerId`) không có hành động đổi vai trò (nút "…" disabled kèm `aria-label` giải thích); email `break-all`; null → "-"; Total Heart chữ đỏ (token có sẵn hoặc `text-red-500`, đối chiếu ảnh).
- Menu "…": `role="menu"`, một mục "Đổi thành Admin"/"Đổi thành User" → hộp xác nhận (Hủy / Xác nhận, hiện tên + email người bị đổi, focus vào Hủy) → gọi `setUserRole`; thành công → `router.refresh()` + toast `status-toast`; lỗi → dòng `role="alert"` trong hộp (theo `error`: `forbidden`, `self`, `not_found`, `validation`, `server`), hộp giữ nguyên. Đang chờ → nút khoá, chống bấm đúp.
- Trạng thái: rỗng ("Không có người dùng phù hợp" + link xoá lọc / về trang 1), lỗi đọc (`role="alert"` một dòng chung, giữ khung trang như Hồ sơ).
- Tab: "User" `aria-current="page"`; Overview/Review content/Settings là `<span aria-disabled="true">` không focus-điều-hướng, không `href`.
- Menu tài khoản: `AccountMenu` nhận thêm `dashboardLabel?` + `dashboardHref?`; có thì chèn mục "Dashboard" (`role="menuitem"`, `Link` tới `ADMIN_PATH`) giữa Profile và Sign out. `HeaderSessionControls` gọi `getIsAdmin()` và chỉ truyền khi `true`; người thường vẫn đúng 2 mục. Cập nhật chú thích đầu file `account-menu.tsx` (hiện ghi "không có Admin Dashboard").
- i18n: `messages/vi/admin.ts` + `messages/en/admin.ts`, đăng ký ở cả hai `index.ts`; `shell.account.dashboard` thêm ở cả hai ngôn ngữ (en khai báo `Dictionary` nên thiếu khoá là lỗi biên dịch).

Phi chức năng: mỗi file <200 dòng; mobile-first (khung bảng `overflow-x-auto`, bảng `min-w-[1280px]`; bộ lọc xếp dọc dưới `md`; tab xuống hàng dưới `lg`); mục chạm ≥44px (`min-h-11 min-w-11`); `focus-visible:`; animation bọc `motion-safe:`; không thêm thư viện; tab order hợp lý.

## Architecture
```
app/[locale]/admin/layout.tsx  --requireAdmin()--> AdminShell(header, main, footer)
app/[locale]/admin/users/page.tsx
   parseAdminUserFilters(searchParams) -> getAdminUsers(filters) -> AdminUsersView
   AdminUsersView = title + ExportLink + AdminUsersFilters(client) + AdminUsersTable + AdminPagination
AdminUsersTable (server) -> SortableHeaderCell(Link) , AdminUserActionsMenu(client) -> RoleChangeDialog -> setUserRole -> router.refresh()
```
Dữ liệu vào: `AdminUsersPage` + `AdminUserFilters` + `viewerId`; ra: URL mới (filter/sort/page) hoặc Server Action đổi vai trò.
`viewerId`: `getAdminUsers` trả kèm, hoặc đọc từ claims bằng helper 02b `getViewerId()`; chốt trong contract (xem 02b) — mặc định `AdminUsersPage.viewerId`.

Chữ ký 02b mà 02a **gọi** (không tự viết): `requireAdmin(): Promise<void>`; `getIsAdmin(client?): Promise<boolean>`; `parseAdminUserFilters(raw): AdminUserFilters`; `getAdminUsers(filters): Promise<AdminUsersPage>`; `getAdminDepartmentCodes(): Promise<string[] | null>`; `adminUsersHref(partial: Partial<AdminUserFilters>): string`; `adminExportHref(filters): string`; `formatAdminDateTime(iso: string | null): { date: string; time: string } | null`; `setUserRole(input): Promise<SetUserRoleResult>`.

## Related Code Files
**Tạo** (sở hữu 02a):
- `app/[locale]/admin/layout.tsx`, `app/[locale]/admin/page.tsx`, `app/[locale]/admin/users/page.tsx`
- `components/admin/`: `admin-shell.tsx`, `admin-header.tsx`, `admin-nav-tabs.tsx`, `admin-footer.tsx`, `admin-users-view.tsx`, `admin-users-filters.tsx`, `admin-filter-dropdown.tsx` (chỉ nếu `kudos-filter-dropdown` không tái dùng được; không sửa file đó), `admin-users-table.tsx`, `sortable-header-cell.tsx`, `admin-user-actions-menu.tsx`, `role-change-dialog.tsx`, `admin-pagination.tsx`, `admin-export-link.tsx`, `admin-icons.tsx`
- `messages/vi/admin.ts`, `messages/en/admin.ts`
**Sửa**: `messages/vi/index.ts`, `messages/en/index.ts`, `messages/vi/shell.ts`, `messages/en/shell.ts`, `components/site-shell/account-menu.tsx`, `signed-in-controls.tsx`, `header-session-controls.tsx`
**Không đụng**: `lib/**`, `supabase/**`, `tests/**`, `proxy.ts`, `lib/navigation/routes.ts` (controller đã thêm hằng), `app/[locale]/admin/users/export/**` (02b).

## Implementation Steps
1. Đọc ảnh, contract E2E, các mẫu ở Context Links; đo header/bảng/bộ lọc từ ảnh (header cao ~88px, bảng x 80→1360, cột và màu) và ghi bảng đo vào báo cáo.
2. `messages` + đăng ký; `shell.account.dashboard`.
3. `AccountMenu` + `HeaderSessionControls` (Dashboard chỉ admin).
4. Vỏ admin: layout (`await connection()`, `requireAdmin()`), header, tab, footer.
5. Trang + view + bảng + sort link + phân trang + Export link (server).
6. Lá client: bộ lọc/tìm, menu "…", hộp xác nhận.
7. Responsive + a11y + EN; tự rà `data-testid` khớp contract (không sửa contract; thiếu thì báo controller).
8. Báo cáo `reports/ui-261024-admin-users.md` (không build, không E2E; có thể `npx tsc --noEmit` hoặc `npx eslint` trên file đã sửa nếu nhanh).

## Todo
- [x] messages vi/en + đăng ký, dashboard ở menu tài khoản
- [x] layout/vỏ admin/trang/redirect
- [x] bảng + sort + phân trang + Export link
- [x] bộ lọc + tìm (debounce) + menu "…" + hộp xác nhận
- [x] mobile 375 + focus + aria + báo cáo

## Success Criteria
- Mọi `data-testid`/chữ trong contract tồn tại; không file >200 dòng; không `"use client"` ngoài ba lá nêu trên.
- Khung 1440 khớp ảnh: vị trí header/tab/bộ lọc/bảng/nút Export, chữ, màu; phần lệch có ghi trong báo cáo.
- Phase 03 xanh `admin-users*.spec.ts` mà không cần sửa selector.

## Risk Assessment
- Hai agent sửa cùng file (Thấp): danh sách sở hữu tách rời; `account-menu.tsx` chỉ 02a.
- Nút "…" của chính mình bị lộ thành hành động (Trung × Cao): UI ẩn **và** RPC chặn (`self`); E2E ca 7 kiểm cả hai.
- Dropdown tự viết kém a11y (Trung): theo mẫu `AccountMenu`/`kudos-filter-dropdown` (bàn phím, `useDismissable`).
- Bảng rộng làm trang cuộn ngang mobile (Trung): khung `overflow-x-auto`, E2E ca 11.
- Đổi `AccountMenu` ảnh hưởng mọi trang (Trung): ca hiện hữu "chỉ Profile + Sign out" vẫn phải xanh.

## Security Considerations
- UI chỉ là tiện lợi; quyền do 02b/DB quyết. Không render email trong HTML cho người không phải admin (layout `forbidden()` trước khi dựng).
- Không `dangerouslySetInnerHTML`; tên/email render dạng chữ. Không đưa `userId` hay email vào log client.
- Server Action gọi qua form/`startTransition`, nhận `{ userId, role }`, không tin kết quả UI.

## Next Steps
Đợi 02b (cùng hợp đồng). Phase 03 hợp nhất, build, chạy E2E, so ảnh.
