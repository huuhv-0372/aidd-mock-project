# Changelog

Ghi các thay đổi đáng kể về hành vi. Mới nhất ở trên. Chi tiết mã nằm ở `git log`.

## 2026-10-22

### Sửa: vòng review trang Xem Kudo (renderer, bảng, cookie `next`, focus, font)

- Sửa (trung bình): `lib/kudos/kudo-content-blocks.ts` dựng `URL` cho mọi đích liên kết rồi bắt lỗi, nên mỗi đích không hợp lệ tốn gấp khoảng 25 lần đích hợp lệ trên mỗi lượt xem (nội dung không tin cậy). Nay gọi `URL.canParse` trước, chỉ dựng `URL` khi đích parse được.
- Sửa (trung bình): `@[Tên](đích)` trước đây thành mention với mọi đích. Nay chỉ khi đích có dạng uuid 8-4-4-4-12 hex (cùng luật `pgUuid` ở `lib/validation/write-kudo.ts`, viết lại trong file để module không phụ thuộc gì); đích khác thì `@` là chữ và `[Tên](đích)` vẫn qua bộ lọc liên kết như thường.
- Sửa (trung bình, mất chữ hiển thị): đoạn gõ `2025. Năm mới` hay `> x` không còn bị đọc thành danh sách/trích dẫn.
  - Serializer (`kudo-content-markdown.ts`) thoát `N.` và `>` ở đầu dòng khi đó là chữ gõ vào (`N\.`, `\>`); một khối trích dẫn rỗng không ghi gì (trước đây ghi `>` trơ trọi).
  - Renderer (`kudo-content-blocks.ts`): bảng thoát thêm `.` và `>`; dòng chỉ có số và dấu chấm (`2025.`) là chữ, trừ khi có dòng nối tiếp (dòng kế đánh số N+1, hoặc dòng thụt ba dấu cách); dòng `>` trơ trọi trong trích dẫn bị bỏ như dòng trống; trích dẫn không có chữ nào giữ `>` làm chữ. Nội dung lưu trước khi serializer thoát được vẫn đọc đúng.
- Sửa (thấp): bảng `kudo-plain-text.ts` nay chỉ bỏ đúng những dấu mà trang chi tiết đọc (`N. `, `>`), cùng bảng thoát, nên không còn nuốt `- `, `# `, `+ `, `1) ` mà trang chi tiết hiện nguyên. Hệ quả: validator ghi nhận nội dung `>` là có chữ (`tests/unit/write-kudo-validation.test.ts` đổi kỳ vọng từ `false` sang `true`); editor không bao giờ sinh nội dung này vì serializer bỏ khối trích dẫn rỗng.
- Sửa (trung bình, xác thực): cookie `saa_post_login_next` không thực sự bị xoá ở callback. Callback gắn `Max-Age=0` bằng `response.cookies.set`, nhưng khi store `cookies()` đã bị ghi (Supabase ghi cookie phiên ở callback) thì Next 16.4 phân tích lại `Set-Cookie` của chính response, và bộ phân tích (`@edge-runtime/cookies`, `compact()`) bỏ giá trị `Max-Age=0` vì falsy, nên trình duyệt giữ một cookie rỗng. Nay xoá qua `cookies().set(…, "", postLoginNextCookieOptions(0))` trong module riêng `lib/auth/clear-post-login-next-cookie.ts`; `app/auth/callback/route.ts` `await` hàm đó trên mọi lối thoát, trong khối `try`, nên lỗi `cookies()` vẫn kết thúc bằng redirect lỗi đăng nhập.
- Bẫy bundle: nhúng thẳng `next/headers` vào route callback làm bundler phát ra thêm một chunk server trùng lặp khoảng 296 KB; để trong module riêng thì không. Worker gzip lần đo cuối: 2243.72 KiB (giới hạn 10 MiB bản trả phí).
- Sửa (thấp): `app/[locale]/sun-kudos/[id]/page.tsx` không tạo client Supabase trước nữa; `getKudoDetail(id)` tự tạo client sau khi kiểm `id`, nên biến môi trường hỏng cho `id` sai dạng vẫn là 404 và với `id` hợp lệ là dòng lỗi chung trong khung, không phải 500.
- Sửa (thấp, truy cập): vòng focus bàn phím trên thẻ Kudo màu kem (`#fff8e1`). Màu chung `login-accent` (`#ffea9e`) chỉ đạt khoảng 1.13:1 trên nền đó; `components/kudos/kudo-card-focus-ring.ts` (`KUDO_CARD_FOCUS_RING`) dùng `login-bg` (`#00101a`, khoảng 18:1; WCAG 1.4.11 cần 3:1) cho các điều khiển trên thẻ board và trang chi tiết (`copy-kudo-link-button`, `kudo-detail-close-button`, `kudo-hashtag-list`, `kudo-hearts`, `kudo-highlight-card`, `kudo-image-gallery`, `kudo-person`, `kudo-post-card`). Điều khiển trên nền tối (header, lightbox) giữ vòng cũ.
- Sửa (thấp, giao diện): `app/[locale]/layout.tsx` nạp Montserrat thêm bản 800 và 900 (trước chỉ 400/500/700), nên `<strong>` trong khối chữ 700 vẽ bằng bản đậm thật. Độ đậm khối nội dung vẫn 700 như thẻ board (quyết định của chủ dự án, `plans/261021-view-kudo/clarifications.md`).
- Test:
  - Unit mới: `kudo-content-blocks-hardening` (đích liên kết không phải URL, mention cần uuid, dấu đầu dòng, độ sâu lồng, mục danh sách rỗng), `kudo-content-round-trip` (serializer rồi parser trả đúng cấu trúc, kèm 300 tài liệu editor ngẫu nhiên có hạt giống). Cập nhật: `kudo-content-blocks`, `kudo-content-markdown`, `kudo-plain-text`, `get-kudo-detail`, `auth-callback-next` (kỳ vọng xoá qua `cookies()`, không có `Set-Cookie` thứ hai ở response), `resolve-auth-redirect`, `write-kudo-validation`.
  - E2E mới: `kudo-detail-hardening.spec.ts` (nội dung không tin cậy, id uuid hoa/thường và sai dạng, nút Đóng giữ bộ lọc, Kudo ẩn danh), `kudo-detail-login-next.spec.ts` (chạy callback thật với PKCE giả, kiểm cookie), `kudo-detail-visual-contract.spec.ts` (tương phản vòng focus, font 800/900). Hỗ trợ: `support/kudo-detail-fake.mjs` (chế độ `leak-sender`, `own-anon` theo `sub`; điều khiển `/__kudo-detail-mode`), `support/kudo-detail-helpers.ts`, `support/focus-contrast.ts`; Supabase giả trả lỗi kiểu `22P02` cho `p_id` không phải uuid và trả token cho bước đổi mã PKCE.
  - Kết quả lần chạy cuối (do controller báo): unit 778, E2E 267.
