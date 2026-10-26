# Clarifications — Module Admin, màn Admin - User

MoMorph (fileKey `9ypp4enmFmdK3YAFJLIu6C`): "Admin - User" `-u1lKib0JL` (Figma `773:26403`), **không có spec, không có test case**. Chỉ có ảnh `figma/admin-user-773-26403.png` (1440 rộng, cao ~1780). Frame liên quan chỉ có thiết kế: Dropdown level `hb4kPwSKkk`, Dropdown Role `GLgos3fOmz`, Dropdown list phòng ban `eFStQCJZaQ`, Dropdown search user admin `BFf3J-wRPk`. Có spec cho menu tài khoản admin: `54rekaCHG1` "Dropdown-profile Admin" (Profile / Dashboard / Logout; Dashboard chỉ admin; route được bảo vệ).

## Ảnh thiết kế (đọc trực tiếp từ png)

- **Nền trang** xám trung bình, chữ tiêu đề "User" cỡ lớn (~48px) ở góc trái, nút **Export** vàng nhạt (chữ tối) ở góc phải cùng hàng. Khối nội dung rộng 1280 (x 80 → 1360).
- **Header** cao ~88px, nền xám đen: logo SAA 2025 + nhãn "Admin" màu vàng; bốn tab **Overview / Review content / User / Settings**, "User" đang chọn (chữ vàng, gạch chân vàng); bên phải chuông (chấm đỏ), cờ VN + "VN" + mũi tên, nút tài khoản (khung vuông bo, icon người).
- **Bộ lọc** (nhãn nhỏ phía trên, ô trắng bo góc, mũi tên đen): **Unit** "Chọn phòng ban" (~259 rộng), **Level** "Chọn Level" (~136), **Role** "Chọn Role" (~123); ô **Search** (~259, kính lúp bên phải) nằm sát phải.
- **Bảng** nền xanh đen gần như đen, chữ trắng, đường kẻ ngang mảnh. 12 cột: ID, User (tên, xuống dòng), Email (ngắt giữa từ), **∑ sent Kudos (100)**, **∑ Received Kudos (100)**, **Total Heart** (số đỏ), Level, Number of Badges, **Time to get 6 Badges**, **Last Logged in** (hai dòng `dd/MM/yyyy` và `HH:mm`), Role ("Admin" / "User" chữ thường), Actions (nút tròn "…"). Icon sắp xếp (hai mũi tên) ở sent, received, heart, level, badges, time6, last login; **không** có ở ID, User, Email, Role, Actions. Mẫu: 16 dòng, dòng 1 là Admin, số Level có cả 5 (xem quyết định 1). Dòng cao 70-85px tuỳ số dòng của tên.
- **Chân trang** chữ giữa "Bản quyền thuộc về Sun* © 2025". Không có thanh phân trang, không hộp xác nhận, không trạng thái rỗng/lỗi trong ảnh.

## Quyết định của chủ dự án (đã chốt, không hỏi lại)

1. **Level = hạng Hero** theo số người gửi khác nhau (`distinct_senders`, không tính Kudo ẩn danh, đúng luật `kudos_person_json` / `heroTier` trong `lib/kudos/hero-title.ts`): 0 chưa có, 1 New (1-4), 2 Rising (5-9), 3 Super (10-20), 4 Legend (≥21). Bộ lọc Level có 5 lựa chọn 0..4. Ảnh mẫu có "5" chỉ là số giả, bỏ qua.
2. **Actions "…"** = menu đổi vai trò User ↔ Admin kèm bước xác nhận. Admin **không** đổi được vai trò của chính mình (tránh mất admin cuối).
3. **Tab khác** (Overview, Review content, Settings) hiển thị nhưng `aria-disabled`, không điều hướng. `/admin` chuyển sang `/admin/users`.
4. **Phân trang phía server 20 dòng/trang**, thanh phân trang dưới bảng, kiểu theo bảng (**không có trong Figma: lệch được chủ dự án chấp nhận**). Lọc, tìm, sắp xếp chạy trong SQL; trạng thái nằm trên URL, kiểm bằng zod. Export = CSV toàn bộ kết quả đã lọc và sắp xếp (không chỉ trang hiện tại).
5. **Mọi người dùng hiện có là `user`**; chỉ `admin` vào được `/admin`. Admin đầu tiên do chủ dự án chạy SQL tay có ghi trong tài liệu: `update public.profiles set role = 'admin' where email = '...';`.

