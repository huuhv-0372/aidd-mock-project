# Clarifications — Like Kudos (#13)

MoMorph: Sun* Kudos `MaZUn5xHXZ` (fileKey `9ypp4enmFmdK3YAFJLIu6C`), node C.4.1 Hearts `I3127:21871;256:5175`
(feed card) và Hearts trong thẻ Highlight `I2940:13465;335:9462`.
Specs: `plans/momorph-specs/sun-kudos-live-board-MaZUn5xHXZ/{specs,test-cases}.csv` (B, B.2, B.2.3, B.3, B.4.4, C, C.2, C.3, C.4, C.4.1, D.1.4).
Nền: DB #11 `supabase/migrations/20261015100000_create_kudos.sql` (bảng `kudo_hearts`, trigger x1/x2 + đếm `heart_count`, cột `liked_by_me`/`is_mine`).

## Session 2026-10-19

- Q: Tim được cộng cho người gửi hay người nhận Kudo? (spec C.4.1 câu đầu nói người gửi, câu cuối nói "tài khoản nhận") → A: **Người gửi**. `kudos_my_stats.hearts_received` đã tính theo người gửi, không đổi.

## Session 2026-10-20

- Q: Một Kudo hiện cả ở Highlight và All Kudos; thả tim ở một chỗ thì chỗ kia? → A: **Đồng bộ ngay** (store client theo id Kudo).
- Q: Bấm tim phản hồi kiểu nào? → A: **Đổi ngay, lỗi thì hoàn lại**: đổi màu + số ngay, khoá nút tới khi server trả lời; lỗi → về trạng thái cũ + thông báo ngắn.
- Q: Ngày x2 tim (admin cấu hình)? → A: **Chỉ logic DB, cấu hình bằng SQL**. Trigger có sẵn đã cộng 2 và lưu `hearts_awarded`, nên huỷ tim thu hồi đúng 1 hoặc 2. Không làm màn admin, không thêm dấu hiệu x2 trên thẻ.

## Defaults do orchestrator chọn (sửa nếu sai)

- RPC **đặt trạng thái** (`set_kudo_heart(p_kudo_id, p_liked)`), không phải toggle: gọi lặp lại cho cùng kết quả, hai request chồng nhau không đảo ngược nhau. Client gửi trạng thái mong muốn.
- Số trên thẻ = **số lượt thả tim** (`heart_count`, đếm dòng), không phải số tim cộng cho người gửi; ngày x2 không làm số trên thẻ tăng 2.
- Kudo của chính mình (kể cả Kudo ẩn danh mình gửi, `is_mine`): nút `disabled`, **giữ nguyên giao diện** (Figma không có trạng thái disabled; theo quy ước #11 "không đổi giao diện khi disabled"), chỉ đổi con trỏ `not-allowed`.
- Figma chỉ có tim xám (chưa tim) và đỏ (đã tim); không có hover/pressed → không tự vẽ thêm. Focus dùng `FOCUS_RING` sẵn có.
- Nút: `<button aria-pressed>` + aria-label giữ mẫu "{count} lượt thả tim" (test id `kudo-hearts`, `data-liked`, `data-own` giữ nguyên).
- Lỗi: thông điệp chung VI "Không thả tim được, hãy thử lại." / EN "Couldn't update the heart. Please try again." (`/* not from Figma */`), hiện bằng toast giống toast Copy Link (tách thành `components/ui/status-toast.tsx` vì lần lặp thứ hai).
- Highlight **không** sắp xếp lại khi số tim đổi; thứ tự mới chỉ có khi tải lại trang (không realtime, như #11).
- Sidebar "Số tim bạn nhận được" không cập nhật tại chỗ: người xem không thả tim được cho Kudo của mình, nên số của họ không đổi do thao tác của họ.
- Mã lỗi RPC theo quy ước #12: SQLSTATE `22023` + `forbidden` / `not_found` / `own_kudo`.
- Rate limit: dựa vào Cloudflare Rate Limiting Rules (không viết code), như các mutate khác.
- Test policy: **e2e-red-first** (state transition: toggle, đồng bộ, hoàn lại khi lỗi).
- Sau khi chạy SQL thật: người dùng thử thật ngay (bài học #12), trước review.
