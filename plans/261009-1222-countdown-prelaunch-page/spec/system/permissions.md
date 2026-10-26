---
status: draft
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

Hiện chỉ có một cổng theo thời gian (kiểu env-gate), chưa có vai trò hay chủ sở hữu tài nguyên. Phân quyền theo vai trò sẽ do các feature đăng nhập và nghiệp vụ bổ sung sau.

**Identified Roles**:
- Visitor — mọi người truy cập, đã hoặc chưa đăng nhập; cổng không phân biệt

## Curated View

- **Visitor** trước giờ mở sự kiện chỉ xem được trang đếm ngược và tài nguyên tĩnh (ảnh, giao diện); mọi trang khác đều bị đưa về trang đếm ngược.
- **Visitor** sau giờ mở sự kiện không còn xem được trang đếm ngược, mở trang này sẽ được đưa thẳng sang trang đăng nhập; các trang khác không bị cổng chặn nữa.

## Access Boundaries

Ranh giới ở đây là thời gian chứ không phải danh tính: không có ngoại lệ cho quản trị viên hay người đã đăng nhập, và cổng chạy trước mọi kiểm tra phiên. Trang đếm ngược công khai, không cần đăng nhập. Việc người dùng được làm gì sau khi đăng nhập thuộc các feature khác.

## Special Conditions

- **Cổng theo thời gian (env-gate):** quyết định bằng mốc bắt đầu sự kiện đặt khi triển khai (`EVENT_START_AT`, ISO 8601 kèm +07:00), so theo thời điểm tuyệt đối; đổi mốc cần triển khai lại hoặc đổi cấu hình.
- **Khi mốc thiếu hoặc sai:** coi như sự kiện đã bắt đầu, cổng không khóa gì và lỗi được ghi phía máy chủ. Đây là chọn lựa không khóa khi lỗi, nên cần xem log khi triển khai.
- **Phạm vi:** áp dụng cho mọi route của ứng dụng trừ trang đếm ngược và tài nguyên tĩnh, thực thi ở lớp chặn request chạy trên edge của Cloudflare Workers.
- **Đề xuất ADR:** ghi lại lý do chọn cổng theo thời gian đặt ở lớp chặn request, và chọn không khóa khi cấu hình lỗi, vào một ADR trong `docs/decisions/` (do người viết, không sinh tự động).