- Tài liệu cập nhật: `README.md`, `docs/codebase-summary.md`, `docs/system/permissions.md`, `docs/project-changelog.md` (cũng bỏ dòng "SQL chưa ghi nhận đã chạy" ở mục 2026-10-21 vì đã mâu thuẫn với verify 6/6 PASS).

## 2026-10-21

### Thêm: trang Xem Kudo (`/sun-kudos/<id>`)

- Route mới `app/[locale]/sun-kudos/[id]/page.tsx` (Figma 520:18779): một Kudo đầy đủ trong khung 680px, header dùng chung, không footer và không widget Viết KUDOS. Chỉ người đã đăng nhập (không vào `PUBLIC_PATHS`). `id` sai dạng (`kudoIdSchema`, `z.guid()`, kiểm trước mọi truy vấn) hoặc không có Kudo thì `notFound()`: HTTP 404 thật. Đọc lỗi thì hiện một dòng chung trong khung, chi tiết chỉ ở log máy chủ.
- Mã: `components/kudos/kudo-detail-layout.tsx`, `kudo-detail-card.tsx`, `kudo-detail-close-button.tsx`; `lib/kudos/get-kudo-detail.ts` (`getKudoDetail`: `ok`, `not_found` hoặc `error`, không throw). Chữ ở khoá mới `kudos.detail` (`messages/{vi,en}/kudos.ts`; khối `postCard` tách ra để `allKudos.card` và `detail.card` dùng chung). Tiêu đề tab và thông báo lỗi, cùng chữ EN "Close", là chuỗi nhóm tự dịch (`not from Figma`).
- Nội dung hiện đủ định dạng: `components/kudos/kudo-rich-content.tsx` + `lib/kudos/kudo-content-blocks.ts` đọc Markdown rút gọn đã lưu (đậm, nghiêng, gạch, danh sách đánh số, trích dẫn, liên kết, `@Tên` hiện in đậm). Chạy qua React, không `dangerouslySetInnerHTML`; chỉ liên kết `http(s)` thành `<a>` (tab mới, `rel="noopener noreferrer"`), đích khác chỉ hiện nhãn; không backtrack trên văn bản không tin cậy. (Hạn chế ban đầu: đoạn bắt đầu bằng `2025. ` hay `>` hiện thành danh sách hoặc trích dẫn; đã sửa ngày 2026-10-22, xem mục dưới.)
- Lối vào: nội dung thẻ All Kudos nay là `<Link>` tới trang này (`kudo-post-card.tsx`); "Xem chi tiết" của Highlight, Spotlight Board và link Copy Link đã trỏ sẵn tới `kudoDetailHref`, trước đây rơi vào 404. `kudo-hashtag-list` thêm prop `wrap`, `kudo-image-gallery` thêm prop `plain` (chỉ dùng ở trang này); `kudo-person` sửa padding của link tên.
- Nút "Đóng": quay lại chỉ khi mục liền trước trong Navigation API là trang cùng site và không phải `/login`, không thì về `/sun-kudos` (không có API thì dùng `document.referrer` cùng site kèm `history.length > 1`).
- Supabase (chạy tay): `supabase/migrations/20261021120000_create_kudo_detail_rpc.sql` (kèm `rollbacks/…_down.sql`, `verify/…_verify.sql`). Thêm RPC `kudo_detail(p_id uuid)` trả `setof kudo_row` qua `kudos_rows`, nên cùng quy tắc ẩn danh với bảng: `SECURITY DEFINER`, kiểm quy tắc tài khoản trước tiên, chỉ `authenticated`; tài khoản bị từ chối và `id` không có đều trả 0 dòng (không lộ Kudo có tồn tại). Đã chạy trên Supabase thật ngày 2026-10-21, verify 6/6 PASS (chủ dự án xác nhận, nguồn: `plans/261021-view-kudo/clarifications.md`; repo chưa lưu output verify).
- Test: E2E `tests/e2e/kudo-detail.spec.ts` (+ `support/kudo-detail-contract.ts`; `kudos-fixtures.mjs` thêm `DETAIL_KUDO` và route `kudo_detail`; `kudo-hearts-fake.mjs` phủ trạng thái tim cho cả `kudo_detail`); unit `get-kudo-detail`, `kudo-content-blocks`, `kudo-rich-content`.
- Giới hạn đã biết:
  - E2E dùng Supabase giả nên không bắt được lỗi SQL: môi trường mới phải chạy migration rồi file verify (mọi dòng PASS).
  - Ghi chú bảo mật liên kết nội dung: `create_kudo` vẫn không kiểm đích liên kết; trang này lọc khi đọc nên rủi ro được chặn ở lúc hiển thị, chưa chặn lúc ghi.
- Tài liệu cập nhật: `README.md`, `docs/codebase-summary.md`, `docs/system/permissions.md`, `docs/features/F001_CountdownPrelaunchGate/functional-spec.md` và `technical-spec.md` (một dòng edge case mỗi file), `docs/project-changelog.md`.

### Thêm (bảo mật): quay lại đúng Kudo sau đăng nhập, `next` theo danh sách cho phép