## Quyết định của planner (sửa nếu sai)

- **Vai trò đọc từ DB, không từ JWT.** `public.is_admin()` (security definer) đọc `profiles.role` của `auth.uid()` và đòi thêm `is_allowed_account` từ JWT. Hạ quyền có hiệu lực ngay, không chờ token hết hạn. Header menu tài khoản gọi `getIsAdmin()` (RPC `is_admin`), **không** thêm `role` vào `profileSchema`/`PROFILE_COLUMNS` (khác gợi ý ban đầu): `getCurrentProfile` chưa có trang nào dùng, thêm cột bắt buộc chỉ làm vỡ fixture unit mà không có lợi.
- **Cổng kiểm**: ba lớp, không tin client. (1) `proxy.ts` đã đưa khách sang `/login` (mọi path ngoài `PUBLIC_PATHS`). (2) `app/[locale]/admin/layout.tsx` gọi `requireAdmin()` rồi `forbidden()` (HTTP 403, trang 403 sẵn có), trang con kiểm lại vì layout không chạy lại khi điều hướng mềm. (3) RPC tự kiểm `is_admin()` trong DB. Route CSV và Server Action cũng tự kiểm (layout không bọc route handler). Cả layout và trang gọi `await connection()` trước (bài học PPR/cookies).
- **Đích sau đăng nhập**: giữ nguyên danh sách cho phép `/sun-kudos/<guid>` của `parsePostLoginNext` (không thêm `/admin`): nới danh sách là việc nhạy cảm, lợi ích nhỏ. Khách mở `/admin/users` về `/login` trơn, đăng nhập xong về `/`, admin bấm Dashboard.
- **Route xuất CSV đặt tại `app/[locale]/admin/users/export/route.ts`** (URL công khai `/admin/users/export`), không phải `app/api/…`: proxy chỉ bỏ qua segment `auth` khi rewrite locale, nên `/api/*` sẽ bị rewrite thành `/vi/api/*` và 404. Phương án thay thế (thêm `api` vào `UNLOCALIZED_SEGMENTS`) sửa file proxy dùng chung, không cần thiết. GET chỉ đọc nên không cần kiểm Origin; vẫn kiểm admin, `Cache-Control: no-store`, `Content-Disposition: attachment`, tên file `users-YYYYMMDD.csv`.
- **Định nghĩa cột** (SQL, một chỗ): `sent` = số Kudo người đó gửi (kể cả ẩn danh: chỉ là số tổng, không liệt kê Kudo nào); `received` = số Kudo nhận; **`hearts` = tổng `hearts_awarded` trên Kudo người đó GỬI** (đúng `kudos_my_stats`); `badges` = số huy hiệu khác nhau đã mở (`secret_boxes.opened_at is not null`, `count(distinct badge)`, tối đa 6); `time_to_6_badges` = lúc huy hiệu thứ 6 lần đầu được mở = `max` của `min(opened_at)` theo từng huy hiệu, chỉ khi đủ 6 loại, ngược lại `null` (hiển thị "-"); `last_sign_in_at` = `auth.users.last_sign_in_at` (`null` → "-").
- **ID hiển thị = số thứ tự trong kết quả đã lọc và sắp xếp** (`row_no`, tính trong SQL, liên tục qua các trang, CSV cùng quy tắc). Không ổn định khi đổi lọc/sắp xếp; ảnh mẫu 1..16 liên tục nên khớp. Phương án thay thế (số thứ tự theo `created_at` của profile) có khoảng trống khi lọc, nhìn lệch ảnh.
- **Sắp xếp**: khoá `sent|received|hearts|level|badges|time6|last_login`. Click cột chưa chọn → giảm dần; click lại → đảo chiều. Mặc định (không có `sort`) = `profiles.created_at` tăng dần. Mọi trường hợp bằng nhau thì `created_at, id` để thứ tự ổn định giữa các trang; `null` luôn xuống cuối.
- **Số trong tiêu đề "(100)"** = **tổng cột đó trên toàn bộ kết quả đã lọc** (`sum_sent`, `sum_received`, cửa sổ `sum() over ()`), không phải hằng 100 như ảnh. Kết quả rỗng thì hiện 0. Total Heart không có số trong ảnh nên không thêm.
- **Tìm kiếm**: tên hoặc email, `ilike` chứa chuỗi; `%`, `_`, `\` được thoát; cắt sau 100 ký tự (zod), trim, chuỗi rỗng = không lọc; debounce 300 ms ở client rồi đổi URL.
- **Giới hạn xuất 5.000 dòng**: nếu `total_count` > 5.000 thì route trả 413 (không cắt im lặng). Trình duyệt hiện "tải thất bại": chấp nhận, vì thực tế người dùng chỉ hàng trăm.
- **CSV**: UTF-8 có BOM (Excel đọc đúng tiếng Việt), CRLF, ô nào bắt đầu bằng `=`, `+`, `-`, `@`, tab hoặc CR thì thêm `'` đầu ô, ô chứa `"`/`,`/xuống dòng thì bọc `"` và nhân đôi `"`. Cột cố định tiếng Anh: `ID, Name, Email, Sent Kudos, Received Kudos, Total Heart, Level, Badges, Time to get 6 Badges, Last Logged in, Role`. Ngày `dd/MM/yyyy HH:mm` giờ `Asia/Ho_Chi_Minh` (cùng cách `format-kudo-time.ts` cố định múi giờ).
- **Race hai admin hạ quyền nhau cùng lúc** (đều không phải "tự đổi") có thể về 0 admin: `admin_set_user_role` lấy `pg_advisory_xact_lock` rồi mới kiểm `is_admin()`, nên giao dịch thứ hai thấy mình đã mất quyền và trả `forbidden`. Luôn còn ≥1 admin vì người gọi không tự hạ được.
- **Chữ**: vi = chữ Figma nguyên văn (tiêu đề cột Figma là tiếng Anh nên giữ ở cả hai ngôn ngữ), placeholder "Chọn phòng ban/Level/Role" ↔ en "Select unit/level/role"; chữ không có trong Figma (hộp xác nhận, lỗi, trạng thái rỗng, phân trang, nhãn aria) là bản nhóm tự viết, đánh dấu `not from Figma` trong messages. Mục menu tài khoản "Dashboard" lấy từ spec `54rekaCHG1`.
- **Responsive** (không có frame mobile): mobile-first; bảng giữ `min-width` ~1280 trong khung `overflow-x-auto` (trang không cuộn ngang), bộ lọc xếp dọc dưới `md`, vùng chạm ≥44px, `focus-visible`. Tab điều hướng xuống hàng riêng dưới `lg` như `SiteHeader`.
- **Test policy**: e2e-red-first (đã có `spec_waived`).

