# Clarifications — Sửa Kudo do mình gửi

MoMorph (fileKey `9ypp4enmFmdK3YAFJLIu6C`): "Màn Sửa bài viết- edit mode" `419VXmMy6I` (Figma `1949:13746`). Trạng thái: design in_progress, spec none, chưa có ảnh frame (`get_frame_image` không có ảnh), chưa có specs/test-cases.
Nguồn thiết kế duy nhất: ảnh người dùng gửi ngày 2026-10-22, lưu ở `figma/sua-kudo-1949-13746.png` (752×1076, modal ~752 rộng). Mọi giá trị đo từ ảnh này + dùng lại style modal Viết Kudo (`ihQ26W78P2`) đã làm.

Ảnh có: tiêu đề "Chỉnh sửa bài viết của bạn"; Người nhận (ô có mũi tên); toolbar B/I/S/list/link/quote; khung nội dung đã điền; dòng gợi ý "@ + tên" + bộ đếm "0/1.000" bên phải; Hashtag (chip đã chọn + "+ Hashtag Tối đa 5"); Image (5 ảnh đã có, nút xoá đỏ, "+ Image Tối đa 5"); checkbox "Gửi lời cám ơn và ghi nhận ẩn danh" (đã tích); "Nickname ẩn danh*" (Doraemon); dòng lỗi đỏ "Bạn cần điền đủ Người nhận, Lời nhắn gửi và Hashtag để gửi Kudos!"; nút "Hủy ×" và "Lưu 💾".

## Session 2026-10-22

- Q: Ảnh không có ô Danh hiệu, xử lý thế nào? → A: **Vẫn có ô Danh hiệu** như Viết Kudo, điền sẵn danh hiệu cũ (lệch ảnh có chủ đích).
- Q: Có cho đổi Người nhận? → A: **Khoá người nhận**: ô hiện tên người nhận, không sửa, không mở danh sách gợi ý.
- Q: Ẩn danh khi sửa? → A: **Khoá trạng thái** công khai ↔ ẩn danh (checkbox hiện đúng trạng thái, disabled). Kudo ẩn danh sửa được biệt danh, **tuỳ chọn** như Viết Kudo (≤50, để trống → nhãn ẩn danh mặc định). Kudo công khai không có ô biệt danh.
- Q: Bộ đếm "0/1.000"? → A: **Bộ đếm theo 5.000** ("N/5.000", EN "N/5,000") dưới khung nội dung, cho **cả Viết lẫn Sửa**. Giới hạn DB 5000 không đổi.

## Defaults do orchestrator chọn (sửa nếu sai)

