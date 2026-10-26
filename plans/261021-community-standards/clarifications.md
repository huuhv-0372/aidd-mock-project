# Clarifications — Trang Tiêu chuẩn cộng đồng / Tiêu chuẩn chung

Figma web: https://www.figma.com/design/9ypp4enmFmdK3YAFJLIu6C/SAA-2025---Internal-Live-Coding?node-id=1161-8944 (frame "Tiêu chuẩn cộng đồng", 1440×1517). Không có frame MoMorph cho bản web; MoMorph chỉ có bản iOS `xms7csmDhD` (spec 3 mục A/B/C, `plans/momorph-specs` chưa tải).
Nguồn hình: `figma/standards-1161-8944-1440.png` (người dùng export, 1x, authoritative cho giao diện web) + `figma/standards-ios-xms7csmDhD.png` (MoMorph). Cấu trúc + kích thước khối: Figma `get_metadata` 1161:8944 (dưới đây). Figma MCP hết hạn mức sau 1 lần gọi; MoMorph `get_figma_image` lỗi 500.

## Session 2026-10-21

- Q: Lấy giao diện web từ đâu khi Figma/MoMorph không trả ảnh? → A: **Người dùng gửi ảnh export frame** (`figma/standards-1161-8944-1440.png`).
- Q: Trang có công khai cho khách? → A: **Công khai**: thêm `/tieu-chuan-chung` vào `PUBLIC_PATHS`; header khách hiện nút Đăng nhập như Homepage.

## Defaults do orchestrator chọn (sửa nếu sai)

- Một trang duy nhất `STANDARDS_PATH = /tieu-chuan-chung` cho cả link "Tiêu chuẩn cộng đồng" (toolbar Viết Kudo, mở tab mới — đã có) và "Tiêu chuẩn chung" (footer). Bản iOS đặt tiêu đề màn là "Tiêu chuẩn chung", nội dung là hai mục "Tiêu chuẩn cộng đồng" + "Tiêu chuẩn bảo mật".
- Header: `SiteHeader` có sẵn, không mục nào active (Figma không có mục này trong header). Footer: "Tiêu chuẩn chung" ở trạng thái đang chọn (Figma: nền `rgb(255 234 158/0.1)` + glow, như hover) → `SiteFooter` nhận `activeHref`, đặt `aria-current="page"`. Các trang khác không truyền `activeHref` → footer không đổi.
- Không có Widget / KudosComposer trên trang này (Figma không vẽ widget).
- Key visual: dùng lại `/images/home/keyvisual-bg.webp` + logo `/images/home/root-further-logo.png` 451×200 (cùng tài sản với Homepage); nền dải 1440×512 từ y=24, phủ "Cover" 627px mờ dần về `#00101A`. Gradient đúng của Cover chưa có số Figma → so mắt với ảnh, ghi lệch vào `reports/visual-check.md`.
- Heading: trang có hai mục ngang hàng, nên `h1` ẩn trực quan (`sr-only`) = "Tiêu chuẩn chung" (tên trang, khớp tiêu đề iOS + metaTitle); "Tiêu chuẩn cộng đồng" và "Tiêu chuẩn bảo mật" là `h2`. Logo giữ `alt="ROOT FURTHER"` như Homepage.
- Nội dung VI: theo ảnh web (nguyên văn, dấu phẩy, ngoặc kép cong “”, "." "," "..."). EN: hai tiêu đề từ Figma localization ("Community Standards", "General standards"); "Security Standards" và toàn bộ thân bài tự dịch, đánh dấu `/* not from Figma */`, liệt kê ở `reports/en-localizations.md`.
- Danh sách: mục B là `<ol>` 10 mục (số căn phải như ảnh: "10." lệch trái hơn), mục C là `<ul>` 2 mục chấm tròn. Dòng nhấn mạnh màu vàng `login-accent` (#FFEA9E): đoạn giới thiệu B và dòng "Liên hệ Hỗ trợ" C; còn lại trắng.
- Responsive: không có frame mobile web → mobile-first theo cùng thứ tự, padding 16px, tiêu đề nhỏ dần (như `kudos-rules-content`), không cuộn ngang.
- Test policy: **e2e-red-first** (có điều hướng + auth gate); tester so ảnh Figma sau GREEN. E2E kiểm: khách mở được trang (không bị đẩy sang /login), link toolbar Viết Kudo và link footer tới đúng trang, footer `aria-current`, nội dung đủ 10 + 2 mục, đổi VI/EN.

## Kích thước từ `get_metadata` (frame 1440)

Header 0–80 · Keyvisual y=24 h=512 · Cover h=627 · Bìa y=88 h=1365 · KV logo x=144 y=88+96=184, 451×200 · Khối nội dung x=144 y=88+416=504, 1152×853, nội dung cách mép 16 (x=160) · B: tiêu đề y=520 h=56; đoạn vàng y=592 h=47 (2 dòng 24); khối trắng y=643 h=364 · đường kẻ y=1039 1px rộng 1120 · C: tiêu đề y=1072 h=56; khối y=1144 h=117; "Liên hệ" y=1277 h=24 · Footer y=1373 h=144.
Đo từ ảnh: tiêu đề vàng rộng ≈527px ("Tiêu chuẩn cộng đồng"); dòng danh sách cách nhau 30px; nội dung danh sách lùi ≈35px (x≈195).
