# Clarifications — Viết Kudos (#12)

Nguồn: specs/test-cases CSV trong `plans/momorph-specs/`, ảnh frame MoMorph `ihQ26W78P2`, `b1Filzi9i6`, `Sv7DFwBw1h`, `p9zO-c4a4x`.
Frame không có ảnh trên MoMorph (lấy qua Figma MCP `get_screenshot`/`download_assets` khi cần, cùng fileKey):
`5c7PkAibyD` (Viết KUDO - lỗi), `p9vFVBE_tc` (Ẩn danh), `QIMJNgFb8K` (dropdown người nhận), `xms7csmDhD` (Tiêu chuẩn cộng đồng, iOS).

## Session 2026-10-19 (người dùng chốt)

- Q: Nút Gửi khi thiếu trường bắt buộc — disable (H.2, ID-48/49) hay luôn bật + hiện lỗi (frame `5c7PkAibyD`, ID-56)? → A: **Disable** tới khi đủ Người nhận + Danh hiệu + Nội dung + ≥1 Hashtag; lỗi từng ô hiện khi rời ô (ID-7/11/14/50–52, style lỗi lấy từ frame `5c7PkAibyD`). ID-56 bỏ vì mâu thuẫn spec.
- Q: Gửi thành công từ Homepage / Hệ thống giải? → A: **Đóng modal, ở lại trang**. Trên /sun-kudos tải lại board để Kudo mới hiện đầu feed. Không toast.
- Q: Hashtag tự tạo? → A: **Chỉ chọn từ 13 tag trong bảng `hashtags`** (dropdown `p9zO-c4a4x`). Đủ 5 thì các dòng chưa chọn bị disable; ghi chú "Tối đa 5" là thông báo (ID-17/53).
- Q: Khách chưa đăng nhập trên Homepage bấm Widget? → A: **Hiện menu; Thể lệ xem được; "Viết KUDOS" = link `/login`** (ID-1). /awards-information và /sun-kudos đã bắt đăng nhập ở proxy.

## Quyết định của controller (người dùng có thể phủ quyết)