## Giả định mở (cần chủ dự án xác nhận, mặc định đã chọn)

1. **Bộ lọc Unit sẽ trống trên production**: `profiles.department` luôn `null` (trigger đăng nhập không bao giờ ghi, chỉ seed demo có). Bảng không có cột Unit nên không lộ ra. Mặc định: vẫn làm bộ lọc (lọc đúng `department`, 50 mã từ bảng `departments`), ghi chú vào docs; không làm UI sửa phòng ban.
2. **Nhãn lựa chọn Level**: frame `hb4kPwSKkk` không có spec. Mặc định `0 · Chưa có`, `1 · New`, `2 · Rising`, `3 · Super`, `4 · Legend` (tên lấy từ chữ hạng Hero có sẵn trong `messages/*/kudos.ts` nếu có, thiếu thì thêm); cột Level trong bảng chỉ hiện số như ảnh.
3. **`profiles.role` đọc được bởi mọi người dùng miền** qua RLS hiện có (policy chọn mọi dòng cho tài khoản hợp lệ), tức ai cũng thấy ai là admin, **giống `email` đang lộ sẵn**. Không thu hẹp bằng cấp quyền theo cột (sẽ làm vỡ mọi `select *` về sau, lệch YAGNI). Nếu cần giấu, tách việc riêng.
4. **Admin thấy tổng số Kudo gửi gồm cả Kudo ẩn danh** (chỉ số tổng, không lộ Kudo hay người nhận). Nếu cần loại ẩn danh khỏi "sent", đổi một điều kiện trong SQL.
5. **Không có nhật ký đổi vai trò** (audit): YAGNI. Ghi `console.error` khi lỗi; `updated_at` của profile được cập nhật. Cần audit thì thêm bảng ở feature sau.
6. **Một lần chạy migration trên Supabase thật** như các migration trước (chạy tay, role `postgres`); chủ dự án chạy file verify và gán admin đầu tiên trước khi phase 03 kiểm tay.