- Trước đây `/` là đích duy nhất sau đăng nhập, không có tham số `next` nên không có open redirect. Nay khách mở `/sun-kudos/<guid>` được đưa sang `/login?next=/sun-kudos/<guid>` và quay lại đúng Kudo sau khi đăng nhập; người đã đăng nhập mở `/login?next=…` hợp lệ thì về thẳng đó.
- Danh sách cho phép, không phải bộ lọc: `lib/auth/post-login-next.ts` (`parsePostLoginNext`) chỉ nhận đúng `/sun-kudos/<guid>` (không query, hash, dấu `/` cuối, mã hoá hay khoảng trắng; tối đa 64 ký tự), trả dạng chữ thường; mọi thứ khác (URL ngoài site, `//host`, mảng) là `null` và về `/`. Kiểm lại ở proxy, trang login, Server Action và callback. `next` chỉ làm trường ẩn của form, không bao giờ in ra trang.
- Đích qua vòng Google bằng cookie `saa_post_login_next` (`httpOnly`, `SameSite=Lax`, `Secure` ở production, 600 giây), không gắn vào `redirectTo`. `signInWithGoogle` nay nhận `FormData` và ghi hoặc xoá cookie; `app/auth/callback/route.ts` kiểm lại cookie, chuyển tới đó, và xoá cookie trên mọi lối thoát (kể cả lỗi), nên đích không sống lâu hơn lần đăng nhập đó.
- `resolveAuthRedirect(pathname, isAuthenticated, next = null)` nay trả `string | null` (trước là `"/" | "/login" | null`); `proxy.ts` truyền `?next`; `POST_LOGIN_PATH` vẫn là `/`.
- Phạm vi: chạm xác thực và mở một điểm nhận đích từ client. Hệ quả: không có đường nào để redirect rời site hay tới đường dẫn khác ngoài `/sun-kudos/<guid>`; thất bại ghi cookie chỉ mất chuyến quay lại.
- Test: unit `post-login-next`, `sign-in-with-google-next`, `auth-callback-next`, `resolve-auth-redirect` (thêm nhóm ca `next`); E2E trong `kudo-detail.spec.ts` (khách về `/login?next=…`, `next` ngoài site không redirect).
- Tài liệu cập nhật: `docs/codebase-summary.md` (mục Đăng nhập Google), `docs/system/permissions.md`, `README.md`.

### Đổi: trang 404 theo Figma; thêm: trang 403 và `forbidden()`

- Trang 404 dựng lại theo Figma 1378:5063: nền `error-bg.webp` phủ màu `#00101A`, tiêu đề, ảnh robot 702x545, mô tả, không header/footer. Nút "Về trang chủ" / "Back to home" không có trong Figma, giữ theo yêu cầu. Tiêu đề VI "Không tìm thấy trang" hiển thị IN HOA bằng CSS để khớp "NOT FOUND"; tiêu đề EN nay là "NOT FOUND" (trước là "Page not found"; tiêu đề tab EN vẫn "Page not found | SAA 2025").
- Trang 403 "Truy cập bị từ chối" / "Access Denied" mới (Figma 2182:9291), cùng khung với 404. `next.config.ts` bật `experimental.authInterrupts` (còn là thử nghiệm ở Next 16) nên route nào cũng gọi được `forbidden()` từ `next/navigation` để hiện `app/[locale]/forbidden.tsx`; gọi trước khi response bắt đầu stream, nếu không status vẫn 200. Route `/403` (`app/[locale]/403/page.tsx`) gọi `forbidden()` để xem trước và trả HTTP 403. Hiện chưa có route nghiệp vụ nào gọi `forbidden()`.
- **Công khai** theo quyết định của chủ dự án 2026-10-21: `/403` vào `PUBLIC_PATHS` (`lib/auth/constants.ts`, hằng `FORBIDDEN_PATH` ở `lib/navigation/routes.ts`) vì trang không chứa dữ liệu. Khớp đúng đường dẫn nên `/403/x` vẫn về `/login`.
- Khách mở đường dẫn không tồn tại vẫn bị đưa sang `/login` (default-deny), không thấy 404: cố ý, để khách không dò được đường dẫn nào có thật. Trang 404 (HTTP 404) chỉ hiện cho người đã đăng nhập.
- Mã: khung chung `components/errors/` (`error-screen.tsx`, `use-error-copy.ts`, `access-denied-content.tsx`); `components/not-found/not-found-content.tsx` dùng lại khung đó. Chữ: `messages/{vi,en}/not-found.ts` và khoá mới `forbidden` (`messages/{vi,en}/forbidden.ts`, đã vào `Dictionary`). Ảnh: `public/images/errors/`.
- Test: `tests/e2e/error-pages.spec.ts` mới (404 cho người đã đăng nhập, khách bị đưa sang `/login`, `/403` trả HTTP 403 cho khách và người đã đăng nhập, VI/EN, nút về trang chủ, nền, mobile 375); `language-switch-authed.spec.ts` đổi tiêu đề EN kỳ vọng thành "NOT FOUND"; `resolve-auth-redirect.test.ts` thêm `/403` (công khai, kể cả dấu `/` cuối) và `/403/x` (chặn); `routes.test.ts` thêm `FORBIDDEN_PATH`.
- Giới hạn đã biết: chữ EN của trang 404 và tiêu đề EN của 403 lấy từ Figma; mô tả EN của 403 (Figma chép nhầm câu của 404) và toàn bộ chữ VI là bản nhóm tự dịch. Thân trang lỗi render ở client.
- Tài liệu cập nhật: `README.md`, `docs/codebase-summary.md`, `docs/system/permissions.md`, `docs/features/F001_CountdownPrelaunchGate/functional-spec.md` (một dòng edge case), `docs/project-changelog.md`.

### Thêm: trang Tiêu chuẩn chung (`/tieu-chuan-chung`)

