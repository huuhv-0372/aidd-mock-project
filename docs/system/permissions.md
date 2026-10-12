---
status: implemented
authored_by: takumi
created: 2026-10-09
lang: vi
---

# Permissions

**Project**: aidd-mockproject — SAA 2025
**Generated**: 2026-10-09
**Analysis Scope**: Bản nháp từ feature countdown-prelaunch-gate (cổng truy cập theo thời gian trước giờ mở sự kiện). Mã quyền (PERM###): TBD (draft) — cấp khi đối chiếu với mã nguồn thực tế.

> **Curated, plain-language view.** Tài liệu cho PM, BA và khách hàng đọc hiểu quyền truy cập mà không cần xem mã. Ma trận PERM### thô nằm ở permissions-matrix.md và do bước đối chiếu sau khi code xong sinh ra; bản nháp này không ghi mã nào.

## Authorization System Type

**System Type**: other

Có một cổng theo thời gian (kiểu env-gate), đăng nhập Google qua Supabase giới hạn email `@sun-asterisk.com`, và bảng `profiles` có RLS; chưa có vai trò hay chủ sở hữu tài nguyên. Phân quyền theo vai trò sẽ do các feature nghiệp vụ bổ sung sau.

**Identified Roles**:
- Visitor — mọi người truy cập, đã hoặc chưa đăng nhập; cổng theo thời gian không phân biệt
- Người đã đăng nhập — có phiên Supabase hợp lệ, tức tài khoản Google có email `@sun-asterisk.com`; ngoài việc bị đưa khỏi trang đăng nhập, người này đọc được bảng hồ sơ `profiles` (qua RLS) mà Visitor không đọc được

## Curated View

- **Visitor** trước giờ mở sự kiện chỉ xem được trang đếm ngược và tài nguyên tĩnh (ảnh, giao diện); mọi trang khác đều bị đưa về trang đếm ngược.
- **Visitor** sau giờ mở sự kiện không còn xem được trang đếm ngược, mở trang này sẽ được đưa thẳng sang trang đăng nhập; các trang khác không bị cổng chặn nữa.
- **Người đã đăng nhập** mở trang đăng nhập (sau giờ mở) được đưa sang trang chủ `/`; trang đăng nhập và các trang khác vẫn mở cho người chưa đăng nhập, chưa có trang nào đòi phiên.
- **Tài khoản ngoài tên miền** (Google khác `@sun-asterisk.com`, hoặc đăng ký bằng email/điện thoại/ẩn danh) không đăng nhập được: tài khoản mới bị cơ sở dữ liệu từ chối khi tạo; tài khoản đã có từ trước cổng bị đăng xuất ngay tại `/auth/callback`. Cả hai trường hợp người dùng chỉ thấy thông điệp lỗi chung ở `/login`.
- **Hồ sơ người dùng (`profiles`)** chỉ đọc được bởi người đã đăng nhập đạt quy tắc tài khoản (mọi hồ sơ, không chỉ của mình, để các tính năng sau như Kudos hiện người gửi/nhận); không ai ghi được từ trình duyệt; Visitor chưa đăng nhập không đọc được gì.

## Access Boundaries

Ranh giới của các trang là thời gian chứ không phải danh tính: không có ngoại lệ cho quản trị viên hay người đã đăng nhập, và cổng chạy trước mọi kiểm tra phiên (phiên chỉ được làm mới sau khi qua cổng). Trang đếm ngược công khai, không cần đăng nhập. Việc người dùng được làm gì sau khi đăng nhập thuộc các feature khác. Riêng quyền vào hệ thống thì có ranh giới danh tính: chỉ email `@sun-asterisk.com` đăng nhập bằng Google.

## Special Conditions

- **Cổng theo thời gian (env-gate):** quyết định bằng mốc bắt đầu sự kiện đặt khi triển khai (`EVENT_START_AT`, ISO 8601 kèm +07:00), so theo thời điểm tuyệt đối; đổi mốc cần triển khai lại hoặc đổi cấu hình.
- **Khi mốc thiếu hoặc sai:** coi như sự kiện đã bắt đầu, cổng không khóa gì và lỗi được ghi phía máy chủ. Đây là chọn lựa không khóa khi lỗi, nên cần xem log khi triển khai.
- **Phạm vi:** áp dụng cho mọi route của ứng dụng trừ trang đếm ngược và tài nguyên tĩnh (`_next/static`, `_next/image`, `images/`, `favicon.ico`, `robots.txt`, `sitemap.xml`), thực thi ở `proxy.ts` (Next.js 16). Chỉ dùng Web API để sau này chạy được trên Cloudflare Workers; chưa triển khai lên Cloudflare. Tài nguyên tĩnh mới đặt ngoài các đường dẫn trên sẽ bị cổng chặn trước giờ mở.
- **Phiên đăng nhập:** làm mới ở `proxy.ts` bằng `getClaims()` (kiểm chữ ký, không đọc cookie thô). Thiếu hoặc sai biến Supabase thì ghi log và coi mọi người là chưa đăng nhập; không trang nào bị khóa vì lỗi này. Sau đăng nhập luôn về `/`, không nhận địa chỉ đích từ client. Bảng dữ liệu duy nhất là `public.profiles` (RLS bật, SELECT cho người đã đăng nhập đạt quy tắc tài khoản, không policy ghi) theo migration `supabase/migrations/20261012133000_create_profiles.sql`, chạy tay trong Supabase SQL Editor; cần tắt provider Email, Phone, Anonymous trước khi chạy. Trạng thái đã áp dụng lên project thật cần kiểm bằng file verify.
- **Đề xuất ADR:** ghi lại lý do chọn cổng theo thời gian đặt ở lớp chặn request, và chọn không khóa khi cấu hình lỗi, vào một ADR trong `docs/decisions/` (do người viết, không sinh tự động).
