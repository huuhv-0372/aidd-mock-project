# Phase 01 — E2E RED

## Context Links
- [plan.md](plan.md), [clarifications.md](clarifications.md), ảnh `figma/admin-user-773-26403.png`
- Mẫu: `plans/261022-edit-kudo/plan.md` phase 01; `tests/e2e/support/profile-fixtures.mjs` (RPC giả phản chiếu SQL), `kudo-hearts-fake.mjs` (điều khiển GET theo `?sub=`), `authed-session.ts` (`signIn`, mint có `?sub=`)

## Overview
- Priority: P2. Status: completed. Owner: tester. Effort: 1h. Phụ thuộc: controller đã viết `lib/admin/admin-user-types.ts` + hằng route.
- Kết quả (2026-10-23): completed. RED 37/39 fail đúng lý do; hồi quy 49/49; báo cáo `reports/tester-261023-red.md`. Lệch: 7 file spec thay vì 2, kèm `admin-users-dataset.mjs` và `admin-users-helpers.ts`.
- Viết spec **đỏ** trước khi có code (test_policy `e2e-red-first`) kèm Supabase giả cho ba RPC. RED hợp lệ = fail vì thiếu route/UI (404, thiếu phần tử), không phải lỗi cú pháp hay fake sai; ghi báo cáo ở `reports/tester-261023-red.md` (số ca fail, exit code, hồi quy các spec cũ vẫn xanh).

## Key Insights
- Server "authed" 3103 dùng fake Supabase 54398; người gọi nhận biết bằng `sub` của JWT. Vai trò admin của người gọi do điều khiển GET `/__admin-mode?sub=<sub>&role=admin|user` (mặc định `user`), cùng kiểu `/__kudo-*`. Không có đường tắt ở code production.
- Fake là **hợp đồng đôi của SQL**, không phải SQL: phản chiếu đúng luật (lọc, tìm, sắp xếp, `null` cuối, `row_no`, tổng cửa sổ, level theo `distinct_senders`, tự đổi vai trò = `self`, người không phải admin = 0 dòng / `forbidden`). SQL thật được chứng minh ở phase 03.
- `fake-supabase-server.mjs` gọi các RPC theo chuỗi `profileRpc`, `writeKudoRpc`…: thêm một dòng gọi `adminRpc(fn, body, sub)` (trước `kudosRpc`) và một dòng cho `adminControl`.

## Requirements
Tập dữ liệu giả (`admin-users-fake.mjs`): ~45 người, xác định, tên tiếng Việt có dấu, ≥1 email dài, một người có `time_to_6_badges` và `last_sign_in_at` null, đủ cả bốn hạng + hạng 0, 2 admin (người gọi là một trong số đó khi ở chế độ admin, dòng của mình có `user_id = sub`), 3 phòng ban. Kết quả: 3 trang (20, 20, 5).

Ca kiểm (mỗi ca một lý do hỏng riêng, không trùng):
1. **Truy cập**: khách → `/login`; người thường mở `/admin`, `/admin/users` → **HTTP 403** (trang "Truy cập bị từ chối") và **không** có email nào trong HTML; admin mở `/admin` → về `/admin/users`.
2. **Khung**: header (nhãn "Admin", 4 tab, "User" `aria-current`, 3 tab kia `aria-disabled` và không đổi URL khi bấm), tiêu đề "User", nút Export, 3 bộ lọc + ô Search, 12 cột đúng thứ tự, đúng chữ; footer. Số ở "(N)" = tổng toàn kết quả lọc.
3. **Dữ liệu dòng**: định dạng `dd/MM/yyyy` + `HH:mm` giờ VN, null → "-", Total Heart màu đỏ, Role chữ, ID = `row_no`.
4. **Sắp xếp**: click cột → `?sort=…&dir=desc`, `aria-sort`, thứ tự đúng, click lại đảo, null cuối, trang quay về 1.
5. **Lọc/tìm**: chọn Unit/Level/Role và gõ Search (debounce) → URL có tham số, danh sách + tổng + số trang đổi đúng; ký tự `%`/`_` trong ô tìm là chữ thường; xoá lọc về URL gốc; tham số URL sai (`level=9`, `dir=x`, `page=-1`, `q` quá dài) bị bỏ/kẹp, trang vẫn 200.
6. **Phân trang**: 20 dòng/trang, trang 2/3, nút trước/sau, `aria-current`, giữ lọc và sắp xếp; `page` quá lớn → trạng thái rỗng kèm link về trang 1.
7. **Đổi vai trò**: "…" mở menu (bàn phím: Enter, mũi tên, Esc, trả focus); mục "đổi thành Admin"/"đổi thành User" → hộp xác nhận (Esc/Hủy không gọi RPC); xác nhận → dòng đổi vai trò, có toast/trạng thái; **dòng của chính mình không có mục đổi vai trò** (nút "…" bị ẩn/disabled kèm lý do); RPC từ chối (`forbidden`, `not_found`, lỗi 500 giả) → thông điệp chung, dòng giữ nguyên.
8. **Export**: bấm Export tải `users-*.csv`; bắt đầu bằng BOM UTF-8; header cố định; số dòng = toàn bộ kết quả lọc (không phải 20); ô độc hại (`=cmd`, `+1`, `-1`, `@x`) có `'` đầu; tên có dấu phẩy/nháy bọc đúng; người thường gọi URL trực tiếp → 403; khách → về `/login`.
9. **Menu tài khoản**: admin thấy "Dashboard" (giữa Profile và Sign out, link `/admin`); người thường không có (giữ ca hiện hữu "chỉ 2 mục"); Dashboard dẫn tới `/admin/users`.
10. **VI/EN**: chữ giao diện đổi theo `NEXT_LOCALE`; tiêu đề cột giữ tiếng Anh ở cả hai.
11. **Mobile 375**: trang không cuộn ngang (`scrollWidth <= clientWidth`), bảng cuộn ngang trong khung riêng, nút "…" và Export ≥44px, bộ lọc xếp dọc.