- Trang mới `app/[locale]/tieu-chuan-chung/page.tsx` (Figma web 1161:8944) với hai khối `components/standards/`: `standards-hero` (key visual) và `standards-content` (`<h1>` ẩn thị giác, `<ol>` 10 tiêu chuẩn cộng đồng, `<ul>` 2 mục bảo mật, dòng liên hệ BTC). Chữ ở `messages/vi/standards.ts` và `messages/en/standards.ts` (khoá `standards` đã vào `Dictionary`). Chữ EN ngoài hai tiêu đề lấy từ Figma là bản nhóm tự dịch (danh sách ở `plans/261021-community-standards/reports/en-localizations.md`).
- **Công khai** theo quyết định của chủ dự án 2026-10-21: `PUBLIC_PATHS` (`lib/auth/constants.ts`) nay gồm `/`, `/login`, `/auth/callback`, `/countdown`, `/tieu-chuan-chung`. Khớp đúng đường dẫn nên `/tieu-chuan-chung/x` vẫn về `/login`. Trang dùng header, footer chung, không có widget nổi Viết KUDOS.
- `SiteFooter` nhận thêm `activeHref` tuỳ chọn: link footer của trang hiện tại có `aria-current="page"` và kiểu "đang chọn" (trùng kiểu hover). Thêm `xl:gap-x-0` để dòng bản quyền không xuống hàng ở 1440.
- Hai link trước đây rơi vào 404 nay mở trang này: "Tiêu chuẩn chung" ở footer và "Tiêu chuẩn cộng đồng" trên thanh công cụ Viết Kudo (mở tab mới, modal giữ nguyên).
- Test: `tests/e2e/standards.spec.ts` (khách và người đã đăng nhập, nội dung VI/EN, `aria-current`, hai điểm vào, mobile 375); `tests/unit/resolve-auth-redirect.test.ts` thêm ca `/tieu-chuan-chung` (công khai, kể cả dấu `/` cuối) và `/tieu-chuan-chung/x` (chặn).
- Tài liệu cập nhật: `README.md`, `docs/codebase-summary.md`, `docs/system/permissions.md`, `docs/features/F001_CountdownPrelaunchGate/functional-spec.md` (một dòng edge case), `docs/project-changelog.md`.

## 2026-10-20

### Thêm: thả tim cho Kudo (tính năng #13)

- Trái tim trên thẻ Kudo (Highlight và All Kudos) nay bấm được: `components/kudos/kudo-hearts.tsx` là nút `aria-pressed`; Kudo của chính mình thì `disabled`, đang chờ kết quả thì `aria-disabled`. `KudoHeartsProvider` (`kudo-hearts-store.tsx`, bọc `main` trong `app/[locale]/sun-kudos/page.tsx`) giữ trạng thái theo id Kudo nên một Kudo hiện ở cả hai khối đổi cùng lúc. Bấm là lật tim và số ngay (lạc quan), khoá nút tới khi máy chủ trả lời; máy chủ từ chối hoặc lỗi thì hoàn lại giá trị cũ và hiện toast.
- `components/ui/status-toast.tsx` (`useStatusToast`): toast dùng chung, `Copy Link` chuyển sang dùng nó. Khoá chữ mới `hearts.error` (VI và EN, chuỗi không lấy từ Figma).
- Server Action `setKudoHeart` (`lib/kudos/set-kudo-heart-action.ts`): validate `{ kudoId, liked }` bằng zod (`setKudoHeartInputSchema`, `kudoHeartStateSchema` trong `lib/validation/kudos.ts`), gọi RPC, chỉ tin kết quả của CSDL; lỗi chỉ log, client nhận `own` hoặc `generic`.
- Supabase (chạy tay): `supabase/migrations/20261020150000_create_kudo_heart_rpc.sql` (kèm `rollbacks/…_down.sql`, `verify/…_verify.sql` H1–H6). Thêm RPC `set_kudo_heart(p_kudo_id, p_liked)` trả `(liked, heart_count)`: **đặt** trạng thái chứ không đảo, `SECURITY DEFINER`, chỉ `authenticated`, đường ghi duy nhất vào `kudo_hearts`; lỗi SQLSTATE `22023` với `forbidden`, `not_found`, `own_kudo`. Trigger x1/x2 của migration `20261015100000` giữ nguyên: ngày x2 cấu hình bằng SQL ở `special_heart_days` (chưa có giao diện quản trị), `hearts_awarded` được lưu nên bỏ tim lấy lại đúng 1 hoặc 2.
- Quy tắc nghiệp vụ: tim cộng cho người **gửi** Kudo (`kudos_my_stats.hearts_received`); số trên thẻ là số lượt thả (`heart_count`), không phải số tim được tặng. Câu hỏi mở 2026-10-15 (tim thuộc người gửi hay người nhận) đã được chủ dự án chốt ngày 2026-10-19: người gửi.
- Test: unit `set-kudo-heart-action`; E2E `tests/e2e/kudo-hearts.spec.ts` (Supabase giả mở rộng bằng `support/kudo-hearts-fake.mjs`, `kudo-hearts-contract.ts`; `fake-supabase-server.mjs` thêm route `set_kudo_heart`); `sun-kudos-feed.spec.ts` và `kudos-contract.ts` cập nhật theo nút tim mới.
- Giới hạn đã biết:
  - SQL đã chạy trên Supabase thật ngày 2026-10-20: migration + file verify 7/7 PASS, kèm một lần thả tim thật qua Google (`plans/261020-1429-like-kudos/reports/db-verify-result.md`). E2E vẫn chạy với Supabase giả.
  - Chuỗi EN `hearts.error` do nhóm tự dịch, chờ BTC duyệt.
  - Chưa làm: ô tìm hồ sơ ở banner, trang chi tiết Kudo và trang hồ sơ.
- Tài liệu cập nhật: `README.md`, `docs/codebase-summary.md`, `docs/system/permissions.md`, `docs/project-changelog.md`.

### Sửa: vòng rà soát Viết Kudo (bảo mật, độ ổn định E2E, rollback ảnh)

Mức độ: cao cho ReDoS trước đăng nhập (parse zod chạy trước kiểm phiên nên ai cũng gọi tới được), trung bình cho phần còn lại. Ảnh hưởng: một request nội dung dài có thể ngốn CPU trước khi kiểm phiên; ảnh có thể bị xoá khi Kudo đã tạo; Esc đóng cả modal ngoài ý muốn.