- Trường **Danh hiệu** (Figma có, CSV thiếu) bắt buộc, 1–100 ký tự (khớp `kudos.title`). Placeholder + 2 dòng gợi ý lấy nguyên văn Figma.
- Lối vào: Widget → menu (Thể lệ / Viết KUDOS / ✕) trên cả 3 màn; pill A.1 trên /sun-kudos mở thẳng modal; nút "Viết KUDOS" trong Thể lệ đóng panel rồi mở modal.
- Ảnh: jpg/png/webp, ≤5 MB/ảnh, ≤5 ảnh; pdf/mp4/txt… báo "định dạng không hợp lệ" (ID-23/24/55). Đủ 5 ảnh ẩn "+ Image" (ID-19/38/40). Kiểm cả MIME lẫn magic bytes phía server.
- Bucket `kudo-images` **public read**, đường dẫn ngẫu nhiên không đoán được (ban đầu `{uid}/{uuid}`, đã thay ở fix round 1 bên dưới). Lý do: board render URL thẳng, ký URL theo từng lần đọc thì phải sửa 2 RPC đọc của #11. Đổi đánh giá nếu ảnh Kudo bị coi là nội bộ tuyệt đối.
- Ẩn danh: checkbox mặc định tắt (ID-6); bật thì hiện ô biệt danh, **không bắt buộc**, ≤50 ký tự; để trống → board hiện nhãn ẩn danh mặc định có sẵn.
- Hủy / Esc / click nền: đóng và xoá form, không hỏi lại (H.1 "bỏ mọi thay đổi").
- Gửi: nút loading + chặn bấm 2 lần; lỗi server → 1 dòng thông báo chung trên footer (không có trong Figma; tối thiểu).
- "Tiêu chuẩn cộng đồng" → `STANDARDS_PATH` mở tab mới (route chưa có, 404 tới khi có plan riêng).
- Người nhận: gõ ≥1 ký tự (sau trim) → gợi ý ≤10, không phân biệt dấu ("Nguyen" khớp "Nguyễn"), bỏ chính mình (DB cũng chặn). `@` trong editor dùng cùng nguồn.
- Add link (`OyDLDuSGEa`): Text 1–100, không toàn khoảng trắng; Link http/https, 5–2048. URL khác http/https bị từ chối (chống `javascript:`).
- Thể lệ: chữ nguyên văn Figma; huy hiệu Hero dùng lại `/images/kudos/hero-*.png` của #11; 6 icon export qua Figma `download_assets` (controller làm, theo bài học #11).
- TC_THELE_GUI_003 / FUN_005 (nút footer disabled): không có trạng thái disabled thật → N/A.
- EN: lấy `list_file_localizations`; chuỗi không có thì tự dịch, ghi vào `reports/en-localizations.md` chờ BTC duyệt (như #11).

## Session 2026-10-19 (Takumi run)

- Asset: 6 icon Thể lệ export qua Figma `download_assets` (node 3204:6082..6088, 2x), cắt vòng tròn 64px → `public/images/kudos/rules/badge-*.png` (128×128, nền trong).
- Frame `5c7PkAibyD` / `p9vFVBE_tc` / `QIMJNgFb8K`: Figma MCP hết quota, MoMorph `get_figma_image` lỗi 500 → **không có ảnh**. Trạng thái lỗi dựng theo spec ("viền đỏ + thông báo") với màu đỏ có sẵn trong frame chính (dấu `*` bắt buộc); ô biệt danh ẩn danh và dropdown người nhận dùng lại style ô input / dropdown hashtag của frame `ihQ26W78P2` + `p9zO-c4a4x`. Ghi lệch Figma cần đo lại khi có ảnh (việc mở).

- Add link: VI theo Figma `OyDLDuSGEa` ("Thêm đường dẫn", "Nội dung", "URL"), EN theo spec CSV ("Add link", "Text", "Link"). E2E sửa accessible name theo VI.
- `create_kudo` thêm policy SELECT Storage (thư mục của mình) vì Storage API xoá bằng `DELETE … RETURNING` cần SELECT; 3 tham số cuối có default.
- Host ảnh: DB không biết URL dự án → tầng đọc của app chỉ nhận ảnh có origin = `NEXT_PUBLIC_SUPABASE_URL` hoặc đường dẫn nội bộ `/images/`; ảnh khác bị bỏ.
- `forbidden` → lỗi `server` (không có ô nào để sửa). Link/mention không hợp lệ bị zod chặn cả khi client bị giả mạo.
- Serializer escape `* _ ~ [ ] \`` → `kudo-plain-text.ts` phải bỏ escape khi hiện trên board.

## Session 2026-10-19 (review pass 1 → fix round 1)

- Critical C1: đường dẫn `{uid}/{uuid}` lộ người gửi Kudo ẩn danh qua URL ảnh public → **đổi sang tên phẳng `{uuid}.{ext}`**; sở hữu kiểm bằng `storage.objects.owner_id = auth.uid()` (Storage tự gán từ JWT) trong policy và trong `create_kudo`. Thay quyết định "đường dẫn `{uid}/{uuid}`" ở trên. Tiêu chí 8 trong `evidence/study-context.json` đổi chữ tương ứng (người dùng xác nhận khi ký riskGate).
- M2: `getClaims()` chạy ngay sau zod, trước khi đọc/sniff ảnh. M1: không copy byte ảnh (sniff `file.slice(0,12)`, upload chính `File`). M3: xoá segment APP1 (EXIF) của JPEG trước khi upload. L1 lỗi size hiện đúng câu; L2 SQL chặn URL ảnh trùng.
- Hoãn (ghi nhận): L3 SQL không kiểm link trong content (board chỉ render plain text; renderer Markdown sau này phải lọc lại khi đọc); L4 mention id không phải uuid → lỗi chung; L5 khách bấm widget fallback trước khi hydrate mở modal thay vì /login.

## Session 2026-10-19 (thử thật của người dùng → fix round 3)

- SQL thật: migration + verify PASS (S1–S5, B0–B6, B7a hiển thị; chờ ảnh 3 dòng cuối B7b–d).
- Lỗi khi thử: gõ email người nhận → không có gợi ý (RPC chỉ tìm theo tên) → không chọn được → Gửi bị khoá; lỗi "Không được để trống" gây hiểu lầm khi ô có chữ.
- Q: Sửa ô Người nhận? → A: **Tìm cả tên + email** (RPC so khớp thêm email, vẫn không trả email), hiện "Không tìm thấy Sunner phù hợp" khi rỗng, gõ mà chưa chọn → "Hãy chọn người nhận trong danh sách gợi ý". Phải chạy lại migration + verify.

## Session 2026-10-19 (fidelity pass ihQ26W78P2 theo yêu cầu "đúng 100% font/cỡ chữ")

- 17 giá trị lệch đã sửa (audit: `reports/figma-fidelity-viet-kudo.md`); dấu `*` dùng Noto Sans JP 700 theo Figma (thêm vào layout).
- Fix Low re-review vòng 3: rời ô Người nhận huỷ lượt tìm đang chờ (E2E RED → GREEN).
- Q: Chữ gõ trong editor đậm bao nhiêu (Figma chỉ có placeholder 700)? → A: **Giữ 500** để nút B còn thấy được.
- Q: "+ Image" khi đủ 5 ảnh (spec ẩn, Figma vẽ hiện)? → A: **Ẩn theo spec**.

## Session 2026-10-19 (@ + tên)

- Đã làm (phase 07): RPC `kudos_search_sunners(p_query, p_limit, p_name_only)` — chuỗi trống → tối đa 10 Sunner có tên theo `full_name, id` (bỏ người gọi); `p_name_only` bỏ khớp email; bản 2 tham số cũ bị drop (không để overload). Trong editor: gõ `@` là hiện danh sách, tên có dấu cách ("@Nguyễn Văn B"), chỉ tìm theo tên, không khớp → hàng "Không tìm thấy Sunner phù hợp" (dùng lại `recipient.noResult`, không thêm chuỗi), Esc đóng danh sách mà không đóng modal. Ô Người nhận: bắt đầu bằng `@` → bỏ `@`, chỉ tìm tên (`@` một mình → danh sách đầu); không có `@` → tên + email như cũ. Người dùng phải chạy lại migration + verify (S3, B3, B5 đổi).

## Test policy

`e2e-red-first` — có validate form, điều hướng, mở/đóng modal, chuyển trạng thái.
