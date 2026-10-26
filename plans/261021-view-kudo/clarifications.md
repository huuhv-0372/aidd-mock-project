# Clarifications — View Kudo (trang chi tiết Kudo)

MoMorph (fileKey `9ypp4enmFmdK3YAFJLIu6C`): "View Kudo" `onDIohs2bS` (Figma `520:18779`). Frame chưa có spec, test case hay node tree trong MoMorph; Figma MCP hết hạn mức (View seat).
Nguồn hình (authoritative): ảnh người dùng gửi `figma/view-kudo-520-18779-frame.png` (680×1365, riêng khung Kudo) và `figma/view-kudo-520-18779-1440.png` (1440×1521, khung đặt trên trang có header). Đo font/vị trí từ ảnh (pixel); token màu/font dùng lại từ thẻ Kudo hiện có (`kudo-highlight-card.tsx`, `kudo-post-card.tsx`) vì cùng thiết kế.

## Session 2026-10-21

- Q: Trang xem Kudo hiện ra theo cách nào? → A: **Trang `/sun-kudos/{id}`**: trang riêng có header, nền tối, khung Kudo ở giữa như ảnh 1440. Copy Link đã trỏ sẵn tới địa chỉ này. Nút "Đóng" quay lại trang trước; không có trang trước (mở thẳng link) thì về `/sun-kudos`.
- Q: Những chỗ nào mở trang xem Kudo? → A: **"Xem chi tiết" của thẻ Highlight (đã có) + link Copy Link + bấm vào phần nội dung của thẻ All Kudos**.
- Q: Khách chưa đăng nhập mở link Kudo? → A: **Đăng nhập rồi về đúng Kudo**: chuyển `/login`, đăng nhập xong quay lại đúng `/sun-kudos/{id}`; chỉ cho quay về đường dẫn nội bộ (danh sách cho phép), đụng auth → ký riskGate.
- Q: Nội dung Kudo hiển thị thế nào? → A: **Hiện đủ định dạng**: toàn bộ nội dung, giữ đậm/nghiêng/gạch/danh sách/trích dẫn/link/@nhắc tên; cỡ chữ và màu như Figma.

## Defaults do orchestrator chọn (sửa nếu sai)