- Sửa (bảo mật, cao): `lib/validation/write-kudo.ts` thêm `.max(5000, { abort: true })` trước các `refine` (zod 4 vẫn chạy `refine` sau một kiểm tra hỏng); quét liên kết chạy tuyến tính (nhãn không chứa `[`, cắt phần sau dấu `)` cuối). `kudo-plain-text.ts` và `kudo-content-markdown.ts` cũng bỏ regex bậc hai (`wrap`, cắt khoảng trắng bằng `trimStart`/`trimEnd`). Hệ quả: Markdown viết tay có dấu lồng nhau không thoát thì không còn bị bỏ dấu; dấu định dạng bắt qua xuống dòng cứng được đóng và mở lại theo từng dòng.
- Sửa (dữ liệu, trung bình): `create-kudo-action.ts` chỉ xoá ảnh vừa tải khi lỗi xảy ra trước khi gửi RPC hoặc CSDL trả lỗi có mã. Kết quả chưa rõ (lỗi mạng, quá hạn, ngoại lệ sau khi gửi RPC) thì giữ ảnh, chấp nhận khả năng có ảnh mồ côi thay vì Kudo mất ảnh. Ánh xạ mã lỗi sang trường dùng `Object.hasOwn`.
- Sửa (UI, trung bình): `use-dismissable.ts` chỉ nuốt Esc khi popup nằm trong modal `<dialog>` trên cùng (hoặc không modal nào mở): dropdown trong modal đóng một mình, dropdown bỏ mở phía sau modal không chặn Esc đóng modal.
- Sửa (UI, trung bình): nạp danh mục hashtag lỗi nay hiện cảnh báo và nút "Thử lại" (`use-hashtag-options.ts`, `hashtag-load-error.tsx`). Nội dung quá 5000 ký tự Markdown bị báo ngay khi gõ và khoá nút Gửi; trường bị máy chủ từ chối hiện `errors.invalid` thay vì "Không được để trống". Khoá i18n mới (VI và EN): `errors.contentTooLong`, `errors.invalid`, `hashtag.loadFailed`, `hashtag.retry`.
- Sửa (test): E2E bớt chập chờn nhờ Supabase giả có điều khiển trễ và lỗi theo `?sub=` (`/__kudo-delay-search`, `/__kudo-fail-hashtags`, `/__kudo-delay-hashtags`, `/__kudo-refuse-once`).
- Test: thêm `tests/e2e/write-kudo-resilience.spec.ts`, unit `create-kudo-action-rollback.test.ts` và `kudo-client-limits.test.ts`; mở rộng `write-kudo-validation`, `kudo-content-markdown`, `kudo-plain-text`.
- Đính chính tài liệu ngày 2026-10-19 (các câu đã sai hoặc nói quá; đã sửa ở mục đó, `README.md`, `docs/codebase-summary.md`, `docs/system/permissions.md`):
  - Ảnh vừa tải không bị xoá "khi RPC lỗi" nói chung, chỉ khi lỗi có mã hoặc xảy ra trước khi gửi RPC.
  - zod không chặn được mọi liên kết xấu: dạng lồng ngoặc, `<javascript:…>` và liên kết tham chiếu qua được; chỉ an toàn vì thẻ render chữ thuần, phải sửa trước khi có renderer Markdown.
  - "Bỏ metadata cá nhân" là best-effort và chỉ trên đường UI → Server Action (tải thẳng lên Storage bằng publishable key bỏ qua); JPEG dùng deny-list APP1/APP11/APP13/COM.
  - `kudos_search_sunners` vẫn không bao giờ trả email, nhưng khớp chuỗi con theo email nên có thể bị dò.
- Tài liệu cập nhật: `README.md`, `docs/codebase-summary.md`, `docs/system/permissions.md`, `docs/project-changelog.md`.

## 2026-10-19

### Thêm: Viết Kudo, widget nổi và panel Thể lệ (tính năng #12)