## Câu hỏi chưa giải quyết được từ mã

- Export có cần theo ngôn ngữ giao diện (tiêu đề cột vi) không? Mặc định tiếng Anh cố định.
- Có cần email cảnh báo / thông báo cho người bị đổi vai trò không? Mặc định không.
- Màu và kích thước chính xác của header admin (xám đen) khác header công khai: phase 02a đo từ ảnh, nếu sai lệch thì chủ dự án quyết.

## Session 2026-10-23 (sau review lượt 1)

- Q: Total Heart có cộng tim trên Kudo ẩn danh người đó gửi không? (review M1: số tim từng Kudo công khai, admin trừ dần đoán được người gửi ẩn danh) → A: **Loại Kudo ẩn danh** — `hearts` = tổng `hearts_awarded` trên Kudo người đó gửi **công khai** (`not is_anonymous`). Cố ý khác `kudos_my_stats` (ô tim trên trang Kudos của chính người đó vẫn gồm cả ẩn danh). `sent` vẫn đếm cả ẩn danh (giả định 4 giữ nguyên).
- Q: CSV dùng dấu phẩy, Excel locale tiếng Việt có thể dồn một cột → A: **Giữ dấu phẩy**, chủ dự án mở thử bằng Excel thật ở bước kiểm tay; sai thì đổi sau.
- Q: Xuất CSV bị PostgREST `db-max-rows` (mặc định 1000) cắt im lặng (review H1) → A (controller): route lấy theo từng khúc 1000 dòng bằng `offset` cho tới đủ `total` (≤ 5000), không cắt im lặng.

## Session 2026-10-23 (SQL thật, lượt 1)

- Migration chạy thành công trên Supabase thật. Verify lượt 1 dừng ở S2 vì `pg_catalog.unnest(a, b, c)`: unnest nhiều mảng chỉ là cú pháp FROM khi viết trần → đổi 4 chỗ sang `rows from (...)`.
- Verify lượt 2: S1-V6b PASS, **V4 FAIL** (`anon` gọi `is_admin()` ra `false`, mong 42501). S1 (has_function_privilege anon = false) PASS nên quyền thật đúng; lỗi ở script: biểu thức đơn giản PL/pgSQL giữ trạng thái executor cả transaction, quyền EXECUTE chỉ kiểm ở lần gọi đầu (authenticated). Sửa `vau_call` dùng `execute` cho `is_admin` và `set_role` (V9 anon cùng lỗi). Ảnh: reports/sql-verify-261023-run1-v4-fail.png. Chờ chạy lại.
- Chủ dự án duyệt GitHub issue → #21.
- Verify lượt 3 (sau khi sửa `vau_call`): **24/24 PASS** trên Supabase thật (S1-S4, V1a-V10; V4 anon = 42501, V9 anon = 42501). Ảnh: reports/sql-verify-261023-run2-pass-1.png, -2.png.
- Mức cô lập trên Supabase thật (review lần hai yêu cầu, cho tiêu chí "hai admin hạ nhau cùng lúc"): `default_transaction_isolation` = `read committed`, không role nào override, `admin_set_user_role.proconfig` chỉ có `search_path=""`. Ảnh: reports/sql-isolation-261023.png.
- Owner chọn sửa luôn 2 Low của review lần hai: export trả 500 khi userId lặp giữa các khúc; menu "…" đóng khi nút bị khung bảng che. GREEN 3: vitest 1054/1054, full E2E 356/356 ([báo cáo](reports/tester-261023-green-3.md)).
- riskGate: chủ dự án ký duyệt 2026-10-23 (AskUserQuestion, phạm vi migration + cổng /admin + lib/admin + menu tài khoản); evidence/inspection-verdict.json humanSignedOff true.
