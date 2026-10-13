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

Có một cổng theo thời gian (kiểu env-gate), đăng nhập Google qua Supabase giới hạn email `@sun-asterisk.com`, mặc định chặn người chưa đăng nhập (default-deny: chỉ `/login`, `/auth/callback`, `/countdown` là công khai), và bảng `profiles` có RLS; chưa có vai trò hay chủ sở hữu tài nguyên (menu tài khoản của trang chủ vì thế không có Admin Dashboard). Phân quyền theo vai trò sẽ do các feature nghiệp vụ bổ sung sau.

**Identified Roles**:
- Visitor — người chưa đăng nhập; cổng theo thời gian không phân biệt Visitor với người đã đăng nhập, nhưng sau giờ mở bước kiểm phiên chỉ cho Visitor vào `/login`, `/auth/callback`, `/countdown`
- Người đã đăng nhập — có phiên Supabase hợp lệ, tức tài khoản Google có email `@sun-asterisk.com`; mở được trang chủ `/` và các route khác, bị đưa khỏi trang đăng nhập, đọc được bảng hồ sơ `profiles` (qua RLS) mà Visitor không đọc được

## Curated View

- **Visitor** trước giờ mở sự kiện chỉ xem được trang đếm ngược và tài nguyên tĩnh (ảnh, giao diện); mọi trang khác đều bị đưa về trang đếm ngược.
- **Visitor** sau giờ mở sự kiện không còn xem được trang đếm ngược, mở trang này sẽ được đưa thẳng sang trang đăng nhập; cổng theo thời gian không chặn trang nào nữa, nhưng mọi đường dẫn ngoài `/login` và `/auth/callback` (kể cả trang chủ `/` và địa chỉ không tồn tại) đều bị đưa sang `/login`.
- **Người đã đăng nhập** (sau giờ mở) vào được trang chủ `/` và các trang khác; mở trang đăng nhập thì được đưa sang `/`. Từ trang chủ họ đăng xuất được (xoá phiên của trình duyệt này, rồi về `/login`). Các trang đích của menu (`/awards-information`, `/sun-kudos`, `/tieu-chuan-chung`, `/profile`) chưa làm nên hiện trả 404.
- **Tài khoản ngoài tên miền** (Google khác `@sun-asterisk.com`, hoặc đăng ký bằng email/điện thoại/ẩn danh) không đăng nhập được: tài khoản mới bị cơ sở dữ liệu từ chối khi tạo; tài khoản đã có từ trước cổng bị đăng xuất ngay tại `/auth/callback`. Cả hai trường hợp người dùng chỉ thấy thông điệp lỗi chung ở `/login`.
- **Hồ sơ người dùng (`profiles`)** chỉ đọc được bởi người đã đăng nhập đạt quy tắc tài khoản (mọi hồ sơ, không chỉ của mình, để các tính năng sau như Kudos hiện người gửi/nhận); không ai ghi được từ trình duyệt; Visitor chưa đăng nhập không đọc được gì.

## Access Boundaries

Có hai lớp, chạy theo thứ tự. Lớp 1 là thời gian: không có ngoại lệ cho quản trị viên hay người đã đăng nhập, và cổng chạy trước mọi kiểm tra phiên (phiên chỉ được làm mới sau khi qua cổng). Lớp 2 là danh tính, chỉ có hiệu lực sau giờ mở: người chưa đăng nhập chỉ mở được `/login`, `/auth/callback` và `/countdown` (danh sách `PUBLIC_PATHS` ở `lib/auth/constants.ts`, khớp đúng đường dẫn sau khi bỏ dấu `/` cuối); đường dẫn khác đều về `/login`. Trang mới mặc định không công khai, muốn công khai phải thêm vào danh sách. Ranh giới này chỉ ở lớp proxy: trang dữ liệu sau này vẫn phải tự kiểm lại phiên phía server. Quyền vào hệ thống có ranh giới danh tính riêng: chỉ email `@sun-asterisk.com` đăng nhập bằng Google. Việc người dùng được làm gì sau khi đăng nhập thuộc các feature khác.

## Special Conditions

- **Cổng theo thời gian (env-gate):** quyết định bằng mốc bắt đầu sự kiện đặt khi triển khai (`EVENT_START_AT`, ISO 8601 kèm +07:00), so theo thời điểm tuyệt đối; đổi mốc cần triển khai lại hoặc đổi cấu hình.
- **Khi mốc thiếu hoặc sai:** coi như sự kiện đã bắt đầu, cổng không khóa gì và lỗi được ghi phía máy chủ. Đây là chọn lựa không khóa khi lỗi, nên cần xem log khi triển khai.
- **Phạm vi:** cả cổng thời gian lẫn bước kiểm phiên áp dụng cho mọi route trừ tài nguyên tĩnh (`_next/static`, `_next/image`, `images/`, `favicon.ico`, `robots.txt`, `sitemap.xml`; các đường dẫn này không qua proxy nên người chưa đăng nhập vẫn lấy được), thực thi ở `proxy.ts` (Next.js 16); riêng trang đếm ngược được cổng cho qua trước giờ mở. Chỉ dùng Web API để sau này chạy được trên Cloudflare Workers; chưa triển khai lên Cloudflare. Tài nguyên tĩnh mới đặt ngoài các đường dẫn trên sẽ bị cổng chặn trước giờ mở.
- **Phiên đăng nhập:** làm mới ở `proxy.ts` bằng `getClaims()` (kiểm chữ ký, không đọc cookie thô). Thiếu hoặc sai biến Supabase thì ghi log và coi mọi người là chưa đăng nhập; vì mặc định chặn người chưa đăng nhập, lúc đó mọi route ngoài `/login`, `/auth/callback`, `/countdown` đều về `/login` (khóa khi lỗi, khác với cổng thời gian). Sau đăng nhập luôn về `/`, không nhận địa chỉ đích từ client. Đăng xuất là Server Action `signOut` (`lib/auth/sign-out.ts`, `scope: "local"`: chỉ phiên của trình duyệt này), luôn kết thúc ở `/login`, lỗi chỉ ghi log. Bảng dữ liệu duy nhất là `public.profiles` (RLS bật, SELECT cho người đã đăng nhập đạt quy tắc tài khoản, không policy ghi) theo migration `supabase/migrations/20261012133000_create_profiles.sql`, chạy tay trong Supabase SQL Editor; cần tắt provider Email, Phone, Anonymous trước khi chạy. Trạng thái đã áp dụng lên project thật cần kiểm bằng file verify.
- **Đề xuất ADR:** ghi lại lý do chọn cổng theo thời gian đặt ở lớp chặn request, và chọn không khóa khi cấu hình lỗi, vào một ADR trong `docs/decisions/` (do người viết, không sinh tự động).
