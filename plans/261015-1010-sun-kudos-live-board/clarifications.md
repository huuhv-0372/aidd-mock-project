# Clarifications — Sun* Kudos Live board

MoMorph: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/MaZUn5xHXZ (fileKey `9ypp4enmFmdK3YAFJLIu6C`, Figma node `2940:13431`)
Specs: `plans/momorph-specs/sun-kudos-live-board-MaZUn5xHXZ/{specs,test-cases}.csv`.
Liên quan: Viết Kudo `ihQ26W78P2`, dropdown Hashtag `JWpsISMAaM`, Phòng ban `WXK5AYB_rG`, Secret Box `J3-4YFIpMM`,
hover danh hiệu `twC9br89ra` / `IjeDnHmzou` / `d6zEZ9ccoX` / `XI0QKVv1qZ`, hover x2 tim `gI07KYVJWE`.

## Session 2026-10-15

- Q: Phạm vi so với #12 Viết Kudos và #13 Like? → A: Chỉ #11. DB thiết kế + migrate đủ cho #11/#12/#13. Tim hiển thị đúng trạng thái (số, đỏ/xám, của mình) nhưng toggle thuộc #13; ô Ghi nhận (A.1) thuộc #12; Mở quà thuộc plan Secret Box.
- Q: Dữ liệu demo? → A: File seed SQL riêng (~20 Sunner demo, ~60 kudo, tim, quà, secret box) + script dọn; danh mục (phòng ban, hashtag, quà) nằm trong migration.
- Q: Spotlight Board? → A: Tự viết, không thư viện: vị trí tất định theo hash user id (SSR = client), pan/zoom bằng pointer + wheel + CSS transform.
- Q: Link chi tiết Kudo / profile? → A: Route tương lai `/sun-kudos/[id]` và `/profile/[id]` trong `routes.ts`; hiện là 404. Copy Link sao chép `{origin}/sun-kudos/{id}`.

## Defaults do orchestrator chọn (sửa nếu sai)

- `/sun-kudos` cần đăng nhập (default-deny có sẵn, không sửa proxy). Test `71b3ef43` (guest) → redirect `/login`.
- Danh hiệu Kudo = trường **Danh hiệu** trong Figma Viết Kudo (CSV thiếu) → cột `kudos.title`, hiện ở card ("IDOL GIỚI TRẺ"). Click vào nó: spec D.4 nói lọc theo danh hiệu — **hoãn** (không có bộ lọc danh hiệu trong Figma); hiển thị readonly.
- Danh hiệu Hero theo số người gửi (New 1–4, Rising 5–9, Super 10–20, Legend >20) — từ frame hover; hover badge hiện tooltip đúng frame.
- Hoa thị: ≥10 / ≥20 / ≥50 Kudo nhận → 1/2/3; hover hoa thị hiện đoạn mô tả trong spec B.3.2.
- **Câu hỏi mở (không chặn #11):** tim cộng cho người **gửi** hay **nhận** Kudo? Spec C.4.1 câu đầu nói người gửi, câu cuối nói "thu hồi trên tài khoản nhận". Mặc định: người gửi (theo 2 câu đầu). Chỉ ảnh hưởng 1 dòng trong `kudos_my_stats`. Cần BTC xác nhận trước #13.
- Lọc phòng ban = phòng ban người nhận. Hashtag + phòng ban kết hợp AND. Trạng thái lọc trên URL `?hashtag=<slug>&department=<code>`; giá trị lạ → bỏ qua. Đổi lọc → carousel về 1/5, feed tải lại từ đầu.
- Click hashtag trên card → đặt bộ lọc Hashtag = tag đó (thay tag cũ).
- Spotlight và "388 KUDOS" **không** theo bộ lọc (spec chỉ nói lọc Highlight + All Kudos). Tổng = số kudo toàn hệ thống.
- Ô tìm kiếm Spotlight: tối đa 100 ký tự (chặn nhập + zod); rỗng → bỏ highlight, không báo lỗi (spec "Không bắt buộc" thắng test case `9e689933` bước 3). Không có kết quả → dòng thông báo ngắn.
- Không realtime. "Live" = dữ liệu mới mỗi lần tải trang; dòng ticker góc Spotlight hiện 5 kudo mới nhất lúc tải.
- Feed: 10 kudo/lần, infinite scroll bằng IntersectionObserver + Server Action (zod). Lỗi tải → thông điệp chung + nút thử lại.
- Thời gian `HH:mm - MM/DD/YYYY` giờ Việt Nam (UTC+7), giống nhau ở cả 2 ngôn ngữ.
- Nội dung: highlight cắt 3 dòng, feed cắt 5 dòng (`line-clamp`); hashtag 1 dòng, tối đa 5, tràn → "...". Ảnh tối đa 5, click mở ảnh lớn trong `<dialog>`.
- Hover preview profile (frame `Bf5XiTE7AO` còn in_progress) → hoãn. Avatar/tên là link `/profile/{id}`.
- Ô "Tìm kiếm profile Sunner" cạnh A.1, ô A.1 "Ghi nhận", nút "Mở quà": dựng đúng Figma, `aria-disabled="true"`, không handler; plan sau gắn hành vi. Không đổi giao diện khi disabled.
- Tim ở #11 là phần tử hiển thị (`<span>` có aria-label "N lượt thả tim"), không phải nút; #13 đổi thành nút.
- Danh sách "10 Sunner có sự thăng hạng mới nhất" (spec D, không có trong Figma) → bỏ.
- Header: dùng `SiteHeader` có sẵn, `activeHref = /sun-kudos`. Footer, widget dùng lại.
- i18n: VI = chuỗi Figma nguyên văn; EN từ `list_file_localizations`, chuỗi không có trong Figma tự dịch, đánh dấu `/* not from Figma */` và liệt kê ở `reports/en-localizations.md`. Tên hashtag/quà: cột `name_vi`/`name_en`. Mã phòng ban giống nhau 2 ngôn ngữ. Toast "Link copied — ready to share!" giữ nguyên ở VI (Figma là tiếng Anh).
- Ảnh avatar từ Google: `next/image` với `unoptimized` (64px, không cần loader trên Workers). Ảnh demo nằm ở `public/images/kudos/demo/`.
- Test policy: **e2e-red-first** (lọc, carousel, infinite scroll, copy link, điều hướng).
