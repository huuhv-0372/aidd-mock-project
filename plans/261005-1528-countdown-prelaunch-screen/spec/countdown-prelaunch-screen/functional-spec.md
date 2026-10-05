---
feature: F001
slug: countdown-prelaunch-screen
status: draft
lang: vi
source: plans/momorph-specs/countdown-prelaunch-page-8PJQswPZmU/
---

# F001 — Màn hình đếm ngược Prelaunch (Countdown)

## Bối cảnh

Trước khi sự kiện SAA 2025 chính thức bắt đầu, toàn bộ website chỉ hiển thị một trang đếm ngược
duy nhất. Người dùng không được phép xem bất kỳ trang nào khác (Homepage, Login, Hệ thống giải...)
cho tới khi đồng hồ đếm ngược về 0.

Nguồn: MoMorph screen "Countdown - Prelaunch page" (`screenId: 8PJQswPZmU`,
`fileKey: 9ypp4enmFmdK3YAFJLIu6C`), spec đã tải tại
`plans/momorph-specs/countdown-prelaunch-page-8PJQswPZmU/specs.csv`.

## User Stories

- **US1**: Là một visitor chưa đăng nhập, khi truy cập bất kỳ URL nào của site trước thời điểm sự
  kiện bắt đầu, tôi được chuyển tới trang đếm ngược để biết sự kiện bắt đầu khi nào.
- **US2**: Là một visitor đang ở trang đếm ngược, tôi thấy số ngày/giờ/phút còn lại tự động cập
  nhật mà không cần tải lại trang.
- **US3**: Là một visitor, khi đồng hồ đếm ngược về 0, tôi có thể điều hướng tới các trang khác
  của site (Homepage, Login...) mà không còn bị chặn lại.

## Functional Requirements

- **FR1**: Hệ thống đọc một mốc thời gian mục tiêu (target datetime) cấu hình qua biến môi trường,
  định dạng ISO-8601, áp dụng timezone cố định `Asia/Ho_Chi_Minh` (UTC+7).
- **FR2**: Trang Countdown hiển thị 3 khối số: Days, Hours, Minutes — mỗi khối 2 chữ số
  (zero-padded). Days: 00–99. Hours: 00–23. Minutes: 00–59.
- **FR3**: Các khối số tự động cập nhật theo thời gian thực (tối thiểu mỗi phút; không bắt buộc
  đến độ chính xác giây — xem Decision Log).
- **FR4**: Khi thời gian còn lại < 1 ngày, khối "Days" hiển thị "00" thay vì số âm hoặc số lạ.
- **FR5**: Khi đã qua mốc target datetime (countdown <= 0): tất cả khối hiển thị "00", và toàn bộ
  site **mở khóa điều hướng** — mọi route khác ngoài `/` (trang countdown) có thể truy cập bình
  thường.
- **FR6**: Khi chưa tới mốc target datetime: mọi request tới route khác ngoài trang Countdown bị
  **chuyển hướng (redirect)** về trang Countdown. Áp dụng cho toàn site, không phân biệt đã đăng
  nhập hay chưa.
- **FR7**: Nội dung tiêu đề ("Sự kiện sẽ bắt đầu sau" / "Event starts in") hỗ trợ đa ngôn ngữ
  VI/EN theo cơ chế i18n chung của site (cookie `NEXT_LOCALE`, xem spec Login/Dropdown ngôn ngữ).

## Success Criteria

- **SC1**: Trước target datetime, truy cập bất kỳ URL nào (kể cả URL hợp lệ của trang khác) đều
  dẫn tới trang Countdown.
- **SC2**: Sau target datetime, truy cập trang Countdown hiển thị toàn bộ khối "00" và các trang
  khác truy cập được bình thường, không bị redirect ngược.
- **SC3**: Giá trị Days/Hours/Minutes hiển thị luôn đúng 2 chữ số, không có trường hợp hiển thị 1
  chữ số hoặc số âm.

## Unresolved Questions (log, không chặn draft)

- Spec gốc của màn Countdown ghi "target datetime lấy từ API", còn spec Homepage SAA ghi "cấu hình
  qua biến môi trường". Quyết định: dùng **biến môi trường** (xem Decision Log trong
  technical-spec.md) — đơn giản hơn, không cần backend cho một mốc thời gian tĩnh toàn site. Nếu
  sau này cần đổi mốc thời gian không cần redeploy, sẽ cần xem lại quyết định này.