- Widget nổi (`components/site-shell/widget-button.tsx`) nay mở menu: A "Thể lệ", B "Viết KUDOS", C đóng (Esc hoặc bấm ngoài cũng đóng). Có trên `/`, `/awards-information`, `/sun-kudos`; mỗi trang bọc trong `KudosComposer` (`components/kudos-compose/`), provider giữ trạng thái hai lớp phủ. Trang chủ công khai nên widget đọc phiên trong `Suspense` (`WidgetSessionGate`): khách xem được Thể lệ, còn "Viết KUDOS" dẫn sang `/login`.
- Panel Thể lệ (`kudos-rules-*.tsx`, sáu huy hiệu ở `public/images/kudos/rules/`) và modal Viết Kudo: người nhận (gõ chữ thường thì tìm theo tên hoặc email, "@tên" chỉ tìm theo tên, không phân biệt dấu; không thấy thì hiện "Không tìm thấy Sunner phù hợp", gõ mà chưa chọn thì báo "Hãy chọn người nhận trong danh sách gợi ý"), tiêu đề, nội dung giàu định dạng (Tiptap v3, nạp phía client bằng `next/dynamic`; in đậm, nghiêng, gạch, danh sách số, trích dẫn, liên kết, `@` nhắc người: liệt kê Sunner ngay khi gõ "@", tên có dấu cách, tự đóng khi chữ sau "@" không khớp ai mà vẫn viết tiếp), 1–5 hashtag, tối đa 5 ảnh, ẩn danh kèm bí danh tuỳ chọn. Nút A.1 trên `/sun-kudos` (trước đây `aria-disabled`) nay mở modal; ô tìm hồ sơ vẫn chỉ hiển thị. Gửi xong modal đóng và route làm mới; `all-kudos-section` thêm id Kudo đầu vào khoá feed để danh sách khởi động lại từ trang 1.
- Server Actions (`lib/kudos/`): `createKudo`, `searchSunners`, `getHashtagOptions`. Input qua zod `lib/validation/write-kudo.ts` (zod kiểm liên kết `http(s)` và mention `@[Tên](uuid)` theo kiểu cố gắng, không đầy đủ: xem mục 2026-10-20); `kudo-content-markdown.ts` đổi JSON của editor thành Markdown rút gọn (`**b** _i_ ~~s~~ 1. > [t](https://…) @[Tên](uuid)`); `kudo-plain-text.ts` trả lại ký tự đã thoát khi hiện chữ thuần. Lỗi chỉ log phía server, client nhận mã chung.
- Ảnh (`kudo-image-file.ts` và `strip-*-metadata.ts`, `exif-orientation.ts`): kiểm byte đầu (không tin tên file hay MIME client), ≤ 5 MB, ≤ 5 ảnh; JPEG chỉ giữ Orientation, PNG và WebP bỏ chunk metadata, phần đuôi sau ảnh bị cắt. Chưa xác thực phiên thì không đọc byte ảnh nào. Ảnh vừa tải chỉ bị xoá khi Kudo chắc chắn không tồn tại (xem mục 2026-10-20); bỏ metadata là best-effort, chỉ trên đường Server Action.
- Phía đọc: `lib/validation/kudos.ts` chỉ giữ ảnh có đường dẫn `/images/` hoặc cùng origin Supabase (CSDL không ghim host của URL ảnh nên không tin dữ liệu đã lưu).
- `next.config.ts`: `experimental.serverActions.bodySizeLimit` và `experimental.proxyClientMaxBodySize` cùng `26mb` (5 ảnh × 5 MB + chữ trong một Server Action; mặc định 1 MB và 10 MB). Thư viện mới: `@tiptap/*` 3.31.4 (chỉ vào chunk client; Worker gzip đo ngày 2026-10-19 là 2220.10 KiB, giới hạn free 3072 KiB).
- Supabase (chạy tay): `supabase/migrations/20261019110000_create_kudo_write.sql` (kèm `rollbacks/…_down.sql`, `verify/…_verify.sql`). Thêm RPC `create_kudo` (`SECURITY DEFINER`; người gửi luôn là `auth.uid()`; lỗi SQLSTATE `22023` kèm mã ngắn), RPC `kudos_search_sunners(p_query, p_limit, p_name_only)` (`unaccent`, tìm theo tên hoặc email với email khớp nguyên xếp đầu, `p_name_only` chỉ tìm theo tên, chuỗi trống trả tối đa 10 Sunner có tên, không trả email, loại người gọi), hàm bọc `kudos_unaccent`, bucket công khai `kudo-images` (5 MiB, jpeg/png/webp, tên đối tượng phẳng `{uuid}.{ext}` không chứa id người gửi để Kudo ẩn danh không lộ người viết) với policy INSERT, SELECT, DELETE trên đối tượng của chính mình (`storage.objects.owner_id`).
- Giao diện modal đối chiếu lại với khung Figma `ihQ26W78P2` (`plans/261019-1022-write-kudos/reports/figma-fidelity-viet-kudo.md`): nạp `Noto_Sans_JP` 700 chỉ cho dấu `*` bắt buộc (`app/[locale]/layout.tsx`), chữ gõ trong editor giữ đậm 500, nút "+ Image" ẩn khi đủ 5 ảnh (quyết định của chủ dự án).
- Test: unit `write-kudo-validation`, `create-kudo-action`, `kudo-lookup-actions`, `kudo-content-markdown`, `strip-jpeg-metadata`, `strip-jpeg-orientation`, `strip-png-metadata`, `strip-webp-metadata` (và `kudo-plain-text`, `kudos-validation` mở rộng); E2E `tests/e2e/write-kudo.spec.ts`, `kudos-quick-actions.spec.ts` (Supabase giả mở rộng bằng `support/write-kudo-fixtures.mjs`, phản chiếu SQL; `fake-supabase-server.mjs` thêm route Storage và `keepAliveTimeout` 30 giây).
- Giới hạn đã biết:
  - SQL đã chạy trên Supabase thật ngày 2026-10-19: migration + file verify 16/16 PASS, kèm một lần gửi Kudo có ảnh và một Kudo ẩn danh thật qua Google (`plans/261019-1022-write-kudos/reports/db-verify-result.md`). E2E vẫn chạy với Supabase giả.
  - Ghi chú bảo mật chưa xử lý: `create_kudo` không kiểm đích liên kết trong `content` (việc kiểm chỉ ở zod của Server Action, nên gọi thẳng RPC bằng publishable key vẫn lưu được liên kết tuỳ ý). An toàn hiện nay vì bảng render chữ thuần; renderer Markdown nào thêm sau này phải lọc đích liên kết khi đọc.
  - Chuỗi EN của `messages/en/kudos-compose.ts` do nhóm tự dịch, chờ BTC duyệt (`plans/261019-1022-write-kudos/reports/en-localizations.md`).
  - Chưa làm: tim, ô tìm hồ sơ ở banner, trang chi tiết Kudo và trang hồ sơ (các tính năng sau).
  - Gửi một Kudo 5 ảnh × ~4.9 MB đã chạy được trên workerd cục bộ (`opennextjs-cloudflare preview`, Supabase giả), nhưng workerd cục bộ không áp giới hạn 128 MB của isolate nên chưa chứng minh được bản triển khai thật nằm trong giới hạn; chỉ triển khai lên Cloudflare thật mới kiểm được. Chủ dự án chấp nhận rủi ro này và giữ 5 MB mỗi ảnh.
- Tài liệu cập nhật: `README.md`, `docs/codebase-summary.md`, `docs/system/permissions.md`.

## 2026-10-15

### Thêm: màn Sun* Kudos, bảng Live (`/sun-kudos`, tính năng #11)

