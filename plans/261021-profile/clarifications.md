# Clarifications — Profile (bản thân + người khác)

MoMorph (fileKey `9ypp4enmFmdK3YAFJLIu6C`): "Profile bản thân" `3FoIx6ALVb` (Figma `362:5037`, design/spec done), "Profile người khác" `w4WUvsJ9KI` (Figma `362:5097`, design in_progress, chưa có ảnh/spec).
Nguồn: `plans/momorph-specs/profile-ban-than-3FoIx6ALVb/{specs,test-cases}.csv` (tải lại ngày 2026-10-21 lỗi 503, dùng bản đã có), ảnh frame `figma/profile-ban-than-362-5037.png` (1440×4660, tải từ MoMorph). Figma MCP hết hạn mức.
Lưu ý: test case MoMorph viết cho một codebase khác (`/profile?id=`, `/kudos`, `locales/*.json`, `PUBLIC_ROUTES`) → ánh xạ sang repo này như dưới; hành vi giữ nguyên.

## Session 2026-10-21

- Q: Phạm vi đợt này? → A: **Làm cả hai**: `/profile` (của mình) và `/profile/<id>` (người khác; tên trên thẻ Kudo đã link tới đây, đang 404).
- Q: "Đã gửi" trên profile của mình: Kudo gửi ẩn danh hiện người gửi thế nào? → A: **Hiện tên ẩn danh như board** (thẻ giống hệt board; vẫn đếm đủ trong danh sách). Không đổi quy tắc ẩn danh của RPC.
- Q: Dropdown KUDOS mặc định? → A: **Đã nhận** (theo test case; ảnh Figma đang hiện "Đã gửi (5)").

## Defaults do orchestrator chọn (sửa nếu sai)

- **Đường dẫn:** dùng `profileHref(id)` có sẵn = `/profile/<id>` (path, không phải `?id=` như test case). `/profile/<id của chính mình>` → `redirect("/profile")` (một URL cho trang của mình). `id` sai định dạng (`z.guid()`), không tồn tại, hoặc người gọi bị RPC từ chối → `notFound()` (404, trước khi stream). Người gọi chưa có dòng `profiles` → 404.
- **Truy cập:** chỉ người đăng nhập (không thêm vào `PUBLIC_PATHS`; khách → `/login`, không mang `next` vì allow-list chỉ nhận `/sun-kudos/<guid>`). Trang chỉ đọc (ngoài nút tim có sẵn), không có chỗ sửa tên/avatar/phòng ban; không lộ email hay auth id.
- **Hero:** dải key visual Kudos (`kv-bg.webp`, như banner board) ; avatar tròn (~200px ở 1440, placeholder khi null), tên vàng, dòng phòng ban • `HeroBadge` • sao (dùng lại `heroTier`/`starCount` của `kudo-person.tsx`). 0 Kudo → không huy hiệu, không sao; không phòng ban → bỏ dòng đó.
- **Bộ sưu tập icon:** 6 vòng tròn xám (Figma + spec "chưa có icon thì để icon xám"); Secret Box chưa làm nên luôn xám. Tiêu đề: của mình "Bộ sưu tập icon của tôi" / "My icon collection"; người khác "Bộ sưu tập icon" / "Icon collection".
- **Khung thống kê (chỉ trang của mình):** dùng lại `KudosStatsPanel` + `kudos_my_stats` (số Secret Box thật từ `secret_boxes`, nút "Mở Secret Box" vẫn `aria-disabled` như board), rộng 680 như Figma.
- **Trang người khác:** khung thống kê thay bằng thanh "Gửi lời cám ơn và ghi nhận đến {tên}" (kiểu thanh soạn Kudo của board), bấm mở modal Viết Kudo **điền sẵn người nhận** (vẫn sửa được, không bật danh sách gợi ý). Không có "Đã gửi" ở bất cứ đâu (số Kudo đã gửi gồm cả Kudo ẩn danh → lộ thông tin): dropdown chỉ một mục "Đã nhận (N)".
- **Phần KUDOS:** "Sun* Annual Awards 2025" + "KUDOS" + dropdown "Đã nhận (N)" / "Đã gửi (N)" (EN "Received (N)" / "Sent (N)"); N lấy từ `kudos_my_stats` (mình) hoặc `kudos_received` (người khác). Đổi mục → tải trang 1 của danh sách mới, bỏ các trang cũ; chọn lại mục đang chọn → không làm gì. Cuộn vô hạn 10 thẻ/lần, keyset như board. Rỗng: nhận "Hiện tại chưa có Kudos nào." (như board), gửi "Bạn chưa gửi Kudos nào." / "You haven't sent any Kudos yet.".
- **Thẻ:** dùng lại `KudoPostCard` (tim, Copy Link, ảnh, hashtag → board lọc theo tag, nội dung → trang View Kudo). **Không** hiện chip "Spam" (chưa có kiểm duyệt).
- **Khung trang:** `SiteHeader` không mục nào active (Profile không có trong menu), có `SiteFooter` (Figma có footer), không widget Viết KUDOS (Figma không có). `KudosComposer` bọc trang để thanh "Gửi lời cám ơn" mở modal.
- **metaTitle** (`/* not from Figma */`): mình "Hồ sơ của tôi | SAA 2025" / "My profile | SAA 2025"; người khác "{tên} | SAA 2025".
- **Dữ liệu:** RPC mới (security definer, `is_allowed_account` trước, `search_path = ''`, chỉ `authenticated`): `profile_card(p_id uuid)` → `kudos_person_json` (id, full_name, avatar_url, department, kudos_received, distinct_senders; không email); `kudos_profile_feed(p_profile uuid, p_direction text, p_cursor_created_at, p_cursor_id, p_limit)` → `setof kudo_row` qua `kudos_rows`: `received` = `recipient_id = p_profile`; `sent` chỉ khi `p_profile = auth.uid()` (`sender_id = auth.uid()`, gồm Kudo ẩn danh của chính mình, thẻ vẫn che tên như board), người khác → 0 dòng. Có rollback + verify; người dùng chạy SQL thật trước khi ký riskGate.
- **Test policy:** **e2e-red-first** (điều hướng, 404, dropdown, phân quyền Đã gửi, thanh gửi lời cảm ơn). Test hai phiên (TC SEC_003) làm ở mức RPC giả theo `sub` + kiểm SQL bằng file verify.