- **Lối vào:** icon bút chì cạnh tiêu đề thẻ `KudoPostCard` (đã chỉ hiện khi `is_mine`) thành nút "Chỉnh sửa Kudo" / "Edit Kudo" (vùng chạm 44px, `focus-visible`). Board (feed) và Profile (Đã gửi) đều có. Highlight card và trang View Kudo không có bút chì → không thêm lối vào (YAGNI).
- **Quyền:** chỉ người gửi (`sender_id = auth.uid()`) sửa được, kể cả Kudo ẩn danh của mình. RPC trả cùng một lỗi `not_found` cho Kudo không tồn tại và Kudo của người khác (không lộ Kudo tồn tại). Không giới hạn thời gian sửa.
- **Modal:** dùng lại modal Viết Kudo ở chế độ `edit` (không tạo bản sao). Tiêu đề "Chỉnh sửa bài viết của bạn" / "Edit your Kudo"; nút "Hủy" + "Lưu" / "Save" kèm icon lưu. Đóng (Hủy, Esc, bấm nền) thì bỏ mọi thay đổi, không hỏi lại.
- **Điền sẵn:** danh hiệu, nội dung (Markdown → tài liệu Tiptap, giữ mention/định dạng/liên kết/danh sách/trích dẫn), hashtag (slug), ảnh (URL, đúng thứ tự), biệt danh. Không có dữ liệu nào bị mất khi mở rồi Lưu không đổi gì.
- **Kiểm hợp lệ:** như Viết Kudo: Lưu disabled tới khi đủ Danh hiệu + nội dung + ≥1 hashtag và nội dung ≤5000; lỗi từng ô hiện khi rời ô. Dòng lỗi đỏ chung của ảnh không dùng (đã chọn "disable" ở Viết Kudo, `261019-1022-write-kudos/clarifications.md`).
- **Ảnh:** ảnh cũ hiện thumbnail, xoá được; thêm ảnh mới như Viết Kudo; tổng ≤5. Thứ tự sau khi lưu = ảnh cũ còn giữ (giữ thứ tự) rồi ảnh mới (theo thứ tự thêm). Ảnh cũ bị bỏ: xoá khỏi Storage **sau khi** cập nhật thành công (lỗi xoá chỉ log). Cập nhật lỗi: xoá ảnh mới vừa tải lên (như create).
- **Sau khi lưu:** modal đóng; thẻ đổi ngay tại chỗ, không tải lại trang: action trả `KudoRow` mới, danh sách (`KudosFeedList`) thay thẻ cùng id; `router.refresh()` cho phần render ở server. Tim, thời gian tạo, vị trí trong feed giữ nguyên. Không có nhãn "đã chỉnh sửa".
- **Lỗi lưu:** dòng chung "Không lưu được thay đổi, vui lòng thử lại." / "Couldn't save your changes, please try again." (`not from Figma`); trường bị server từ chối hiện "Giá trị không hợp lệ" như Viết Kudo. Kudo đã bị xoá / không còn là của mình → dòng chung.
- **Dữ liệu:** RPC mới `update_kudo(p_id, p_title, p_content, p_hashtag_slugs, p_image_urls, p_anonymous_name)` → `text[]` (URL ảnh bị bỏ), security definer, `search_path = ''`, chỉ `authenticated`, `is_allowed_account` trước, khoá dòng `for update`. Kiểm danh hiệu / nội dung / hashtag / ảnh giống `create_kudo`; URL ảnh hợp lệ khi đã là ảnh của chính Kudo đó **hoặc** là object người gọi sở hữu (như create). Biệt danh chỉ khi Kudo đang ẩn danh. Không đổi người nhận, `is_anonymous`, `created_at`, `heart_count`. Có rollback + verify; người dùng chạy SQL thật trước khi ký riskGate.
- **Test policy:** **e2e-red-first** (mở modal từ bút chì, điền sẵn, khoá người nhận/ẩn danh, lưu cập nhật thẻ, quyền, bộ đếm).

## Session 2026-10-23 — sau GREEN lần 1 + review lượt 1 (orchestrator chọn, sửa nếu sai)

- Nội dung gửi qua FormData bị trình duyệt đổi `\n` → `\r\n` (chuẩn multipart). → Chuẩn hoá `\r\n`/`\r` → `\n` ở schema nội dung dùng chung (áp cho cả Viết lẫn Sửa); bộ chuyển Markdown → editor đọc được nội dung cũ có `\r\n`. Không chạy migration sửa dữ liệu cũ (thẻ hiển thị như nhau).
- Xoá hết chip hashtag → hiện "Không được để trống" ngay (coi như đã rời ô), cho cả Viết lẫn Sửa.
- Tiêu đề modal chế độ Sửa 32px như ảnh; tiêu đề Viết Kudo giữ theo Figma của nó.
- Ô biệt danh: nhãn nằm cùng hàng bên trái ô nhập (như ảnh Sửa), cho cả Viết lẫn Sửa; chữ nhãn giữ "Tên ẩn danh" / EN như hiện tại, **không** có dấu `*` (biệt danh tuỳ chọn).
- Review M1: mention có gắn link (dán URL lên đoạn có mention) phải đọc lại đúng. Review L2: chỉ nhận `keepImages` và chỉ xoá URL thuộc origin Supabase của dự án. Review L4: ảnh cũ bị từ chối báo "Giá trị không hợp lệ", không báo "Định dạng file". Review L9: bộ chuyển chỉ tải trong chunk của modal.
- Q: Chip hashtag 48px (ảnh Sửa) hay 40px (Figma Viết Kudo)? → A: **Giữ 40px cho cả hai** (chủ dự án, 2026-10-23).
- Q: Link "Tiêu chuẩn cộng đồng" trên thanh công cụ ở chế độ Sửa (ảnh không có)? → A: **Giữ ở cả Viết lẫn Sửa** (chủ dự án, 2026-10-23).

## Session 2026-10-23 — SQL thật

- Chủ dự án chạy migration `20261023100000_create_update_kudo_rpc.sql` + file verify trên Supabase thật: **11/11 PASS** (P1, U0–U9, gồm U6 người khác/không tồn tại → not_found trước kiểm trường, U8 forbidden, U9 anon 42501). Ảnh: `reports/sql-verify-261023-update-kudo.png`.
- riskGate: chủ dự án **đồng ý ký** (2026-10-23) sau SQL 11/11 PASS, E2E 317/317, re-review SEALED 9.
