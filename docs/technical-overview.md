# Technical overview — SAA 2025 (AIDD mock project)

Tài liệu tra cứu cho lập trình viên: kiến trúc, cổng truy cập, đăng nhập, từng tính năng, cơ sở dữ liệu và migration, kiểm thử, triển khai. Giới thiệu dự án, cách chạy nhanh và ảnh màn hình nằm ở [`README.md`](../README.md). Quy ước viết code nằm ở [`CLAUDE.md`](../CLAUDE.md). Bản đồ từng file của mã nguồn nằm ở [`codebase-summary.md`](codebase-summary.md).

## Mục lục

1. [Kiến trúc tổng quan](#1-kiến-trúc-tổng-quan)
2. [Lệnh và cấu hình chạy](#2-lệnh-và-cấu-hình-chạy)
3. [Cổng prelaunch](#3-cổng-prelaunch)
4. [Phân quyền truy cập (mặc định chặn)](#4-phân-quyền-truy-cập-mặc-định-chặn)
5. [Đăng nhập Google qua Supabase](#5-đăng-nhập-google-qua-supabase)
6. [Ngôn ngữ (VI/EN)](#6-ngôn-ngữ-vien)
7. [Trang chủ và khung dùng chung](#7-trang-chủ-và-khung-dùng-chung)
8. [Awards Information](#8-awards-information)
9. [Sun* Kudos (bảng Live)](#9-sun-kudos-bảng-live)
10. [Xem Kudo](#10-xem-kudo)
11. [Hồ sơ](#11-hồ-sơ)
12. [Thả tim (#13)](#12-thả-tim-13)
13. [Viết Kudo (#12)](#13-viết-kudo-12)
14. [Sửa Kudo (#19)](#14-sửa-kudo-19)
15. [Admin](#15-admin)
16. [Cơ sở dữ liệu và migration](#16-cơ-sở-dữ-liệu-và-migration)
17. [Kiểm thử](#17-kiểm-thử)
18. [Triển khai](#18-triển-khai)
19. [Tài liệu liên quan](#19-tài-liệu-liên-quan)

---

## 1. Kiến trúc tổng quan

Next.js 16 (App Router, TypeScript) chạy trên Cloudflare Workers qua `@opennextjs/cloudflare`; Supabase lo đăng nhập, CSDL và Storage; giao diện bằng Tailwind CSS v4 (CSS-first, `@theme` trong `app/globals.css`).

```text
request -> proxy.ts
   1. cổng prelaunch   (EVENT_START_AT)   -> 307 /countdown hoặc /login hoặc đi tiếp
   2. làm mới phiên    (getClaims())      -> chặn mặc định: khách ngoài PUBLIC_PATHS -> 307 /login
   3. rewrite ngôn ngữ (cookie NEXT_LOCALE) -> app/[locale]/<đường dẫn công khai>
trang / Server Action -> kiểm lại phiên phía server -> RPC SECURITY DEFINER của Supabase (RLS bật mọi bảng)
```

- `proxy.ts` (tên mới của `middleware.ts` ở Next.js 16) chỉ dùng Web API để chạy ổn trên Workers. Matcher loại `_next/static`, `_next/image`, `images/`, `favicon.ico`, `robots.txt`, `sitemap.xml`; asset tĩnh mới nằm ngoài các đường dẫn này phải thêm vào matcher, nếu không sẽ bị cổng chặn trước giờ mở.
- Proxy chỉ là lớp đầu. Trang nào phục vụ dữ liệu cũng phải kiểm lại phiên ở phía server, và quyền thật nằm ở CSDL (RPC và RLS).
- Mọi chữ giao diện nằm ở `messages/{vi,en}/*`; URL công khai không mang mã ngôn ngữ (mục 6).
- Trang không có `Suspense` động bên trên thì `notFound()`/`forbidden()` trả đúng HTTP 404/403; gọi sau khi response đã bắt đầu stream thì status vẫn là 200.
- `cacheComponents` và `partialPrefetching` tắt trong `next.config.ts` (bật thì route có `<Suspense>` động bị treo trên Workers, lỗi 1101, opennextjs-cloudflare#1318). Chỉ bật lại khi OpenNext có bản sửa và đã chạy thử bằng `npm run preview`.
- `patches/@opennextjs+cloudflare+*.patch` (áp qua `postinstall`) vá lỗi `preview-props.json` của Next 16.4 (opennextjs-cloudflare#1356). Xoá patch và bỏ ghim phiên bản khi upstream có bản sửa.
- Chưa có `lib/supabase/client.ts` và `lib/supabase/admin.ts` (chưa cần). Hiện có `lib/supabase/{env,server,update-session}.ts`.

---

## 2. Lệnh và cấu hình chạy

```bash
npm install
cp .env.example .env.local   # chỉnh EVENT_START_AT, AWARDS_CEREMONY_AT và khoá Supabase
npm run dev                  # http://localhost:3000
```

| Lệnh | Tác dụng |
|---|---|
| `npm run dev` | Chạy server phát triển |
| `npm run build` | Build production |
| `npm run start` | Chạy bản build production |
| `npm run lint` | ESLint |
| `npm test` | Unit test (Vitest, `tests/unit/`) |
| `npm run preview` | Build bằng OpenNext rồi xem thử Worker cục bộ trên workerd |
| `npm run deploy` | Build bằng OpenNext rồi `opennextjs-cloudflare deploy` |
| `npm run test:e2e` | `next build` rồi Playwright (`tests/e2e/`); xem mục 17 |

Lần đầu chạy E2E: `npx playwright install chromium`.

Biến môi trường (xem `.env.example`; `NEXT_PUBLIC_*` đọc lúc chạy nên build không cần):

| Biến | Phạm vi | Ý nghĩa |
|---|---|---|
| `EVENT_START_AT` | chỉ server | Mốc mở cổng prelaunch; ISO 8601 có offset, ví dụ `2025-12-01T09:00:00+07:00` |
| `AWARDS_CEREMONY_AT` | chỉ server | Mốc lễ trao giải mà đếm ngược trang chủ nhắm tới; ISO 8601 có offset |
| `NEXT_PUBLIC_SUPABASE_URL` | công khai | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | công khai (có RLS bảo vệ) | Khoá publishable; kiểm tên khoá đúng trên dashboard Supabase vì việc đổi tên khoá vẫn đang diễn ra |

Không bao giờ gắn `NEXT_PUBLIC_` cho secret. Trên Worker, hai biến thời gian là mục `vars` trong `wrangler.jsonc`; hai biến Supabase đặt theo môi trường trên dashboard hoặc `wrangler secret put` (`keep_vars: true` giữ chúng qua mỗi lần deploy).

---

## 3. Cổng prelaunch

`proxy.ts` chặn mọi route theo biến server `EVENT_START_AT`:

| Trạng thái | `/countdown` | Route khác |
|---|---|---|
| Trước `EVENT_START_AT` | hiển thị | 307 về `/countdown` (trừ asset tĩnh) |
| Sau `EVENT_START_AT` | 307 sang `/login` | đi tiếp (sang bước phiên ở mục 4) |
| `EVENT_START_AT` thiếu hoặc sai | 307 sang `/login`, log lỗi trên server | đi tiếp |

- Thiếu hoặc sai nghĩa là cổng mở (không có đếm ngược) và server ghi log lỗi: cổng không khoá khi lỗi, nên cần xem log lúc triển khai.
- Định dạng ISO 8601 có offset tường minh; chỉ phía server, không đặt tiền tố `NEXT_PUBLIC_`.
- Cổng chạy trước mọi kiểm tra phiên và không có ngoại lệ cho admin hay người đã đăng nhập.
- `/countdown` truyền `target` và `serverNow` xuống `CountdownTimer`; client tính độ lệch so với giờ server để hai đồng hồ không lệch. Về 0 thì timer gọi `router.replace("/login")` một lần.
- Xem thử đếm ngược cục bộ: đặt `EVENT_START_AT` ở tương lai trong `.env.local`.
- Spec đầy đủ: `docs/features/F001_CountdownPrelaunchGate/` và `docs/screens/SCR001_CountdownPrelaunch/spec.md`.

---

## 4. Phân quyền truy cập (mặc định chặn)

Sau cổng, `proxy.ts` làm mới phiên rồi áp luật chặn mặc định. Khách chỉ mở được đúng các đường dẫn trong `PUBLIC_PATHS` (`lib/auth/constants.ts`):

| Đường dẫn công khai | Ghi chú |
|---|---|
| `/` | Trang chủ; khách thấy link đăng nhập ở header |
| `/login`, `/auth/callback`, `/countdown` | Đăng nhập, callback OAuth, đếm ngược |
| `/tieu-chuan-chung` | Tiêu chuẩn chung; công khai theo quyết định chủ dự án 2026-10-21 |
| `/403` | Trang báo không có quyền; công khai theo quyết định chủ dự án 2026-10-21 vì không chứa dữ liệu |

- Mọi đường dẫn khác (kể cả đường dẫn không tồn tại, để khách không dò được đường dẫn nào có thật) bị 307 về `/login`. Đường dẫn chỉ gồm dấu `/` như `//` tính là `/`. Khách ở đúng `/sun-kudos/<guid>` được đưa sang `/login?next=/sun-kudos/<guid>` (mục 5); các đường dẫn chặn khác về `/login` trơn.
- Route công khai mới phải thêm vào danh sách. Asset tĩnh loại bởi matcher không đi qua bước này.
- Thiếu env Supabase thì mọi người bị coi là chưa đăng nhập, nên mọi thứ ngoài danh sách về `/login` (khoá khi lỗi, khác với cổng thời gian).
- Người đã đăng nhập mở `/login` bị 307 sang `/` (hoặc sang `?next` hợp lệ).
- Hai vai trò lưu ở `profiles.role` (`user` mặc định, `admin`), đọc từ CSDL qua RPC `is_admin()` mỗi lần cần, không nằm trong JWT. Bảng đầy đủ: `docs/system/permissions.md`.

---

## 5. Đăng nhập Google qua Supabase

```text
/login[?next=/sun-kudos/<guid>] -> <form action={signInWithGoogle}> (trường ẩn next) -> kiểm Origin
  -> signInWithOAuth(google, redirectTo=<origin>/auth/callback)   (redirectTo không mang next)
  -> next hợp lệ: ghi cookie saa_post_login_next | không có hoặc sai: xoá cookie cũ
  -> Google -> /auth/callback?code=... -> exchangeCodeForSession -> isAllowedEmail
  -> kiểm lại cookie -> 307 /sun-kudos/<guid> hoặc 307 /
  (lỗi hoặc email ngoài @sun-asterisk.com: signOut rồi 307 /login?error=auth_failed; mọi lối thoát đều xoá cookie)
```

**Tên miền được phép.** Chỉ tài khoản Google có email `@sun-asterisk.com` (`ALLOWED_EMAIL_DOMAIN` trong `lib/auth/constants.ts`, khớp đúng tên miền ở `lib/auth/is-allowed-email.ts`; `evil-sun-asterisk.com` hay subdomain bị loại). Ba lớp chặn:

1. `signInWithGoogle` gửi gợi ý `hd=sun-asterisk.com` — chỉ lọc danh sách tài khoản của Google, không phải chốt chặn.
2. `/auth/callback` đăng xuất và trả lỗi chung với email ngoài tên miền (tài khoản đã tồn tại trước cổng vẫn đổi được `code`).
3. CSDL từ chối tạo người dùng mới không đạt quy tắc (mục 16).

**Quay lại đúng Kudo sau đăng nhập.** Đích duy nhất ngoài `/` là `/sun-kudos/<guid>`, truyền qua `?next=` (`lib/auth/post-login-next.ts`).

- `next` là danh sách cho phép chứ không phải bộ lọc: `parsePostLoginNext` chỉ nhận đúng dạng đó (không query, hash, dấu `/` cuối, mã hoá phần trăm hay khoảng trắng; tối đa 64 ký tự) và trả `null` cho mọi thứ khác, nên redirect không bao giờ rời site hay tới đường dẫn khác. Giá trị được kiểm lại ở proxy, trang login, Server Action `signInWithGoogle` và callback.
- Đích đi qua vòng Google trong cookie `saa_post_login_next` (`httpOnly`, `SameSite=Lax`, `Secure` ở production, `path=/`, sống 10 phút), không nằm trong `redirectTo`. Callback đọc cookie, kiểm lại (cookie do client giữ nên không tin) và xoá nó trên mọi lối thoát. Ghi cookie lỗi chỉ log: mất chuyến quay lại, không hỏng đăng nhập.
- Xoá cookie bằng `cookies()` (`lib/auth/clear-post-login-next-cookie.ts`), không bằng `response.cookies`: ở Next 16.4, khi store `cookies()` đã bị ghi (Supabase ghi cookie phiên ở callback), Next phân tích lại `Set-Cookie` của chính response và bộ phân tích bỏ `Max-Age=0`, nên trình duyệt giữ cookie rỗng. Hàm nằm ở module riêng vì import `next/headers` thẳng vào route làm bundler phát thêm một chunk server trùng khoảng 296 KB.

**Phiên và bảo mật.**

- `proxy.ts` làm mới phiên bằng `getClaims()` (kiểm chữ ký), không dùng `getSession()`; ghi lại cookie auth kèm header no-store.
- `signInWithGoogle` (nhận `FormData`, chỉ đọc trường `next`) chỉ tin header `Origin` hợp lệ; thiếu hoặc sai thì về `/login?error=auth_failed`. Callback là GET từ Supabase nên không kiểm Origin; cookie PKCE verifier gắn luồng với trình duyệt.
- Đăng xuất là Server Action `signOut` (`lib/auth/sign-out.ts`, `scope: "local"`: chỉ phiên của trình duyệt này), luôn kết thúc ở `/login`, lỗi chỉ log.
- Lỗi chỉ log phía server; client chỉ thấy một thông điệp cố định. `/login` đọc `?error` và `?next` trong `Suspense` riêng; `next` chỉ làm trường ẩn của form, không bao giờ in ra trang.
- Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; thiếu thì app log lỗi và coi mọi người là chưa đăng nhập.
- Dashboard Supabase: bật provider Google và cho phép `<origin>/auth/callback` làm redirect URL; tắt provider Email, Phone, Anonymous (migration profiles giả định Google là lối vào duy nhất). Production phải đặt cả hai biến trên Worker.
- `npm run test:e2e` truyền giá trị Supabase giả nên không cần project thật.
- Chưa chạy thử luồng OAuth thật trên Worker đã triển khai; ảnh nền `/login` là bản xấp xỉ vì export Figma lỗi.

---

## 6. Ngôn ngữ (VI/EN)

Giao diện là tiếng Việt (mặc định) hoặc tiếng Anh. URL công khai không mang mã ngôn ngữ.

```text
chọn ngôn ngữ -> Server Action setLocale (zod localeSchema) -> cookie NEXT_LOCALE (httpOnly, 1 năm, SameSite=Lax) -> tải lại cả trang
request -> proxy.ts (cổng, phiên, chặn) -> resolveLocaleRewrite -> app/[locale]/<đường dẫn>
```

- Bộ chọn ngôn ngữ (`components/ui/language-selector.tsx`, dùng chung cho `/login` và trang chủ) gọi `setLocale` (`lib/i18n/set-locale-action.ts`) rồi tải lại trang. `proxy.ts` đọc cookie và rewrite nội bộ sang `app/[locale]/` (`lib/i18n/resolve-locale-rewrite.ts`); cookie thiếu hoặc lạ (`EN`, `vi-VN`) thì dùng `vi`. Gõ tay `/vi/...` bị lồng thêm một lớp và ra 404. `app/auth/*` nằm ngoài `[locale]` nên không bị rewrite.
- Response đã rewrite mang `Cache-Control: private, no-cache` (hoặc no-store của Supabase khi vừa làm mới phiên) vì cùng một URL cho nội dung khác nhau theo cookie. Không dùng được `Vary: Cookie` vì Next ghi đè `Vary` của response trang.
- Toàn bộ chữ nằm ở `messages/vi/*` và `messages/en/*`. `messages/vi` định nghĩa kiểu `Dictionary`, `messages/en` phải thoả kiểu đó nên thiếu khoá tiếng Anh là lỗi `npm run build`. Trang đọc chữ bằng `getRouteDictionary` (`lib/i18n/get-dictionary.ts`; locale lạ thì `notFound()`). Thêm khoá mới: sửa `messages/vi/*` trước, rồi `messages/en/*`.
- Chuỗi tiếng Anh không lấy từ Figma được đánh dấu `/* not from Figma */` trong `messages/en/*` và chờ ban tổ chức duyệt; danh sách ở `plans/261014-1115-multi-language-vi-en/reports/en-localizations.md`.
- Đổi ngôn ngữ buộc tải lại cả trang: với `cacheComponents`, làm mới mềm qua tham số `[locale]` của layout gốc giữ cây cũ trong `<Activity>` ẩn bên cạnh cây mới. Vì vậy `LocaleChangeReload` (`components/ui/locale-change-reload.tsx`) tải lại tab khác khi nhận tin trên `BroadcastChannel("locale")` và khi trang khôi phục từ bfcache.
- Giới hạn đã biết: thân trang 404 và 403 render phía client; `Cache-Control: private, no-cache` trên response rewrite chưa kiểm trên OpenNext/Cloudflare thật (chỉ kiểm trên `next start` và workerd cục bộ). Chi tiết: `docs/project-changelog.md`.

---

## 7. Trang chủ và khung dùng chung

Trang chủ `/` (`app/[locale]/page.tsx`, khối ở `components/home/`, khung ở `components/site-shell/`, ảnh ở `public/images/home/`) chỉ vào được sau giờ mở và công khai: khách lẫn người đã đăng nhập đều thấy. Vẫn là Partial Prerender: phần header và widget nổi phụ thuộc phiên nằm trong `<Suspense>`.

**Đếm ngược.** Nhắm tới `AWARDS_CEREMONY_AT` (`lib/event/get-awards-ceremony-at.ts`); `EVENT_START_AT` chỉ điều khiển cổng prelaunch. Thiếu hoặc sai: server log `[home-countdown] AWARDS_CEREMONY_AT missing or invalid`, đếm ngược hiện `00` và nhãn "Coming soon" ẩn (cũng vậy khi mốc đã qua). Trên Worker là mục `vars` trong `wrangler.jsonc`.

**Header theo phiên.**

- `components/site-shell/header-session-controls.tsx` đọc phiên trên server bằng `getIsAuthenticated()` (`lib/auth/get-is-authenticated.ts`, kiểm `getClaims()`; mọi lỗi coi là khách), đặt trong `<Suspense>` với placeholder cùng kích thước để không giật layout.
- Đã đăng nhập: chuông thông báo và menu tài khoản. Khách: link "Đăng nhập" tới `/login` (`login-link.tsx`). Bộ chọn ngôn ngữ luôn hiện.
- Menu tài khoản: Profile (`/profile`), Dashboard (chỉ admin, tới `/admin`) và Sign out. Mục Dashboard chỉ hiện khi CSDL xác nhận người xem là admin (`getIsAdmin()` ở `lib/admin/get-is-admin.ts`, gọi sau bước kiểm phiên vì `is_admin` bị thu hồi với `anon`; hỏi cho khách sẽ lỗi `42501` và log mỗi lượt xem).
- Chuông mở panel rỗng (chưa có dữ liệu thông báo).
- Nav, CTA và link giải trỏ tới `/awards-information` (kèm `#<slug>` mỗi giải), `/sun-kudos`, `/tieu-chuan-chung`, `/profile`; hằng số ở `lib/navigation/routes.ts`.

**Widget nổi** (`components/site-shell/widget-button.tsx`): mở menu "Thể lệ" (panel luật), "Viết KUDOS" (modal viết) và nút đóng; Esc hoặc bấm ra ngoài thì đóng. Chi tiết ở mục 13.

**Trang lỗi.** Không header/footer; có tiêu đề, ảnh, mô tả và nút "Về trang chủ" / "Back to home" (nút không có trong Figma, giữ theo yêu cầu). Khung chung `components/errors/error-screen.tsx`, ảnh ở `public/images/errors/`, chữ ở `messages/{vi,en}/not-found.ts` và `forbidden.ts`.

- **404** (`not-found.tsx`): người đã đăng nhập ở đường dẫn không tồn tại nhận HTTP 404 với trang này; khách vẫn bị đưa về `/login` (mặc định chặn).
- **403** (`forbidden.tsx`): `experimental.authInterrupts` bật trong `next.config.ts` nên route nào cũng có thể `import { forbidden } from "next/navigation"` và gọi `forbidden()`; phải gọi trước khi response bắt đầu stream, nếu không status vẫn 200. `/403` (`app/[locale]/403/page.tsx`) gọi nó để xem trước và trả HTTP 403. Khu admin dùng cơ chế này (mục 15).
- Chữ EN của 404 và tiêu đề EN của 403 lấy từ Figma; mô tả EN của 403 và toàn bộ chữ VI là bản nhóm tự dịch.

**Tiêu chuẩn chung** (`app/[locale]/tieu-chuan-chung/page.tsx`, khối ở `components/standards/`, chữ ở `messages/{vi,en}/standards.ts`): công khai. Link "Tiêu chuẩn chung" ở footer và link "Tiêu chuẩn cộng đồng" trên thanh công cụ Viết Kudo (mở tab mới) đều dẫn tới đây. Có header và footer dùng chung nhưng không có widget Viết Kudo; link footer đánh dấu `aria-current="page"` qua `activeHref` tuỳ chọn của `SiteFooter`.

**Ảnh.** Ảnh hero là WebP khoảng 315 KB (`public/images/home/keyvisual-bg.webp`). Tối ưu `next/image` trên Worker đi qua binding `IMAGES` trong `wrangler.jsonc`.

---

## 8. Awards Information

`/awards-information` (`app/[locale]/awards-information/page.tsx`, khối ở `components/awards/`) không nằm trong `PUBLIC_PATHS`: cần đăng nhập, khách bị 307 về `/login`. Dùng lại header, footer, khối Kudos và nút widget từ `components/site-shell/`.

- Menu danh mục dính (`components/awards/awards-nav.tsx`) làm nổi giải đang xem và theo `#<slug>` (hook `use-active-award.ts`; hàm thuần ở `lib/awards/`). Sáu slug nằm ở `lib/navigation/routes.ts` (`top-talent`, `top-project`, `top-project-leader`, `best-manager`, `signature-2025-creator`, `mvp`).
- Menu đọc `#slug` lúc vào trang và khi `hashchange`, đo lại vị trí thẻ mỗi khung hình cuộn; bấm menu thì cuộn mượt, tạm ngừng theo dõi tới khi thẻ đích dừng đúng chỗ (hoặc sau 1 giây) và dùng `replaceState` nên không làm đầy lịch sử.
- Đường dẫn không tồn tại render `app/[locale]/not-found.tsx`.

---

## 9. Sun* Kudos (bảng Live)

`/sun-kudos` (`app/[locale]/sun-kudos/page.tsx`, khối ở `components/kudos/`, dữ liệu ở `lib/kudos/`) cần đăng nhập. Gồm: banner, Highlight Kudos (5 Kudo nhiều tim nhất), Spotlight Board (stream trong `<Suspense>` riêng), All Kudos cuộn vô hạn (Server Action `loadMoreKudos`), thống kê cá nhân và danh sách người nhận quà mới nhất.

```text
page.tsx -> fetchKudosSpotlight(client)  (không await; stream qua <Suspense>)
         -> getKudosBoardData(searchParams, client)
              hashtags + departments (bảng), kudos_my_stats, kudos_latest_gift_recipients   song song
              -> parseKudosFilters(catalog) -> kudos_highlight + kudos_feed (trang 1)
All Kudos cuộn tới cuối -> loadMoreKudos({ cursor, ...filters }) -> kudos_feed (trang kế)
```

- **Bộ lọc** nằm trên URL: `?hashtag=<slug>&department=<code>` (AND; phòng ban là phòng ban của người nhận). Giá trị lạ hoặc danh mục không tải được thì bỏ. Trang 10 Kudo (`KUDOS_PAGE_SIZE`), RPC chặn trần 20, con trỏ keyset `(created_at, id)`.
- **Mỗi khối tải độc lập:** RPC lỗi hoặc dữ liệu sai schema zod thì `console.error` đủ chi tiết, khối đó chỉ hiện thông điệp chung, các khối khác vẫn hiện.
- **Danh hiệu Hero** theo số người gửi khác nhau (`distinct_senders`, không đếm Kudo ẩn danh để người xem không suy ra người gửi ẩn danh): 0 không có, 1-4 New, 5-9 Rising, 10-20 Super, 21 trở lên Legend. Số sao theo Kudo nhận: 10 một sao, 20 hai sao, 50 ba sao (`lib/kudos/hero-title.ts`).
- **Nút soạn A.1** mở modal Viết Kudo (mục 13). **Ô "Tìm kiếm profile Sunner"** cạnh đó (từ 2026-10-26) là combobox gợi ý: gõ xong chờ 150 ms rồi gọi Server Action `searchProfiles` (`lib/kudos/search-profiles-action.ts`; zod `profileSearchQuerySchema` ở `lib/validation/profile-search.ts`, cắt khoảng trắng, 1-100 ký tự; input sai thì không chạm CSDL), liệt kê tối đa 10 Sunner theo tên hoặc email (không phân biệt dấu, không gồm chính người gọi, không trả email); chọn một người thì mở `/profile/<id>`. Dùng chung RPC `kudos_search_sunners` với ô chọn người nhận qua `run-sunner-search.ts`; không có migration mới. Khối: `profile-search-box`, `profile-search-results`, `use-profile-search`.
- **Tim** bật tắt tại chỗ (mục 12); nút "Mở Secret Box" trong thẻ thống kê vẫn `aria-disabled` (chưa làm).
- **Dữ liệu** đến từ `20261015100000_create_kudos.sql`: mười bảng, RLS bật trên tất cả, chỉ đọc qua năm hàm `SECURITY DEFINER` (`kudos_feed`, `kudos_highlight`, `kudos_spotlight`, `kudos_my_stats`, `kudos_latest_gift_recipients`), vì Kudo ẩn danh phải giấu người gửi mà RLS không giấu được từng cột. Chi tiết, trạng thái áp dụng và dữ liệu demo: mục 16.
- Câu hỏi sản phẩm còn mở: tim tính cho người gửi hay người nhận. Hiện là người gửi (một dòng trong `kudos_my_stats`; chủ dự án chốt 2026-10-19).
- Hoãn theo clarifications: hover hồ sơ, bấm tiêu đề để lọc (D.4), "10 Sunner thăng hạng", realtime (`plans/261015-1010-sun-kudos-live-board/plan.md`).

---

## 10. Xem Kudo

`/sun-kudos/<id>` (`app/[locale]/sun-kudos/[id]/page.tsx`, Figma 520:18779; khung ở `components/kudos/kudo-detail-{layout,card,close-button}.tsx`). Cần đăng nhập. Vào từ "Xem chi tiết" trên thẻ Highlight, ô nội dung của thẻ All Kudos, Spotlight Board và link Copy Link được chia sẻ (`kudoDetailHref` ở `lib/navigation/routes.ts`).

- `id` sai dạng (`kudoIdSchema`, kiểm trước mọi truy vấn) hoặc không có Kudo thì `notFound()` trả HTTP 404; đọc lỗi thì hiện một dòng chung trong khung (chi tiết chỉ ở log server).
- Dữ liệu từ RPC `kudo_detail(p_id uuid)` (`lib/kudos/get-kudo-detail.ts`), cùng dạng dòng với feed và giấu người gửi của Kudo ẩn danh.
- **Hiển thị Markdown rút gọn** bằng `components/kudos/kudo-rich-content.tsx` trên `lib/kudos/kudo-content-blocks.ts`: đậm, nghiêng, gạch, danh sách đánh số, trích dẫn, link và `@Tên` (hiện như chữ đậm).
  - Mọi thứ đi qua React (không `dangerouslySetInnerHTML`); chỉ link `http(s)` tuyệt đối thành `<a>` (tab mới, `rel="noopener noreferrer"`; `URL.canParse` chạy trước); `@Tên` chỉ là mention khi đích có dạng uuid; bộ phân tích chạy tuyến tính trên văn bản không tin cậy.
  - Bộ serialize thoát `N.` hoặc `>` gõ ở đầu dòng (`N\.`, `\>`) để vẫn là chữ; dấu đứng một mình từ nội dung cũ (`2025.` không có gì theo sau, trích dẫn chỉ có `>`) cũng đọc là chữ. Chữ trên thẻ board (`lib/kudos/kudo-plain-text.ts`) chỉ bỏ các dấu trang này đọc.
- Vòng focus trên thẻ kem dùng màu `login-bg` tối (`components/kudos/kudo-card-focus-ring.ts`); Montserrat nạp 400/500/700/800/900.
- Nút Đóng quay lại chỉ khi mục Navigation API trước đó cùng site và không phải `/login`, nếu không thì tới `/sun-kudos`. Trang không có footer và không có widget Viết KUDOS (thiết kế không có).
- Giới hạn: link mention hiện là chữ thường (chưa render link).
- E2E: `tests/e2e/kudo-detail.spec.ts` dùng Supabase giả, nên môi trường mới phải chạy migration và verify (mục 16).

---

## 11. Hồ sơ

Hai route, một view: `/profile` (hồ sơ của chính mình, Figma 362:5037) và `/profile/<id>` (người khác, Figma 362:5097). Mã: `app/[locale]/profile/page.tsx`, `app/[locale]/profile/[id]/page.tsx`, khối ở `components/profile/`, dữ liệu ở `lib/profiles/`.

- Cả hai cần đăng nhập: khách bị 307 về `/login` không kèm `next` (danh sách cho phép chỉ nhận `/sun-kudos/<guid>`).
- `/profile/<id của mình>` (mọi kiểu chữ hoa thường) chuyển về `/profile`. `id` sai dạng (`profileIdSchema`, `z.guid()`, kiểm trước mọi truy vấn), `id` lạ hoặc người gọi không có hồ sơ thì `notFound()` trả HTTP 404. Đọc lỗi thì hiện một dòng chung trong khung.
- `await connection()` chạy trước loader vì loader nuốt lỗi bailout của `cookies()` trong `try/catch`, nếu không route bị prerender lúc build kèm một lỗi xác thực giả.
- Tiêu đề tab: "Hồ sơ của tôi | SAA 2025" / "My profile | SAA 2025" và "{tên} | SAA 2025". Header và footer đều đánh dấu "Sun* Kudos" là trang hiện tại; không có widget Viết KUDOS. Tên người trên thẻ Kudo và danh sách người nhận quà dẫn tới đây (`profileHref`).
- **Cả hai mặt:** hero (avatar, tên, phòng ban, huy hiệu Hero và sao), rồi sáu ô icon xám (chưa có Secret Box nên để trống và không nhãn).
- **Hồ sơ của mình:** thẻ thống kê (`KudosStatsPanel` với `spacious`, dữ liệu từ `kudos_my_stats`) và phần KUDOS có dropdown "Đã nhận" (mặc định) / "Đã gửi". Chọn mục kia thì tải trang đầu của nó; chọn lại mục hiện tại thì không làm gì.
- **Hồ sơ người khác:** thanh "Gửi lời cám ơn và ghi nhận tới {tên}" mở Viết Kudo với người đó đã chọn sẵn ở ô người nhận (`openComposer({ recipient })`, vẫn sửa được) và dòng tĩnh "Đã nhận: N Kudos" thay cho dropdown. Mặt "Đã gửi" của họ không bao giờ được đưa ra.
- Cả hai danh sách dùng `KudoPostCard` và cuộn vô hạn (10 thẻ mỗi trang, Server Action `loadMoreProfileKudos`, zod ở `lib/validation/profile.ts`).
- **Dữ liệu** từ hai RPC chỉ đọc: `profile_card(p_id uuid)` (JSON người mà board đã nhúng; không email; `null` cho id lạ hoặc tài khoản bị từ chối) và `kudos_profile_feed(p_profile, p_direction, p_cursor_created_at, p_cursor_id, p_limit)` (trang keyset mới nhất trước, qua `kudos_rows` nên Kudo ẩn danh vẫn giấu người gửi). Cả hai `SECURITY DEFINER`, kiểm quy tắc tài khoản trước, thu hồi `EXECUTE` với `public` và `anon`, chỉ cấp cho `authenticated`.
  - `received` dùng được cho mọi hồ sơ; **`sent` chỉ phục vụ khi `p_profile` là id của chính người gọi**, hồ sơ khác nhận 0 dòng vì danh sách đã gửi của người khác sẽ lộ họ đã viết Kudo ẩn danh nào. Bộ lọc `sent` dùng `auth.uid()`, không bao giờ chỉ dựa `p_profile`.
- **Thay đổi dùng chung đi kèm:** bút chì ở tiêu đề `KudoPostCard` chỉ hiện trên Kudo người xem đã gửi (`is_mine`), cả ở board (chủ dự án quyết 2026-10-22; từ 2026-10-23 là nút Sửa Kudo, mục 14); `components/kudos/kudos-kv-backdrop.tsx` giữ dải key visual dùng chung cho banner board, Xem Kudo và Hồ sơ.
- **Giới hạn đã biết:** khung hồ sơ người khác không có node MoMorph (dựng từ ảnh chủ dự án gửi); các chuỗi đánh dấu `not from Figma` trong `messages/{vi,en}/profile.ts` (tiêu đề tab, lỗi tải, tên dự phòng "Sunner", nhãn Đã gửi không số, dòng trống của Đã gửi) chờ ban tổ chức duyệt; hồ sơ không có chỗ sửa tên, ảnh hay phòng ban.
- E2E (`tests/e2e/profile.spec.ts`) dùng Supabase giả (`tests/e2e/support/profile-fixtures.mjs`) nên không bắt được lỗi SQL.

---

## 12. Thả tim (#13)

Trái tim trên thẻ Kudo (`components/kudos/kudo-hearts.tsx`) là nút bật tắt (`aria-pressed`). Một provider (`KudoHeartsProvider`, `components/kudos/kudo-hearts-store.tsx`, gắn ở `app/[locale]/sun-kudos/page.tsx`) giữ trạng thái mọi thẻ, nên Kudo hiện cả ở Highlight lẫn All Kudos đổi ở cả hai.

- Bấm là đổi tim và số đếm ngay, khoá nút (`aria-disabled`, bấm thêm bị bỏ) tới khi server trả lời; câu trả lời thay cho phỏng đoán. Bị từ chối hoặc lỗi thì trả giá trị cũ và hiện toast (`hearts.error` trong `messages/{vi,en}/kudos.ts`; toast dùng chung `components/ui/status-toast.tsx`, cũng dùng cho Copy Link). Kudo của chính mình có tim `disabled`.
- Server Action `setKudoHeart` (`lib/kudos/set-kudo-heart-action.ts`) kiểm `{ kudoId, liked }` bằng zod (`setKudoHeartInputSchema` trong `lib/validation/kudos.ts`), gọi RPC `set_kudo_heart(p_kudo_id uuid, p_liked boolean)` và trả `liked` và `heart_count` của CSDL; lỗi được log, client chỉ nhận `"own"` hoặc `"generic"`.
- RPC **đặt** trạng thái (không đảo, nên gọi lặp hoặc chồng nhau không lật qua lại), là đường ghi duy nhất vào `kudo_hearts`, chỉ cấp cho `authenticated`, và từ chối bằng SQLSTATE `22023` kèm `forbidden`, `not_found`, `own_kudo` (kiểm đúng thứ tự đó).
- Hệ số x1/x2 nằm ở trigger của `20261015100000_create_kudos.sql`: `hearts_awarded` bằng 2 khi một dòng `special_heart_days` phủ thời điểm hiện tại (chỉ cấu hình bằng SQL, chưa có giao diện admin), nên bỏ tim thu hồi đúng số đã cộng.
- Tim cộng cho người **gửi** Kudo (`kudos_my_stats.hearts_received`); số trên thẻ là số lượt thích (`heart_count`), không phải số tim được cộng.
- Giới hạn đã biết: override trong store còn lại sau khi đổi bộ lọc hoặc `router.refresh()` (số mới của server cho Kudo đã bấm bị bỏ qua tới khi tải lại); toast lỗi tim và toast Copy Link chồng nhau nếu cùng xảy ra trong 3 giây (`plans/261020-1429-like-kudos/plan.md`).
- E2E (`tests/e2e/kudo-hearts.spec.ts`) dùng Supabase giả phản chiếu RPC trong `tests/e2e/support/kudo-hearts-fake.mjs`.

---

## 13. Viết Kudo (#12)

Widget nổi trên `/`, `/awards-information` và `/sun-kudos` mở menu "Thể lệ" (panel luật), "Viết KUDOS" (modal) và nút đóng; nút A.1 trên `/sun-kudos` mở cùng modal. Cả ba trang bọc trong `KudosComposer` (`components/kudos-compose/`), hai trang Hồ sơ cũng vậy (không có widget; thanh gửi lời cám ơn của hồ sơ người khác gọi `openComposer({ recipient })`). Ở `/` công khai, widget đọc phiên trong `<Suspense>` riêng (`WidgetSessionGate`): khách đọc được Thể lệ, còn "Viết KUDOS" là link tới `/login`. Trình soạn (Tiptap v3, các gói `@tiptap/*` ghim 3.31.4) chỉ nạp phía client, lần mở đầu.

```text
modal -> searchSunners / getHashtagOptions (Server Action, chỉ đọc)
      -> createKudo(FormData) -> zod writeKudoSchema -> getClaims() -> inspectKudoImage từng ảnh
         -> Storage `kudo-images` ({uuid}.{ext}) -> RPC create_kudo -> router.refresh()
```

**Người nhận và mention** (`recipient-picker.tsx`, `kudo-mention-extension.ts`):

- "Người nhận" nhận chữ thường (khớp tên hoặc email) hoặc "@tên" (chỉ tên). Không có kết quả hiện "Không tìm thấy Sunner phù hợp"; gõ chữ mà chưa chọn ai thì lỗi là "Hãy chọn người nhận trong danh sách gợi ý".
- Trong trình soạn, "@" liệt kê Sunner ngay, tên có thể chứa dấu cách, danh sách đóng khi một `@từ` không khớp tiếp tục như chữ thường.
- "+ Image" ẩn khi đã đủ 5 ảnh; chữ gõ trong trình soạn đậm 500 (Figma chỉ quy định placeholder). Modal theo khung Figma `ihQ26W78P2`; chỉ dấu `*` bắt buộc dùng `Noto_Sans_JP` 700 (`app/[locale]/layout.tsx`, `preload: false`).

**Server Action `createKudo`** (`lib/kudos/create-kudo-action.ts`; `search-sunners-action.ts` và `get-hashtag-options-action.ts` chỉ đọc):

- Kiểm bằng zod (`lib/validation/write-kudo.ts`): tiêu đề 1-100 ký tự, nội dung 1-5000, 1-5 hashtag khác nhau, tối đa 5 ảnh, bí danh tới 50 (chỉ Kudo ẩn danh). Có kiểm cố gắng hết sức rằng đích link là `http(s)` hoặc mention `@[Tên](uuid)`; nó chỉ thấy dạng `[nhãn](đích)` không có `[` trong nhãn, nên link lồng ngoặc, autolink `<javascript:…>` và dạng tham chiếu lọt qua: không phải hàng rào, kể cả với client giả mạo.
- Giới hạn độ dài nội dung được kiểm đầu tiên (`abort: true`) để nội dung quá dài không vào các bước sau, và form cũng báo khi đang gõ. Bộ đếm "N/5.000" (EN "N/5,000") dưới trình soạn ở cả hai chế độ (đếm code point của Markdown đã serialize, đỏ và chặn gửi/lưu khi quá 5000). `\r\n` trong nội dung được chuẩn hoá thành `\n` trong schema dùng chung (trình duyệt gửi multipart với CRLF).
- Nội dung lưu dạng Markdown rút gọn `**đậm** _nghiêng_ ~~gạch~~ 1. > [chữ](https://…) @[Tên](uuid)` (`lib/kudos/kudo-content-markdown.ts`).
- **Ảnh** (`lib/kudos/kudo-image-file.ts`): loại lấy từ byte đầu (JPEG, PNG, WebP), tối đa 5 MB mỗi ảnh, bỏ metadata cá nhân trước khi tải lên theo kiểu cố gắng hết sức và chỉ trên đường UI → Server Action (tải thẳng lên Storage bằng publishable key bỏ qua bước này). JPEG chỉ giữ thẻ Orientation và bỏ APP1/APP11/APP13/COM (deny-list: các đoạn APPn khác vẫn còn); PNG và WebP bỏ chunk metadata và mọi thứ sau ảnh. Tệp vào bucket `kudo-images` với tên phẳng `{uuid}.{ext}` để URL công khai của Kudo ẩn danh không lộ người gửi.
- `next.config.ts` đặt `experimental.serverActions.bodySizeLimit` và `experimental.proxyClientMaxBodySize` cùng `26mb` (5 ảnh × 5 MB cộng chữ trong một request). Phải tăng cả hai cùng lúc: có `proxy.ts` thì Next đệm body tới `proxyClientMaxBodySize` rồi cắt phần dư mà không báo.
- Lỗi được log trên server, client chỉ nhận mã chung. Ảnh vừa tải chỉ bị xoá khi Kudo chắc chắn không tồn tại (lỗi trước khi gửi RPC, hoặc RPC trả lỗi có mã); kết quả không rõ như lỗi mạng hay timeout thì giữ ảnh, nên có thể có ảnh mồ côi. Nếu danh mục hashtag không tải được, dropdown hiện cảnh báo kèm "Thử lại"; Esc trong dropdown của modal chỉ đóng dropdown.

**Giới hạn đã biết:**

- Gửi 5 ảnh 5 MB chỉ đã chạy thành công trên workerd cục bộ; giới hạn isolate 128 MB của Cloudflare chưa thử trên Worker thật (chủ dự án chấp nhận rủi ro).
- `create_kudo` không kiểm đích link trong `content` (chỉ Server Action kiểm, và kiểm chưa đủ); bảng render chữ thuần và trang Xem Kudo lọc đích khi đọc (chỉ `http(s)` thành link), nên rủi ro được chặn lúc hiển thị chứ không lúc ghi; bộ render Markdown nào thêm sau cũng phải làm vậy.
- `kudos_search_sunners` không trả email nhưng khớp chuỗi con theo email, nên người đã đăng nhập có thể dò email.
- Chuỗi tiếng Anh trong `messages/en/kudos-compose.ts` là bản tự dịch, chờ duyệt (`plans/261019-1022-write-kudos/reports/en-localizations.md`).
- Chưa có khoá idempotency khi gửi Kudo; `create_kudo` chưa có rate limit theo người gửi; tải thẳng lên Storage bỏ qua bước bỏ metadata và chưa có quota; không có tiến trình dọn ảnh mồ côi; body limit 26 MB áp toàn cục kể cả khách (`plans/261019-1022-write-kudos/plan.md`, mục Deferred).
- E2E dùng Supabase giả phản chiếu SQL này nên không bắt được lỗi SQL.

---

## 14. Sửa Kudo (#19)

Bút chì cạnh tiêu đề thẻ Kudo (`components/kudos/edit-kudo-button.tsx`, chỉ hiện trên Kudo người xem đã gửi, `is_mine`, ở board và Hồ sơ) là nút 44px "Chỉnh sửa Kudo" / "Edit Kudo". Nó gọi `useKudosComposer().openEditor(kudo)` và mở modal Viết Kudo ở chế độ sửa: tiêu đề "Chỉnh sửa bài viết của bạn" (EN "Edit your Kudo"), nút Hủy và Lưu ("Save"), điền sẵn tiêu đề, nội dung, hashtag, ảnh và bí danh.

- Markdown đã lưu được dựng lại thành tài liệu của trình soạn bằng `lib/kudos/kudo-content-editor-json.ts`, nghịch đảo chính xác của bộ serialize, nên Lưu mà không đổi gì thì gửi đúng Markdown cũ.
- Người nhận chỉ đọc; trạng thái ẩn danh bị khoá (hiện, không sửa được); bí danh vẫn sửa được và không bắt buộc. Ảnh là các URL giữ lại cộng tệp mới, tối đa 5.
- Lưu xong thẻ đổi tại chỗ: provider giữ dòng đã lưu trong `savedKudos` và `KudosFeedList` hiện nó thay cho dòng lúc render (tim, thời gian, vị trí giữ nguyên), rồi route làm mới. Vì vậy `KudosFeedList` cần `KudosComposerProvider` ở trên; mọi chỗ dựng nó đều có.
- Chưa có lối sửa trên thẻ Highlight và trang Xem Kudo.

**Server Action `updateKudo`** (`lib/kudos/update-kudo-action.ts`): kiểm phiên; kiểm bằng zod strict `updateKudoSchema` (`lib/validation/write-kudo.ts`; không nhận người nhận hay cờ ẩn danh); yêu cầu mọi URL ảnh giữ lại là đối tượng `kudo-images` trên origin Supabase (`isOnSupabaseOrigin`); tải ảnh mới qua `lib/kudos/upload-kudo-images.ts` (dùng chung với `createKudo`) và gọi RPC `update_kudo`. Ảnh Kudo đã bỏ bị xoá khỏi Storage sau khi RPC thành công (cố gắng hết sức, lỗi chỉ log), rồi dòng được đọc lại qua `kudo_detail`. Kudo không có và Kudo của người khác cùng trả `not_found`; client chỉ nhận `validation`, `server` hoặc `not_found`.

**RPC `update_kudo(p_id, p_title, p_content, p_hashtag_slugs, p_image_urls, p_anonymous_name) → text[]`:** `SECURITY DEFINER`, chỉ cấp cho `authenticated`; kiểm quy tắc tài khoản, rồi khoá dòng Kudo của chính người gọi (`sender_id = auth.uid()`); không bao giờ đổi người nhận, trạng thái ẩn danh, `created_at` hay `heart_count`; thay hashtag và ảnh; trả các URL ảnh bị bỏ mà không Kudo nào khác còn giữ. Thứ tự kiểm lỗi: `forbidden`, `not_found`, `invalid_title`, `invalid_content`, `invalid_hashtags`, `invalid_images`, `invalid_alias` (SQLSTATE `22023`).

**Thay đổi dùng chung ảnh hưởng Viết Kudo:** bộ đếm "N/5.000"; chuẩn hoá `\r\n` thành `\n` cho cả tạo lẫn sửa; hàng bí danh có nhãn nội tuyến nhìn thấy từ `sm` trở lên (không dấu sao, vì không bắt buộc); bỏ hết hashtag thì hiện "Không được để trống" ngay.

**Giới hạn đã biết:** hai tab cùng sửa một Kudo thì lần lưu sau thắng; Xem Kudo hiện mention có link như chữ thường; `update_kudo` cũng không kiểm đích link trong `content` (chỉ Server Action kiểm, Xem Kudo lọc khi đọc); `savedKudos` không hết hạn trong vòng đời provider; thẻ không có dấu "đã sửa". Các chuỗi `not from Figma` trong `messages/{vi,en}/kudos-compose.ts` (bộ đếm, `edit.pencil`, chuỗi EN của chế độ sửa, `saveFailed`) chờ duyệt.

E2E (`tests/e2e/edit-kudo.spec.ts`) dùng Supabase giả (`update_kudo` phản chiếu trong `tests/e2e/support/write-kudo-fixtures.mjs`) nên không bắt được lỗi SQL.

---

## 15. Admin

Khu admin chỉ dành cho vai trò `admin` (`profiles.role`, mặc định `user`). `/admin` chuyển sang `/admin/users` (Admin - User, Figma 773:26403; `app/[locale]/admin/`, khối ở `components/admin/`, dữ liệu ở `lib/admin/`). Overview, Review content và Settings chưa làm: các tab đó trên header admin không bấm được (`aria-disabled`).

**Ai vào được.**

- Khách bị proxy đưa về `/login` (`/admin` không trong `PUBLIC_PATHS`; đăng nhập xong về `/`, không quay lại `/admin`).
- Người đã đăng nhập không phải admin nhận trang 403 (HTTP 403 thật, không có dữ liệu người dùng trong HTML).
- Kiểm bằng `requireAdmin()` (`lib/admin/require-admin.ts`), chạy ở layout và chạy lại ở từng trang (layout không chạy lại khi điều hướng mềm). Vai trò luôn hỏi CSDL mỗi request (RPC `is_admin()`, không đọc từ token); lỗi nào cũng coi là "không phải admin". Layout có `await connection()` rồi `requireAdmin()` trước mọi `Suspense`, nên status 403 được quyết định trước khi stream.
- Admin còn có mục "Dashboard" trong menu tài khoản (giữa Profile và Sign out).

**Bảng người dùng.**

- 20 dòng mỗi trang. Cột: Sent, Received, Total Heart, Level, Badges, Time to get 6 Badges, Last Logged in, Role.
- Lọc theo Unit, Level, Role; tìm theo tên hoặc email (chuỗi con, tối đa 100 ký tự; gõ rồi chờ 300 ms mới đổi URL, Enter hoặc kính lúp gửi ngay); sắp xếp theo bảy cột.
- Trạng thái nằm trên URL: `unit`, `level`, `role`, `q`, `sort`, `dir`, `page` (giá trị sai tự về mặc định, trang vẫn trả 200).
- Tim chỉ tính Kudo người đó gửi **không ẩn danh**; Sent gồm cả Kudo ẩn danh nhưng chỉ là một con số, nên admin không suy ra được ai gửi Kudo ẩn danh. Level là hạng Hero theo số người gửi không ẩn danh khác nhau (0, 1-4, 5-9, 10-20, 21+). Giờ hiển thị `dd/MM/yyyy HH:mm` theo UTC+7 cho bảng, CSV và tên file.

**Đổi vai trò.** Nút "..." trên dòng mở "Change to Admin" / "Change to User" và hộp xác nhận; gọi Server Action `setUserRole` (`lib/admin/set-user-role-action.ts`, zod strict). Admin không đổi được vai trò của chính mình (nút bị vô hiệu và RPC trả `self`), nên admin cuối cùng không tự gỡ quyền được. Lỗi gì cũng chỉ hiện một dòng chung và hộp giữ mở.

**Xuất CSV.** `GET /admin/users/export?<bộ lọc của trang>` (route handler `app/[locale]/admin/users/export/route.ts`; nằm dưới `[locale]`, không dưới `/api`, vì proxy rewrite locale mọi đường dẫn không phải auth).

- Toàn bộ kết quả đã lọc và sắp xếp; tên file `users-YYYYMMDD.csv`; tiêu đề cột tiếng Anh cố định; UTF-8 BOM; CRLF; ô bắt đầu bằng `=`, `+`, `-`, `@`, tab hoặc CR được thêm tiền tố `'`.
- Đọc từng khúc 1000 dòng (giới hạn `db-max-rows` của PostgREST), tất cả hoặc không: khúc lỗi hoặc không nhất quán (kể cả một người đọc hai lần vì ghi đồng thời làm đổi thứ tự giữa các khúc) cho 500; hơn 5000 dòng cho 413; không phải admin cho 403 (route handler không được layout bọc nên tự gọi `getIsAdmin()`). File không bao giờ bị cắt lặng lẽ.
- Chưa kiểm cách Excel mở CSV (dấu phẩy) — mục Deferred của plan, chủ dự án.

**Bộ lọc Unit** chỉ khớp khi `profiles.department` đã có dữ liệu. Đăng nhập không bao giờ ghi cột này; chỉ seed demo điền.

**CSDL.** Migration `20261024100000_create_admin_users.sql` thêm `profiles.role` và các hàm `SECURITY DEFINER` `is_admin()`, `admin_list_users(...)`, `admin_set_user_role(p_user_id, p_role)` (trả `ok`, `forbidden`, `self`, `invalid` hoặc `not_found`); `EXECUTE` thu hồi với `public` và `anon`. Không ai ghi được `role` qua API: `profiles` không có policy ghi. Chi tiết và trạng thái: mục 16.

**Thứ tự triển khai: chạy migration TRƯỚC khi deploy app.** Thiếu `is_admin()` thì app khoá khi lỗi (không ai là admin) và log lỗi ở mọi trang của người đã đăng nhập.

**Admin đầu tiên** gán tay trong Supabase SQL Editor (role `postgres`); làm lại đúng câu này nếu admin duy nhất bị hạ quyền bằng SQL:

```sql
update public.profiles set role = 'admin' where email = '<email>@sun-asterisk.com';
```

**Chưa làm / giới hạn:** Overview, Review content, Settings; nhật ký đổi vai trò; sửa phòng ban; `next` sau đăng nhập cho `/admin`; giao diện cấu hình ngày x2 tim; `profiles.role` đọc được bởi mọi người đã đăng nhập, giống email (chấp nhận). Chi tiết: `docs/codebase-summary.md` (Admin - User), `docs/system/permissions.md`.

---

## 16. Cơ sở dữ liệu và migration

Dự án không dùng Supabase CLI: SQL trong `supabase/` được dán tay vào Supabase SQL Editor (role `postgres`). Mỗi migration chạy trong một transaction, chạy lại được (idempotent), và có hai file đi kèm: `supabase/verify/<tên>_verify.sql` và `supabase/rollbacks/<tên>_down.sql`.

**Quy trình áp dụng mỗi migration:**

1. Chạy theo đúng thứ tự bảng dưới (mỗi migration ghi migration nó cần trước).
2. Dán cả file migration vào SQL Editor, Run.
3. Chạy file verify; mọi dòng phải PASS (profiles: chạy từng khối một).
4. Cần lùi thì chạy file rollback tương ứng.

E2E dùng Supabase giả phản chiếu SQL, nên không bắt được lỗi SQL: môi trường mới phải chạy migration rồi verify.

| # | Migration | Thêm gì | Cần trước | Trạng thái trên project Supabase thật |
|---|---|---|---|---|
| 1 | `20261012133000_create_profiles.sql` | Bảng `profiles`, quy tắc tài khoản, RLS, trigger, chốt chặn đăng ký, backfill | không | chưa ghi trong repo; kiểm bằng file verify |
| 2 | `20261015100000_create_kudos.sql` | 10 bảng Kudos, 2 trigger tim, 5 RPC đọc, khoá ngoại `profiles.department` | 1 | áp dụng 2026-10-15, verify 20/20 PASS |
| 3 | `20261019110000_create_kudo_write.sql` | `kudos_search_sunners`, `create_kudo`, `kudos_unaccent`, bucket `kudo-images` | 1, 2 | áp dụng 2026-10-19, verify 16/16 PASS, kèm một lần tải ảnh thật |
| 4 | `20261020150000_create_kudo_heart_rpc.sql` | RPC `set_kudo_heart` | 1, 2 | áp dụng 2026-10-20, verify 7/7 PASS (H1-H6 và H1b), kèm một lần thả tim thật qua Google |
| 5 | `20261021120000_create_kudo_detail_rpc.sql` | RPC `kudo_detail` | 1, 2 | áp dụng 2026-10-21, verify 6/6 PASS |
| 6 | `20261022100000_create_profile_rpcs.sql` | RPC `profile_card`, `kudos_profile_feed` | 1, 2 | áp dụng 2026-10-22, verify 14/14 PASS |
| 7 | `20261023100000_create_update_kudo_rpc.sql` | RPC `update_kudo` | 1, 2, 3 | áp dụng 2026-10-23, verify 11/11 PASS |
| 8 | `20261024100000_create_admin_users.sql` | `profiles.role`, `is_admin`, `admin_list_users`, `admin_set_user_role` | 1, 2 | chủ dự án áp dụng 2026-10-23, verify 24/24 PASS |

Nguồn xác nhận: `plans/261019-1022-write-kudos/reports/db-verify-result.md` (3), `plans/261021-view-kudo/clarifications.md` (5), `plans/261021-profile/clarifications.md` (6), `plans/261022-edit-kudo/clarifications.md` (7), `plans/261023-1207-admin-user-management/clarifications.md` (8).

### 16.1 Profiles (migration 1)

`public.profiles`: một dòng cho mỗi người dùng được phép (`id` → `auth.users` và xoá theo, `email`, `full_name`, `avatar_url`, `department`, `created_at`, `updated_at`; từ migration 8 thêm `role`).

- **Quy tắc tài khoản:** `is_allowed_email` (đúng `@sun-asterisk.com`) và `is_allowed_account` (thêm `app_metadata.provider = 'google'`, không sửa được từ client).
- **Chốt chặn:** trigger BEFORE INSERT trên `auth.users` raise lỗi với mọi tài khoản không đạt (email/OTP, ẩn danh, tên miền khác, người mời từ Dashboard); người dùng về `/login` với thông điệp chung.
- **Đồng bộ:** trigger điền `email` từ `auth.users` và `full_name`, `avatar_url` từ identity Google trong `auth.identities` (làm mới mỗi lần đăng nhập lại); `raw_user_meta_data` không bao giờ được đọc; `department` không bao giờ bị ghi.
- **RLS:** `authenticated` đạt quy tắc tài khoản được SELECT mọi dòng; không có policy ghi; `anon` không có quyền gì.
- Code phía server đọc dòng của chính người gọi bằng `getCurrentProfile()` (`lib/profiles/get-current-profile.ts`: lọc `id` theo `sub` của claims đã kiểm chữ ký, kiểm bằng zod, mọi lỗi trả `null`); hiện chưa có trang nào gọi hàm này.
- **Trước khi chạy:** tắt provider Email, Phone, Anonymous (Authentication > Sign In / Providers). Migration khoá ngắn `auth.users` và `auth.identities`: chạy ngoài giờ cao điểm. Các hàm trigger chạy ngay trong lúc đăng nhập, nên ràng buộc NOT NULL, unique hay check thêm vào `profiles` sau này có thể chặn mọi lượt đăng nhập (chỉ chốt chặn được phép raise).
- **Rollback:** xoá trigger, hàm và bảng (xoá cả mọi dòng profile, kể cả `department`).
- Runbook từng bước: `plans/261012-1330-user-profiles-supabase/phase-03-apply-and-verify.md`.

### 16.2 Kudos (migration 2)

- **Danh mục:** `departments` (`code`, `sort_order`), `hashtags` (`slug`, `name_vi`, `name_en`), `gifts`; `authenticated` đạt quy tắc tài khoản được SELECT.
- **Giao dịch:** `kudos` (`sender_id`, `recipient_id`, ẩn danh, `heart_count` phi chuẩn hoá), `kudo_hashtags`, `kudo_images`, `kudo_hearts` (một tim mỗi người mỗi Kudo), `special_heart_days`, `secret_boxes`, `gift_awards`. Bật RLS, không có quyền và không có policy cho client.
- **Trigger:** `kudo_hearts_set_awarded` (chặn tim Kudo của chính mình; server quyết định x1/x2) và `kudo_hearts_sync_count` (đồng bộ `heart_count`); client bị thu hồi `EXECUTE` trên hai hàm này.
- **RPC đọc** (`SECURITY DEFINER`, `search_path` rỗng, chỉ `authenticated`): `kudos_feed`, `kudos_highlight` (5 Kudo nhiều tim nhất), `kudos_spotlight`, `kudos_my_stats`, `kudos_latest_gift_recipients`. Mọi RPC kiểm `is_allowed_account` đầu hàm và trả rỗng cho tài khoản bị từ chối (`kudos_spotlight` trả `null`).
- Migration tạo lại khoá ngoại `profiles.department` → `departments(code)` và giữ khoá `ACCESS EXCLUSIVE` ngắn trên `profiles` (mọi lượt đăng nhập đều ghi bảng này): chạy ngoài giờ cao điểm, rồi thử một lần đăng nhập Google thật. Trigger đăng nhập không ghi `department` nên khoá ngoại không chặn đăng nhập. Dòng danh mục dùng `ON CONFLICT DO NOTHING` nên chạy lại không ghi đè tên đã sửa sau này.
- **Rollback:** `supabase/rollbacks/20261015100000_create_kudos_down.sql`. Thiết kế: `plans/261015-1010-sun-kudos-live-board/database-design.md`.
- **Lỗi từng gặp sau khi chạy seed thật (2026-10-15):** zod `z.uuid()` (RFC 4122) từ chối id seed `md5(label)::uuid`, nên mọi khối đều "không tải được". Đã sửa bằng `z.guid()` (khớp kiểu `uuid` của Postgres) cùng test hồi quy; E2E không bắt được vì fixture dùng UUID v4.

### 16.3 Viết Kudo (migration 3)

- `kudos_search_sunners(p_query, p_limit, p_name_only)`: khớp tên (không phân biệt hoa thường và dấu) hoặc email (chuỗi con, khớp nguyên email xếp đầu); `p_name_only` chỉ khớp tên (dùng cho "@ + tên"); truy vấn trống liệt kê tối đa 10 Sunner có tên; không bao giờ trả email và không trả chính người gọi.
- `create_kudo(...)`: đường ghi duy nhất; người gửi luôn là `auth.uid()`; một transaction ghi `kudos`, `kudo_hashtags`, `kudo_images`. Lỗi SQLSTATE `22023` với `forbidden`, `invalid_recipient`, `invalid_title`, `invalid_content`, `invalid_hashtags`, `invalid_images`, `invalid_alias` (đúng thứ tự kiểm, fake E2E phản chiếu đúng thứ tự). Chỉ nhận URL ảnh dạng `<http(s)>://<host>/storage/v1/object/public/kudo-images/{uuid}.{ext}` mà đối tượng đó có thật và thuộc người gọi (không ghim host vì CSDL không biết URL project); phía đọc (`lib/validation/kudos.ts`) vẫn chỉ giữ ảnh có đường dẫn `/images/` hoặc cùng origin Supabase.
- `kudos_unaccent`: hàm bọc extension `unaccent` (schema `extensions`; migration dừng nếu nó nằm chỗ khác); `EXECUTE` thu hồi với client.
- Bucket `kudo-images`: đọc công khai, 5 MiB, `image/jpeg`, `image/png`, `image/webp`; policy INSERT, SELECT, DELETE chỉ trên đối tượng của chính mình (`storage.objects.owner_id = auth.uid()` và đạt quy tắc tài khoản); không có UPDATE. Tên đối tượng phẳng, quyền sở hữu chỉ nằm ở `owner_id`; dòng bucket dùng `ON CONFLICT DO NOTHING` nên chạy lại không đặt lại giới hạn đã sửa trên Dashboard. An toàn khi chạy chồng lên bản đầu của file (policy `*_own_folder` cũ bị xoá).
- **Rollback:** `supabase/rollbacks/20261019110000_create_kudo_write_down.sql`.

### 16.4 Thả tim, Xem Kudo, Hồ sơ, Sửa Kudo (migration 4 đến 7)

Cả bốn chỉ thêm hàm (không đổi bảng, chỉ mục hay dữ liệu), một transaction, chạy lại được.

- **4. `set_kudo_heart`:** verify kiểm H1-H6 và các ghi thử đều được rollback. Rollback chỉ xoá RPC; tim đã thả vẫn còn nhưng không ai thả hay bỏ thêm được.
- **5. `kudo_detail`:** trả 0 dòng cho tài khoản bị từ chối lẫn `id` không có, nên không lộ Kudo có tồn tại; app trả 404. Rollback chỉ xoá hàm.
- **6. `profile_card` và `kudos_profile_feed`:** verify có các kiểm tra SEC_002, SEC_003, SEC_004 và anon bị từ chối `42501`. Rollback chỉ xoá hai hàm.
- **7. `update_kudo`:** cần cả `is_allowed_account` và bucket `kudo-images`, không đổi bảng, chỉ mục, policy hay dữ liệu. Rollback chỉ xoá hàm: Kudo đã sửa giữ nguyên, và thiếu hàm thì mỗi lần Lưu hiện lỗi chung.

### 16.5 Admin (migration 8)

- Cần migration 1 và 2; chạy tay bằng role `postgres`; có khoá `ACCESS EXCLUSIVE` ngắn trên `profiles`: chạy ngoài giờ cao điểm.
- `profiles.role` là `user` (mặc định) hoặc `admin`; `profiles` không có policy ghi hay quyền UPDATE, chỉ `admin_set_user_role` (`SECURITY DEFINER`) ghi `role`.
- `is_admin()`: đúng khi JWT đã kiểm đạt quy tắc tài khoản và dòng `profiles` của chính người gọi có `role = 'admin'`; không bao giờ ném lỗi.
- `admin_list_users(...)`: kiểm `is_admin()` trước tiên (người khác nhận 0 dòng, không lỗi); lọc, tìm, sắp xếp chạy trong hàm (không SQL động); `row_no`, `total_count`, `sum_sent`, `sum_received` tính trên cả kết quả đã lọc trước limit/offset. Định nghĩa cột: `sent` là Kudo người đó gửi (cả ẩn danh, chỉ đếm), `received` là Kudo nhận, `hearts` là tổng `hearts_awarded` trên Kudo gửi không ẩn danh (cố ý khác `kudos_my_stats`, vì số tim từng Kudo là công khai, tính cả Kudo ẩn danh thì admin trừ ra được người gửi), `level` là hạng Hero theo người gửi không ẩn danh khác nhau, `badges` là số huy hiệu khác nhau đã mở (`secret_boxes.opened_at` khác null).
- `admin_set_user_role(p_user_id, p_role)`: một khoá advisory làm các lượt đổi vai trò chạy lần lượt. Đã kiểm trên Supabase thật: transaction ở `read committed`, không role hay hàm nào override (`default_transaction_isolation`, `proconfig` chỉ có `search_path`), nên lượt sau thấy mình đã mất quyền; hạ quyền có hiệu lực ngay ở request sau. Cũng chính mức cô lập này làm khoá advisory chặn được hai admin hạ quyền nhau cùng lúc. Hai phiên đồng thời thật chưa thử trên project thật (plan ghi `concurrency unproven`, tuỳ chọn).
- Lần verify đầu lỗi ở chính script, đã sửa: `unnest` nhiều mảng phải viết qua `rows from` (dạng nhiều đối số chỉ chạy khi không qualify tên), và lần gọi `is_admin` / `admin_set_user_role` với vai trò anon phải qua `execute`, vì biểu thức đơn giản của PL/pgSQL chỉ kiểm quyền `EXECUTE` một lần mỗi transaction nên lần gọi anon từng trông như được phép.
- **Rollback:** `supabase/rollbacks/20261024100000_create_admin_users_down.sql`.
- Việc còn lại sau áp dụng (chưa có ghi nhận kết quả): gán admin đầu tiên bằng SQL, kiểm `is_admin()` bằng tài khoản của mình và đăng nhập Google thật sau migration (`plans/261023-1207-admin-user-management/plan.md`).

### 16.6 Dữ liệu demo

Chỉ dùng cho môi trường demo hoặc staging, **không bao giờ chạy trên production**.

- `supabase/seed/20261015_kudos_demo_seed.sql`: tạo 20 Sunner demo (`demo.sunner01..20@sun-asterisk.com`), 60 Kudo trong khoảng 28 ngày qua kèm hashtag, ảnh, tim, hộp bí mật, 12 lượt tặng quà; thêm 2 Kudo nhận, 1 Kudo gửi, tim và 2 hộp bí mật cho MỌI profile thật để thống kê cá nhân không toàn số 0. Người dùng demo là dòng `auth.users` không mật khẩu và không identity (không ai đăng nhập được); cổng đăng nhập nhận họ (tên miền cộng google) và trigger tạo profile cho họ. Đây là nơi duy nhất điền `profiles.department`. Cần migration 2 và ảnh ở `public/images/kudos/demo/` (`avatar-01..04.png`, `kudo-photo-01..05.jpg`). Chạy lại được (id cố định từ `md5(label)`, `ON CONFLICT DO NOTHING`): chỉ thêm phần còn thiếu, ví dụ dòng cho profile thật mới tạo; câu lệnh cuối in một dòng tóm tắt.
- `supabase/seed/kudos_demo_seed_cleanup.sql`: xoá mọi dòng seed đã thêm rồi có thể chạy seed lại. Xoá người dùng demo kéo theo profile, mọi Kudo họ gửi hoặc nhận (kể cả Kudo seed với profile thật), hashtag, ảnh, tim, hộp bí mật và quà. Hộp bí mật seed tặng profile thật được xoá riêng theo id seed. Người dùng thật và dữ liệu họ tự tạo không bị đụng. Chạy lại an toàn; kết quả mong đợi: mọi cột bằng 0.

---

## 17. Kiểm thử

| Lớp | Công cụ | Ghi chú |
|---|---|---|
| Unit | Vitest (`npm test`, `tests/unit/`) | Hàm thuần và Server Action trong `lib/`; dữ liệu mẫu ở `tests/unit/support/` |
| E2E | Playwright (`npm run test:e2e`, `tests/e2e/`) | Chạy `next build` trước; chỉ trình duyệt chromium |

**Hạ tầng E2E** (`playwright.config.ts`):

| Cổng | Vai trò |
|---|---|
| 3100 | `EVENT_START_AT` ở tương lai (kiểm cổng prelaunch) |
| 3101 | `EVENT_START_AT` đã qua |
| 3102 | `EVENT_START_AT` không hợp lệ |
| 3103 | Server "authed": sự kiện đã mở và Supabase trỏ về server giả |
| 54398 | Supabase giả `tests/e2e/support/fake-supabase-server.mjs` (127.0.0.1) |

- Ba server 3100-3102 dùng khoá Supabase giả trỏ `127.0.0.1:54399`; server 3103 trỏ sang Supabase giả ở 54398.
- Supabase giả chỉ dùng cho test: ký JWT ES256 và phát JWKS để `getClaims()` thật của proxy tự kiểm chữ ký, cộng các route `/rest/v1` (bảng danh mục, `rpc/*`) và `/storage/v1/`. Code production không có đường tắt. Dữ liệu và RPC giả phản chiếu SQL trong `tests/e2e/support/*` (`kudos-fixtures.mjs`, `write-kudo-fixtures.mjs`, `kudo-hearts-fake.mjs`, `kudo-detail-fake.mjs`, `profile-fixtures.mjs`, `admin-users-fake.mjs`), kèm các điểm điều khiển `/__*` chỉ dành cho test.
- Ngoài CI, Playwright dùng lại (`reuseExistingServer`) server đang chạy ở các cổng trên: tắt `next start` cũ trước khi chạy E2E, nếu không bản build cũ có thể làm sai kết quả.
- Vì E2E dùng Supabase giả, nó không bắt được lỗi SQL; migration mới phải có verify chạy trên project thật (mục 16).
- Cấu hình test của `npm test`: môi trường node, alias `@` tới thư mục gốc, chỉ nhận `tests/unit/**/*.test.ts`.

Trước khi commit: `npm run lint`; build phải qua `npm run build`.

---

## 18. Triển khai

Cloudflare Workers qua OpenNext: `wrangler.jsonc` (cờ tương thích `nodejs_compat` và `global_fetch_strictly_public`, binding `ASSETS`, `IMAGES`, `WORKER_SELF_REFERENCE`, `vars` `EVENT_START_AT` và `AWARDS_CEREMONY_AT`), `open-next.config.ts`.

- `npm run preview`: build OpenNext rồi chạy thử cục bộ trên workerd. `npm run deploy`: build OpenNext rồi `opennextjs-cloudflare deploy`.
- Biến thời gian là `vars` trong `wrangler.jsonc` (mục `previews.vars` lặp lại cho Worker Previews, vì Previews không kế thừa gì từ production). Khoá Supabase đặt theo môi trường trên dashboard hoặc `wrangler secret put`; không để secret thật trong `vars` (dễ bị commit nhầm dạng plaintext). `keep_vars: true` giữ chúng qua các lần deploy.
- **Thứ tự:** chạy migration (mục 16) TRƯỚC khi deploy app có dùng nó; riêng Admin, thiếu `is_admin()` thì app khoá khi lỗi và log lỗi ở mọi trang của người đã đăng nhập.
- Supabase dashboard cần provider Google bật và `<origin>/auth/callback` trong danh sách redirect URL (mục 5).
- Giới hạn kích thước Worker: 3 MiB (gói free) hoặc 10 MiB (gói trả phí), tính sau gzip. Đo 2026-10-26 bằng `opennextjs-cloudflare build` rồi `wrangler deploy --dry-run`: 1976.33 KiB gzip, sau khi vá gói phụ thuộc bằng `overrides` (PR #28; trước đó 2350.57 KiB vì bundle middleware còn kèm `app-page-turbo.runtime` của Next). Cân nhắc kỹ khi thêm dependency nặng.
- Header bảo mật: route động đặt qua `next.config.ts` `headers()` (CSP theo nonce ở `proxy.ts` chưa làm); asset tĩnh qua `public/_headers` (hiện chỉ có `Cache-Control` cho `/_next/static/*`). Hai cơ chế không thay thế nhau vì Worker của OpenNext không phục vụ asset tĩnh qua `headers()`.
- Rate limiting dùng Cloudflare Rate Limiting Rules (cấu hình trên Cloudflare, không viết code).
- Chưa kiểm trên Worker đã triển khai: giới hạn isolate 128 MB khi gửi 5 ảnh, `Cache-Control: private, no-cache` của response rewrite, luồng OAuth thật, cookie trên Workers ở `lib/supabase/update-session.ts` (cùng mẫu với lỗi xoá cookie đã sửa ở mục 5; chưa kiểm).

---

## 19. Tài liệu liên quan

| File | Nội dung |
|---|---|
| [`README.md`](../README.md) | Giới thiệu, cài đặt nhanh, bản đồ trang, tính năng kèm ảnh, bảng tra Server Action |
| [`codebase-summary.md`](codebase-summary.md) | Vai trò từng thư mục và file; chi tiết từng tính năng |
| [`system/permissions.md`](system/permissions.md) | Ai được mở và làm gì (tiếng Việt) |
| [`project-changelog.md`](project-changelog.md) | Thay đổi hành vi đáng chú ý, mới nhất trước |
| `features/F001_CountdownPrelaunchGate/` | Spec chức năng và kỹ thuật của cổng prelaunch |
| `screens/SCR001_CountdownPrelaunch/spec.md` | Spec màn đếm ngược |
| [`../CLAUDE.md`](../CLAUDE.md) | Stack, quy ước code, bảo mật |