## Session 2026-10-21 (2) — ảnh "Profile người khác" do người dùng gửi

Người dùng gửi ảnh frame `w4WUvsJ9KI` (MoMorph vẫn chưa có ảnh/node tree). Ảnh lưu ở `figma/profile-nguoi-khac-362-5097.png` nếu người dùng đã đặt file vào. Hình ảnh theo Figma, nên các mặc định trên đổi như sau:

- Q: Mục menu sáng? → A: **Header và footer đều sáng "Sun* Kudos"** (`activeHref = SUN_KUDOS_PATH`) ở cả hai trang (ảnh người khác: header + footer; ảnh của mình: footer). Thay mặc định "không mục nào active".
- Q: Thanh gửi lời cảm ơn? → A: thanh tròn (pill) rộng 680, viền mảnh, nền tối, **icon bút chì + chữ căn giữa** "Gửi lời cám ơn và ghi nhận **tới** {tên}" (EN "Send thanks and recognition to {name}"). Thay chữ "đến" trước đó.
- Q: Phần KUDOS của người khác? → A: bên phải chữ "KUDOS" là **chữ tĩnh "Đã nhận: N Kudos"** (EN "Received: N Kudos"), không phải dropdown. Trang của mình vẫn dropdown "Đã nhận (N)" / "Đã gửi (N)".
- Q: Tiêu đề hàng icon của người khác? → A: **"Bộ sưu tập icon của {tên}"** (EN "{name}'s icon collection"). Ảnh ghi "Bộ sưu tập icon của..." nên đọc "..." là chỗ tên; hiện đủ tên, không cắt.
- Q: Hàng icon trong ảnh có hình + nhãn (REVIVAL, TOUCH OF LIGHT, …)? → A: đó là icon đã mở từ Secret Box. Chưa có dữ liệu Secret Box nên **vẫn 6 ô xám, không nhãn** ở cả hai trang (như ảnh của mình).
- Q: Icon bút chì cạnh tiêu đề mỗi thẻ? → A: **không làm**: spec không có chức năng sửa Kudo. Thẻ giữ nguyên `KudoPostCard` của board.

## Session 2026-10-22 — sau review + so ảnh

- SQL thật: người dùng chạy migration + verify `20261022100000_create_profile_rpcs`, **14/14 PASS** (P1, P2, C1–C3, R1–R5, SEC_002–004, anon 42501).
- Q: Icon bút chì cạnh tiêu đề thẻ (board vốn có trên mọi thẻ)? → A: **Chỉ hiện trên Kudo do mình gửi** (`is_mine`), áp dụng cho `KudoPostCard` ở cả board và Profile.
- Q: Dòng cuối "Bạn đã xem hết Kudos." (Figma Profile không có)? → A: **Giữ** như board.
- Q: Dải ảnh nền trang người khác chưa khớp ảnh gửi (frame chưa có node MoMorph)? → A: **Chấp nhận**, hai trang dùng chung một dải (6deg Cover theo ảnh trang của mình).