- Route mới `/sun-kudos` (`app/[locale]/sun-kudos/page.tsx`): banner, nút soạn Kudo và ô tìm hồ sơ (chỉ hiển thị, chưa có hành vi), Highlight Kudos (carousel 5 Kudo nhiều tim nhất, lọc theo hashtag và phòng ban), Spotlight Board (canvas kéo/thu phóng, stream sau `<Suspense>`), All Kudos (cuộn vô hạn), bảng số liệu cá nhân và danh sách người nhận quà mới nhất. Cần đăng nhập: không thêm vào `PUBLIC_PATHS`, proxy vẫn mặc định chặn. Dùng lại `components/site-shell/` (`SiteHeader` với `activeHref` = `/sun-kudos`). Khối UI ở `components/kudos/`.
- Dữ liệu: `lib/kudos/get-kudos-board-data.ts` gọi năm RPC (Spotlight tách riêng bằng `fetchKudosSpotlight` để stream) và hai bảng danh mục (`hashtags`, `departments`) qua client Supabase theo request, kiểm kết quả bằng zod (`lib/validation/kudos.ts`); mỗi khối độc lập, lỗi chỉ log phía server và khối đó hiện thông điệp chung. Trang tiếp theo của All Kudos qua Server Action `loadMoreKudos` (`lib/kudos/load-more-kudos-action.ts`, validate đầu vào, chỉ đọc). Bộ lọc nằm trên URL `?hashtag=<slug>&department=<code>`; giá trị không có trong danh mục bị bỏ (`parse-kudos-filters.ts`; `kudos-filter-href.ts` dựng href phía client).
- Hàm thuần khác trong `lib/kudos/`: `hero-title.ts` (danh hiệu Hero theo số người gửi khác nhau, số sao theo Kudo nhận), `format-kudo-time.ts`, `kudo-plain-text.ts`, `spotlight-layout.ts` và `pan-zoom.ts` (canvas Spotlight). `lib/navigation/routes.ts` thêm `kudoDetailHref()` và `profileHref()`; hai trang đích chưa làm nên hiện 404.
- Chữ: `messages/vi/kudos.ts`, `messages/en/kudos.ts` (nối vào `Dictionary`). CSS: khối Kudos trong `app/globals.css`. Ảnh: `public/images/kudos/`.
- Supabase (chạy tay, xem `docs/codebase-summary.md` mục Sun* Kudos): `supabase/migrations/20261015100000_create_kudos.sql` (kèm `rollbacks/…_down.sql`, `verify/…_verify.sql`), dữ liệu demo `supabase/seed/` (chỉ môi trường demo). Thêm 10 bảng; `profiles.department` thành khoá ngoại tới `departments(code)`; bật RLS trên mọi bảng; client chỉ đọc bảng giao dịch qua 5 RPC `SECURITY DEFINER` (`kudos_feed`, `kudos_highlight`, `kudos_spotlight`, `kudos_my_stats`, `kudos_latest_gift_recipients`) vì Kudo ẩn danh phải giấu `sender_id` mà RLS không giấu được cột.
- Test: unit `format-kudo-time`, `get-kudos-board-data`, `hero-title`, `kudo-plain-text`, `kudos-validation`, `load-more-kudos-action`, `pan-zoom`, `parse-kudos-filters`, `spotlight-layout` (và `routes`); E2E `tests/e2e/sun-kudos.spec.ts`, `sun-kudos-feed.spec.ts` (dữ liệu giả `support/kudos-fixtures.mjs`, `kudos-contract.ts`; `fake-supabase-server.mjs` thêm route `/rest/v1`).
- Giới hạn đã biết:
  - SQL đã chạy trên Supabase thật ngày 2026-10-15 (migration, seed demo, verify 20/20 PASS); E2E vẫn chạy với Supabase giả.
  - Câu hỏi mở với BTC: tim cộng cho người gửi hay người nhận Kudo. Hiện `kudos_my_stats.hearts_received` tính tim trên Kudo mà người dùng đã gửi; đổi ý chỉ sửa một dòng RPC.
  - Chỉ đọc: tim, soạn Kudo, tìm hồ sơ, trang chi tiết Kudo và trang hồ sơ thuộc các tính năng sau (#12, #13...); trái tim trên thẻ chưa bấm được, nút soạn Kudo và ô tìm hồ sơ chỉ hiển thị (`aria-disabled`).
  - Chưa có F###/spec riêng cho Kudos (không chạy SDD); nếu cần thì chạy `/tkm:rebuild-spec --features`.
- Tài liệu cập nhật: `README.md`, `docs/codebase-summary.md`, `docs/system/permissions.md`.

## 2026-10-14

### Thêm: đa ngôn ngữ VI/EN (tính năng #10)

- Bộ chọn ngôn ngữ (`components/ui/language-selector.tsx`) nay đổi ngôn ngữ thật cho login, trang chủ, `/awards-information`, `/countdown` và trang 404. Trước đây VN/EN chỉ là giao diện. Mặc định `vi`.
- URL công khai không đổi. Lựa chọn lưu ở cookie httpOnly `NEXT_LOCALE` (Server Action `lib/i18n/set-locale-action.ts`, kiểm bằng zod `lib/validation/locale.ts`). `proxy.ts` rewrite sang cây `app/[locale]/` bằng `lib/i18n/resolve-locale-rewrite.ts`, sau cổng thời gian và bước chặn đăng nhập; cookie phiên Supabase đi kèm qua `rewriteWithSession` (`lib/supabase/update-session.ts`), response mang `Cache-Control: private, no-cache`. `app/auth/*` không bị rewrite.
- Mọi trang chuyển vào `app/[locale]/` (`git mv`); `app/[locale]/layout.tsx` là layout gốc, đặt `<html lang>` và `generateStaticParams` cho `vi`/`en`; thêm `app/[locale]/[...rest]/page.tsx` gọi `notFound()` để 404 hiện trong layout gốc.
- Chữ chuyển sang `messages/vi/*` và `messages/en/*`; `Dictionary = typeof vi`, bản `en` phải thoả kiểu đó (thiếu khóa là lỗi build). Đọc qua `lib/i18n/get-dictionary.ts`. Xoá `components/site-shell/shell-copy.ts`, `components/home/home-copy.ts`, `components/home/root-further-copy.ts`; thêm `components/site-shell/shell-links.ts`.
- `components/ui/locale-change-reload.tsx`: đồng bộ tab khác qua `BroadcastChannel("locale")` và tải lại khi trang khôi phục từ bfcache.
- Test: `tests/unit/locale.test.ts`, `resolve-locale-rewrite.test.ts`, `rewrite-with-session.test.ts`, `set-locale-action.test.ts`; `tests/e2e/language-switch.spec.ts`.
- Giới hạn đã biết:
  - Thân trang 404 render ở client (`components/not-found/not-found-content.tsx` đọc segment `locale` bằng `useParams`) vì `not-found.tsx` không nhận `params`, nên với `cacheComponents` phần chữ theo ngôn ngữ chỉ có sau khi client chạy.
  - Chưa kiểm `Cache-Control: private, no-cache` trên OpenNext/Cloudflare (lúc đó Cloudflare chưa cài, nay đã có `wrangler.jsonc` và `open-next.config.ts`; header mới được kiểm ở bản chạy cục bộ, chưa kiểm trên Worker thật). `Vary: Cookie` không dùng được vì Next ghi đè `Vary` của response trang.
  - Đổi ngôn ngữ phải tải lại cả trang, không làm mới mềm.
  - Các chuỗi EN đánh dấu "not from Figma" (liệt kê ở `plans/261014-1115-multi-language-vi-en/reports/en-localizations.md`) chờ BTC duyệt; chuỗi lấy từ MoMorph cũng mới ở trạng thái `is_reviewed: false`.
- Tài liệu cập nhật: `README.md`, `docs/codebase-summary.md`, `docs/system/permissions.md`, đường dẫn `app/[locale]/countdown/page.tsx` trong spec F001 (`technical-spec.md`).

### Sửa: menu danh mục giải thưởng đánh dấu sai mục (`/awards-information`)

- Mức độ: trung bình (hiển thị sai, không mất dữ liệu). Menu đứng yên ở mục cũ khi trang nhảy cuộn tức thời từ khe giữa hai thẻ sang khe khác (kéo thanh cuộn, khôi phục vị trí cuộn), khi bấm hai mục liên tiếp nhanh (`scrollend` của lượt cuộn trước bị nhận nhầm), hoặc khi người dùng ngắt cuộn mượt giữa chừng.
- `components/awards/use-active-award.ts` bỏ `IntersectionObserver`, đo lại ở mỗi khung hình cuộn; chỉ kết thúc tạm dừng khi thẻ đích đã dừng đúng chỗ, nếu không thì sau 1 giây.
- Test: thêm ca E2E nhảy cuộn vào khe giữa hai thẻ; ca ID-13 nay gán một hash lạ khác nên `hashchange` thật sự chạy.

## 2026-10-13

### Thêm: màn Awards Information (`/awards-information`) và tách khung dùng chung

- Route mới `/awards-information` (`app/awards-information/page.tsx`): hero, menu danh mục giải thưởng dính (`components/awards/awards-nav.tsx`; mục đang chọn do hook `use-active-award.ts` quyết định theo `#slug` và vị trí cuộn) và sáu thẻ giải. Cần đăng nhập: không thêm vào `PUBLIC_PATHS`, proxy vẫn mặc định chặn, phần xác thực không đổi. Hàm thuần ở `lib/awards/` (`parse-award-hash.ts`, `pick-active-award.ts`).
- Khung dùng chung chuyển từ `components/home/` sang `components/site-shell/` (`git mv`): `home-header` thành `site-header` (`SiteHeader({ controls, activeHref })`), `home-footer` thành `site-footer`, `home-class-names` thành `shell-class-names`, `home-icons` thành `shell-icons`; các file còn lại (`header-session-controls`, `header-controls-placeholder`, `signed-in-controls`, `login-link`, `account-menu`, `notification-button`, `sign-out-*`, `use-dismissable`, `kudos-section`, `home-link`, `widget-button`) giữ tên. Chữ dùng chung tách khỏi `home-copy.ts` sang `shell-copy.ts`. Hành vi trang chủ không đổi.
- Thêm `app/not-found.tsx`: trang 404 kiểu SAA cho mọi đường dẫn không tồn tại hoặc chưa làm (`/sun-kudos`, `/tieu-chuan-chung`, `/profile`).
- Test: `tests/unit/parse-award-hash.test.ts`, `tests/unit/pick-active-award.test.ts`; `tests/e2e/awards-information.spec.ts`, `tests/e2e/awards-information-nav.spec.ts` (kèm `support/authed-session.ts`, `support/awards-contract.ts`).
- Tài liệu cập nhật: `README.md`, `docs/codebase-summary.md`, `docs/system/permissions.md`.

### Sửa: một luật "đã đăng nhập" cho proxy và header; chuẩn hoá `//`

- Proxy (`lib/supabase/update-session.ts`) và header trang chủ (`lib/auth/get-is-authenticated.ts`) cùng dùng `isSignedInClaims()` (`lib/auth/is-signed-in-claims.ts`): đã đăng nhập khi `getClaims()` không lỗi và claims có `sub`. Trước đây proxy chỉ cần có claims, còn header đòi thêm `sub`. Phiên trống (`AuthSessionMissingError`) không còn bị header ghi log lỗi; các lỗi khác vẫn ghi log và coi là khách. (Mức độ: thấp; ảnh hưởng: log, tính nhất quán.)
- `resolveAuthRedirect`: đường dẫn chỉ gồm dấu `/` (`//`, `///`) nay được chuẩn hoá thành `/` (trang chủ công khai) thay vì chuỗi rỗng. (Mức độ: thấp; trước đây người chưa đăng nhập bị đưa sang `/login`, vẫn an toàn.)

### Thay đổi: trang chủ `/` công khai

- `PUBLIC_PATHS` (`lib/auth/constants.ts`) nay gồm `/`, `/login`, `/auth/callback`, `/countdown`. Trước đây `/` yêu cầu đăng nhập. Mọi đường dẫn khác vẫn mặc định chặn: người chưa đăng nhập bị 307 sang `/login`.
- Header trang chủ đọc phiên phía server (`components/home/header-session-controls.tsx` gọi `getIsAuthenticated()` trong `lib/auth/get-is-authenticated.ts`, dùng `getClaims()`). Đã đăng nhập: chuông thông báo và menu tài khoản (có Đăng xuất). Khách: nút "Đăng nhập" sang `/login`. Bộ chọn ngôn ngữ luôn hiện.
- `/` vẫn là Partial Prerender: phần header phụ thuộc phiên nằm trong `Suspense`, fallback là `components/home/header-controls-placeholder.tsx`.
- Test: thêm `tests/e2e/homepage-guest.spec.ts` và `tests/unit/get-is-authenticated.test.ts`; `homepage.spec.ts` chỉ còn ca đã đăng nhập; test cổng đếm ngược nay mong `/` của người chưa đăng nhập ở lại `/`.
- Tài liệu cập nhật: `README.md`, `docs/codebase-summary.md`, `docs/system/permissions.md`, edge case trong spec F001 (`functional-spec.md`, `technical-spec.md`).