## Architecture
```
spec -> authed server 3103 -> proxy (phiên, default-deny) -> /admin/** (layout is_admin) -> fake Supabase
fake: /__admin-mode?sub&role  (điều khiển)   rpc/is_admin | rpc/admin_list_users | rpc/admin_set_user_role
```
Dữ liệu vào: URL tham số; ra: bảng. Fake giữ vai trò đã đổi theo `sub` người gọi trong bộ nhớ, `/__admin-mode?reset=1` dọn giữa các ca (ca chạy song song dùng `sub` riêng mỗi test).

## Related Code Files
- Tạo: `tests/e2e/admin-users.spec.ts` (ca 1-6, 9-11), `tests/e2e/admin-users-actions.spec.ts` (ca 7-8; tách để mỗi file <200 dòng), `tests/e2e/support/admin-users-contract.ts` (selector, chữ vi/en, tên cột, hằng), `tests/e2e/support/admin-users-fake.mjs` (`adminRpc`, `adminControl`, dữ liệu)
- Sửa: `tests/e2e/support/fake-supabase-server.mjs` (chỉ thêm hai lời gọi, không đổi hành vi cũ)
- Không đụng: mọi file ngoài `tests/e2e/**`; `homepage-account-menu.spec.ts` giữ nguyên (ca người thường vẫn đúng).

## Implementation Steps
1. Đọc contract kiểu của controller; viết `admin-users-contract.ts` trước (02a/02b dựa vào đây).
2. Viết fake + nối vào server giả; tự kiểm bằng node nhỏ (không build) rằng ba RPC trả đúng dạng cột.
3. Viết spec theo ca; mỗi ca có comment tham chiếu mục trong clarifications.
4. Chạy `npm run build` rồi `npx playwright test admin-users` **một lần** (phase này là phase duy nhất ngoài 03 được chạy E2E) để xác nhận đỏ đúng lý do; chạy hồi quy `homepage-account-menu`, `error-pages`, `profile` để chứng minh fake mới không phá spec cũ.
5. Ghi báo cáo RED.

## Todo
- [x] contract + fake + nối server giả
- [x] 11 nhóm ca, mỗi file <200 dòng
- [x] RED đúng lý do, hồi quy xanh, báo cáo

## Success Criteria
- Spec mới fail hoàn toàn vì thiếu tính năng; spec cũ không đổi kết quả.
- Không ca nào chỉ kiểm lại điều đã được ca khác kiểm; không `waitForTimeout` mù (dùng `expect.poll`/chờ phần tử; ca debounce chỉ khẳng định kết quả cuối, không khẳng định "chưa có request").

## Risk Assessment
- Fake lệch SQL → ca xanh giả (Cao × Trung): phase 03 chạy SQL verify thật cho cùng các luật; fake ghi chú nguồn luật.
- E2E song song làm nhiễm trạng thái vai trò → mỗi test mint `sub` riêng.
- Nhớ bài học: server cũ trên 3100-3103 làm nhiễu E2E — kiểm cổng trống trước khi chạy.

## Security Considerations
Fake không được nới luật: người thường nhận 0 dòng/`forbidden`, `anon` bị từ chối; không có email thật trong fixture (`@sun-asterisk.com` giả).

## Next Steps
Mở khoá 02a và 02b (song song). Phase 03 chạy lại toàn bộ để GREEN.
