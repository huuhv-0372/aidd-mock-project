# Clarifications — Countdown Prelaunch Page

MoMorph: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/8PJQswPZmU
Specs: plans/momorph-specs/countdown-prelaunch-page-8PJQswPZmU/specs.csv
Test cases: plans/momorph-specs/countdown-prelaunch-page-8PJQswPZmU/test-cases.csv

## Session 2026-10-09

- Q: Test runner / test policy? → A: Cài Vitest (unit) + @playwright/test (E2E). testPolicy = e2e-red-first.
- Q: Nguồn target datetime (spec ghi "lấy từ API", TODO)? → A: Biến môi trường `EVENT_START_AT` (ISO 8601 có offset +07:00), đọc phía server. Đổi sang Supabase sau chỉ cần sửa một hàm đọc.
- Q: Phạm vi "khóa điều hướng khi chưa về 0"? → A: Chặn ở `proxy.ts`: trước giờ sự kiện mọi route (trừ trang countdown và asset tĩnh) redirect về trang countdown. Sau giờ sự kiện, truy cập trang countdown redirect sang `/login`.
- Q: Hết giờ thì sao? → A: Client tự redirect sang `/login` ngay khi bộ đếm về 0 (yêu cầu của người dùng).
- Q: Ngôn ngữ spec? → A: Tiếng Việt (vi).

## Defaults chosen by orchestrator (override nếu sai)

- Route trang countdown: `/countdown`. Route đăng nhập: `/login` (màn Login làm ở task riêng — trước khi có, `/login` trả 404).
- Truy cập: trang countdown công khai, không cần đăng nhập (test case ACCESSING ghi "Access control unspecified").
- `EVENT_START_AT` thiếu hoặc sai định dạng: coi như sự kiện đã bắt đầu (không khóa), log lỗi phía server.
- i18n: chỉ tiếng Việt cho tiêu đề theo spec ("Sự kiện sẽ bắt đầu sau"); nhãn DAYS/HOURS/MINUTES giữ nguyên theo Figma. Chưa dựng hệ thống i18n (YAGNI).
- Hiển thị: chỉ Days/Hours/Minutes (không có giây) — đúng spec; cập nhật mỗi giây để redirect đúng lúc về 0.
- Giá trị âm hoặc vượt phạm vi (Hours>23, Minutes>59) hiển thị "00"; mọi đơn vị zero-pad 2 chữ số; Days kẹp 00–99.
- Timezone: so sánh theo epoch ms, target có offset +07:00 nên không phụ thuộc giờ máy client.
- Q: Đồng hồ client lệch server gây vòng lặp redirect? → A: Hiệu chỉnh theo giờ server — server truyền `serverNow` cùng `target`, client đếm theo độ lệch (D001).
- Q: Responsive ba khối trên màn hình nhỏ? → A: Một hàng, thu nhỏ theo bề rộng (D002).
- Q: Duyệt spec? → A: Duyệt (Rest Point 1.5b).