- Truy cập: chỉ người đã đăng nhập (không thêm vào `PUBLIC_PATHS`). Dữ liệu qua RPC mới `kudo_detail(p_id uuid)` (security definer, `is_allowed_account` kiểm trước, trả 0 dòng khi không được phép hoặc không có), dùng lại `kudos_rows` nên cùng hình dạng `KudoRow` và cùng quy tắc ẩn danh.
- `id` sai định dạng (không phải uuid, kiểm bằng `z.guid()`) hoặc không có Kudo → `notFound()` (trang 404 đã có, HTTP 404). RPC lỗi → log server, trang hiện thông báo lỗi chung trong khung (không lộ chi tiết).
- Bố cục theo ảnh: header dùng chung (`activeHref` = `/sun-kudos`), nền `bg-login-bg` + ảnh key visual Kudos làm mờ như ảnh 1440; khung 680px, bo góc, nền kem như thẻ Kudo; **không footer, không widget Viết KUDOS** (ảnh không có).
- Nội dung khung (từ trên xuống, theo ảnh): vạch kẻ, người gửi → icon gửi → người nhận (avatar, tên, mã phòng ban, danh hiệu), thời gian, danh hiệu Kudo (tiêu đề in hoa, căn giữa), ô nội dung đầy đủ (không cắt dòng), tối đa 5 ảnh (bấm mở ảnh lớn như thẻ hiện có), hashtag (link lọc board như thẻ hiện có), vạch kẻ, số tim + nút tim, Copy Link, "Đóng".
- Tái dùng: `KudoPersonInfo`, `KudoHearts` (+ `KudoHeartsProvider` với `setKudoHeart`; Kudo của chính mình thì nút tim bị khoá như board), `CopyKudoLinkButton`, `KudoImageGallery`, `KudoHashtagList`, `formatKudoTime`.
- Nội dung định dạng: chuyển Markdown-lite đã lưu (`**b**`, `_i_`, `~~s~~`, `1. `, `> `, `[t](https://…)`, `@[Tên](uuid)`, escape `\`) thành phần tử React — **không** `dangerouslySetInnerHTML`; link chỉ http(s), mở tab mới với `rel="noopener noreferrer"`; @nhắc tên hiện "@Tên" in đậm (chưa có trang profile để link). Mỗi mẫu regex chạy tuyến tính (nội dung không tin cậy), như `kudo-plain-text.ts`.
- Nút "Đóng": quay lại bằng lịch sử trình duyệt khi trang trước là trang cùng site; nếu không thì `router.push("/sun-kudos")`. VI "Đóng", EN "Close".
- Thẻ All Kudos: phần nội dung (ô chữ) thành link tới `/sun-kudos/{id}` (không lồng phần tử tương tác); hashtag, tim, Copy Link giữ nguyên hành vi.
- Quay về sau đăng nhập: proxy chuyển khách ở `/sun-kudos/{id}` sang `/login?next=/sun-kudos/{id}`; form đăng nhập gửi kèm `next`; server action kiểm `next` theo **danh sách cho phép** (chỉ `^/sun-kudos/<uuid>$`) rồi lưu vào cookie httpOnly, `SameSite=Lax`, `Secure` (production), sống 10 phút; callback đọc cookie, kiểm lại, xoá cookie, chuyển tới đó, sai/không có thì về `/` như cũ. Người đã đăng nhập mở `/login?next=…` hợp lệ thì về thẳng `next`. Giá trị `next` không bao giờ được in ra trang.
- metaTitle (`/* not from Figma */`): VI "Chi tiết Kudo | SAA 2025", EN "Kudo details | SAA 2025".
- Responsive: mobile-first, khung rộng hết màn trừ lề 16px, padding nhỏ hơn ở màn hẹp, không cuộn ngang ở 375; ≥ 680+lề thì đúng 680px như ảnh.
- Test policy: **e2e-red-first** (điều hướng, nút Đóng, 404, khách → login?next). E2E chạy trên server AUTHED với Supabase giả: tester thêm `kudo_detail` vào fake (`tests/e2e/support/`).
- SQL thật: người dùng tự chạy migration + verify trên Supabase SQL Editor rồi mới ký riskGate (như #12, #13).

## Session 2026-10-21 (sau review + so ảnh + chạy thử trên workerd)

- Q: Độ đậm chữ nội dung khung View Kudo (ảnh trông như 800, code 700)? → A: **Giữ 700 như thẻ board**; ghi là lệch đã biết.
- Q: Hình nền sau khung (ảnh Figma: mạch xám + vệt vàng; code: KV Kudos làm tối)? → A: **Người dùng export ảnh nền từ Figma** vào `public/images/kudos/`, controller thay vào.
- Q: Lỗi có sẵn trên Workers: trang nhận `searchParams` rỗng sau khi proxy rewrite (OpenNext gọi proxy lần hai với URL không còn query) → banner lỗi đăng nhập không hiện, bộ lọc `?hashtag=`/phòng ban của board có thể hỏng trên production? → A: **Sửa luôn trong đợt này** (sửa tận gốc, kiểm trên workerd preview). Riêng `next` của View Kudo đã có lớp phòng: form đăng nhập tự đọc `next` từ thanh địa chỉ qua cùng allow-list.
- Kết quả điều tra (debugger, 2026-10-21): **không phải lỗi production**. Chỉ xảy ra khi mở preview bằng `127.0.0.1:8787`: Next đổi host loopback thành `localhost` trong URL rewrite, OpenNext so với header Host thấy khác → coi là rewrite ra ngoài → Worker tự fetch lại `/vi/login` → 307 → mất query. Mở `localhost:8787` (hoặc host thật) thì banner lỗi và `next` đều đúng. Không sửa code; gỡ lớp phòng đọc `next` phía client (YAGNI), giữ assertion E2E ô ẩn `next`.
- Hình nền: file người dùng export là lớp phủ một màu `#00101A` 80% → khung View Kudo trong Figma đè lên trang Sun* Kudos bị phủ tối. Nền trang = dải key visual của board (cùng ảnh/kích thước/gradient) + lớp phủ 80%. Tông khớp; hoạ tiết khác (Figma vẽ trên KV cũ có đường mạch, repo không có ảnh đó) → lệch đã biết. Header giữ rõ (là trang, không phải modal). File `public/images/kudos/view-kudo-bg.png` không dùng, không commit.
- Q: Hai lệch Figma còn lại (hoạ tiết nền KV cũ không có trong repo; header không bị phủ tối)? → A: **Chấp nhận nền, phủ tối cả header** (chủ dự án, 2026-10-21). `SiteHeader` thêm prop `dimmed`: lớp phủ 80% `#00101A` z-20 bên trong header, `pointer-events-none`; menu ngôn ngữ (z-30) và tài khoản (z-40) vẫn sáng khi mở.
- riskGate: chủ dự án **đồng ý ký** (auth `next` + migration `kudo_detail`). Commit, không push.

## Session 2026-10-22 (sửa theo review 005620a · 652d469)

- Q: `<strong>` trong khối nội dung 700 trông như chữ thường vì font chỉ nạp tới 700. Cách sửa? → A: **Nạp thêm Montserrat 800/900** (owner chốt). Thay quyết định "giữ 700" ở trên cho phần chữ đậm; khối nội dung vẫn 700.
- riskGate cho vòng sửa phase 04: **owner ký duyệt** (2026-10-22).
