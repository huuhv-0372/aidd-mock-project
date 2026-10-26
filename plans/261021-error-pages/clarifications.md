# Clarifications — Trang lỗi 404 + 403

MoMorph (fileKey `9ypp4enmFmdK3YAFJLIu6C`): "Error page - 404" `p0yJ89B-9_` (Figma `1378:5063`), "Error page - 403" `T3e_iS9PCL` (Figma `2182:9291`). Hai frame chưa có spec / test case / node tree trong MoMorph; Figma MCP hết hạn mức; MoMorph `get_figma_image` lỗi 500.
Nguồn hình (authoritative): ảnh người dùng gửi `figma/error-404-1378-5063.png`, `figma/error-403-2182-9291.png` (1x, ~1438×917). Asset người dùng export: `public/images/errors/not-found-robot.png` (702×545, nền trong suốt), `access-denied-monitor.png` (702×545), `error-bg.png` (1438×917, dải màu **chưa** có lớp phủ tối).

## Session 2026-10-21

- Q: Lấy hình minh hoạ + nền từ đâu? → A: **Người dùng export từ Figma** vào `public/images/errors/`.
- Q: Trang 403 hiện ra khi nào? → A: **Route `/403` + `forbidden()` sẵn dùng**: bật `experimental.authInterrupts`, file `forbidden.tsx` render giao diện 403 (HTTP 403); `/403` xem trực tiếp được; trang sau (admin…) chỉ cần gọi `forbidden()`.
- Q: Ngôn ngữ chữ trên trang lỗi? → A: **VI dịch, EN theo Figma**; 403 dùng câu mô tả riêng ("không có quyền truy cập") thay vì câu "không tồn tại" Figma chép từ 404.

## Defaults do orchestrator chọn (sửa nếu sai)

- Giữ nút về trang chủ (người dùng yêu cầu; Figma không vẽ nút): VI "Về trang chủ", EN "Back to home" → `HOME_PATH`, kiểu nút vàng primary đang dùng ở trang 404 hiện tại, đặt dưới câu mô tả.
- Copy:
  - 404 — VI: tiêu đề "Không tìm thấy trang" (hiển thị IN HOA bằng CSS cho giống Figma "NOT FOUND"; accessible name giữ nguyên để test cũ không đổi), mô tả "Trang bạn tìm không tồn tại hoặc đã bị xoá." · EN (Figma): "NOT FOUND", "The resource you’re looking for doesn’t exist or has been removed."
  - 403 — VI: "Truy cập bị từ chối", "Bạn không có quyền truy cập trang này." · EN: "Access Denied" (Figma), mô tả "You don’t have permission to access this page." (`/* not from Figma */`: Figma chép nhầm câu 404).
  - metaTitle: VI "Không tìm thấy trang | SAA 2025" (giữ) / "Truy cập bị từ chối | SAA 2025"; EN "Page not found | SAA 2025" (giữ) / "Access denied | SAA 2025".
- Không header/footer (như trang 404 hiện tại; Figma cũng không có).
- Nền: `error-bg` phủ lớp `#00101A` với độ mờ suy ra bằng cách so pixel giữa `error-bg.png` và ảnh chụp Figma (cùng toạ độ). Nền cố định full màn hình, `object-cover`. Chuyển `error-bg.png` (1.7 MB) sang WebP nếu có công cụ (giữ chất lượng), như các key visual khác.
- Bố cục 1440: tiêu đề trắng bold căn giữa (đo từ ảnh), hình minh hoạ 702×545 căn giữa, mô tả trắng bold 2 dòng căn giữa, rồi nút. Mobile-first, không cuộn ngang ở 375.
- `/403` công khai (thêm vào `PUBLIC_PATHS`), vì trang lỗi không chứa dữ liệu; route này gọi `forbidden()` để trả HTTP 403 và dùng chung giao diện với `forbidden.tsx`.
- Test policy: **e2e-red-first** (HTTP status, điều hướng nút về trang chủ, VI/EN) + tester so ảnh Figma.
- Khách (chưa đăng nhập) mở đường dẫn không tồn tại: **vẫn bị chuyển sang /login** (cổng default-deny), không trả 404 — để người ngoài không dò được trang nào tồn tại. Trang 404 chỉ hiện cho người đã đăng nhập (và cho khách ở các đường dẫn công khai không có thật — không có). E2E `error-pages.spec.ts` ca khách đã đổi theo (controller, 2026-10-21).
- `language-switch-authed.spec.ts`: tiêu đề EN của 404 đổi "Page not found" → "NOT FOUND" (Figma); metaTitle EN giữ "Page not found | SAA 2025".
