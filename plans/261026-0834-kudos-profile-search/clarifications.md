# Clarifications — Tìm kiếm profile Sunner (Sun* Kudos Live board)

MoMorph (fileKey `9ypp4enmFmdK3YAFJLIu6C`): "Sun* Kudos - Live board" `MaZUn5xHXZ` (Figma `2940:13431`).
Đối tượng: pill "Tìm kiếm profile Sunner" node `2940:13450` (instance "Tìm kiếm sunner", component `186:2757`), nằm trong
"Button chuc nang" `2940:13448`, cạnh A.1 `2940:13449`. Code hiện tại: `components/kudos/kudos-compose-trigger.tsx:35`
(đang `aria-disabled`, không handler — plan Live board `261015-1010` để dành cho plan sau).

Nguồn: `plans/momorph-specs/sun-kudos-live-board-MaZUn5xHXZ/{specs,test-cases}.csv`; tải lại qua MCP ngày 2026-10-26.

## Spec đang có

- Node `2940:13450` **không có dòng spec** trong MoMorph — chỉ có thiết kế: pill 381×72, padding 24/16, gap 8, viền 1px `#998C5F`,
  nền `rgba(255,234,158,0.10)`, bo 68px, icon kính lúp 24px + chữ "Tìm kiếm profile Sunner".
- Mô tả chức năng gần nhất là B.7.3 `2940:14833` (cùng component "Tìm kiếm sunner", nằm trong Spotlight): "Thanh tìm kiếm để
  tìm profile Sunner" — placeholder, icon kính lúp; gõ từ khoá; Enter/bấm icon → tìm; focus → viền focus; string, tối đa 100,
  không bắt buộc.
- Test case: `1ce82447` (có ô, icon, placeholder), `d3877e54` (placeholder đúng tiếng Việt), `9e689933` (100 ký tự được;
  101 bị từ chối; rỗng → chặn + báo bắt buộc).
- Figma **không có** frame kết quả tìm kiếm / dropdown cho ô này.

## Session 2026-10-26

- Q: Ô nên hoạt động thế nào? (Gõ là gợi ý / Bấm mở popup / Trang kết quả riêng) → A: **Gõ là gợi ý** — pill thành ô nhập
  (combobox); gõ → debounce → dropdown ≤10 Sunner (avatar, tên, phòng ban); chọn một người hoặc Enter → `/profile/{id}`.
  Tái dùng RPC `kudos_search_sunners` và kiểu dropdown của recipient picker; không cần migration.
- Q: Ô B.7.3 trong Spotlight có đổi theo không? (Giữ nguyên / Đổi cả B.7.3) → A: **Giữ nguyên** — B.7.3 vẫn tô sáng tên
  trong word cloud (quyết định của plan `261015-1010`, E2E ID-11 giữ nguyên). Plan này chỉ làm ô `2940:13450`.
- Q: Validate theo spec hay theo test case `9e689933`? → A: **Theo spec** — `maxlength=100` chặn ký tự thứ 101, zod server
  chặn >100; rỗng → không tìm, không báo lỗi (giống quyết định B.7.3).

## Defaults do orchestrator chọn (sửa nếu sai)

- **Giao diện dropdown:** dùng lại PANEL/OPTION + `RecipientOptionContent` của `components/kudos-compose/recipient-picker.tsx`
  (bản thân đã theo dropdown hashtag `p9zO-c4a4x`), không tự vẽ kiểu mới.
- **Pill:** giữ nguyên kích thước/màu Figma; chữ "Tìm kiếm profile Sunner" thành placeholder của input; icon kính lúp thành nút
  submit 44×44 (vùng chạm), hình không đổi. Focus → viền focus như các pill khác (`FOCUS_RING`).
- **Enter:** có dòng đang được chọn bằng phím mũi tên → mở profile người đó; không có → mở kết quả đầu tiên; chưa có kết quả /
  rỗng → không làm gì. Bấm kính lúp = Enter.
- **Bàn phím/ARIA:** combobox chuẩn (`role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`),
  ↑/↓ di chuyển, Esc đóng, Tab/blur đóng.
- **Không có kết quả:** một dòng trạng thái trong dropdown "Không tìm thấy Sunner nào." / "No Sunner found." (cùng câu với
  Spotlight `noResults`, không từ Figma). **Lỗi mạng/server:** dòng trạng thái chung, không lộ lỗi nội bộ.
- **Dữ liệu:** RPC hiện tại loại chính người gọi và tìm theo tên **hoặc email** (không trả email). Giữ nguyên hành vi đó.
- **Giới hạn độ dài:** action mới dùng schema riêng 1–100 ký tự sau trim; không đổi `SUNNER_QUERY_MAX = 50` của form Viết Kudo.
- **Mobile:** pill xếp dưới A.1, rộng 100%; dropdown rộng bằng pill; mục chọn cao tối thiểu 44px.
- **Điều hướng:** `profileHref(id)` có sẵn, đi qua router có tiền tố locale như các link profile khác.
