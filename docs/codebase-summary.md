# Codebase summary

Tóm tắt cấu trúc mã hiện có. Quy ước viết code nằm ở `CLAUDE.md`; cách chạy lệnh nằm ở `README.md`.

## Cấu trúc

| Đường dẫn | Vai trò |
|---|---|
| `proxy.ts` | Cổng truy cập theo thời gian (F001), rồi làm mới phiên Supabase; mặc định chặn: người chưa đăng nhập ngoài `PUBLIC_PATHS` bị đưa về `/login`, người đã đăng nhập mở `/login` bị đưa sang `/` (Next.js 16 proxy, trước đây là middleware) |
| `app/page.tsx` | Trang chủ SAA `/` (thay trang mẫu của create-next-app): header, hero kèm đếm ngược, ROOT FURTHER, hệ thống giải thưởng, Kudos, footer. Chỉ vào được sau giờ mở và khi đã đăng nhập |
| `app/countdown/page.tsx` | Trang `/countdown` (Server Component, đọc env theo request trong `Suspense`) |
| `app/login/page.tsx` | Trang `/login` (PPR); banner lỗi đọc `?error` trong `Suspense`, chỉ hiện thông điệp cố định |
| `app/auth/callback/route.ts` | Route Handler GET `/auth/callback`: đổi `code` lấy phiên (PKCE), từ chối email ngoài `@sun-asterisk.com` (đăng xuất + lỗi chung), redirect về hằng số, không có tham số `next` |
| `app/layout.tsx`, `app/globals.css` | Layout gốc, font (Montserrat, Digital Numbers), token Tailwind `@theme` |
| `app/fonts/` | Font LED `digital-numbers-regular.ttf` và `digital-numbers-font-provenance.md` (nguồn gốc, giấy phép) |
| `components/countdown/` | `countdown-screen.tsx` (khung tĩnh), `countdown-timer.tsx` (client, đếm mỗi giây), `countdown-unit.tsx` (khối Days/Hours/Minutes) |
| `components/login/` | `login-header`, `login-hero`, `login-footer`, `login-background`, `login-error-banner`, `google-login-button`, `google-login-form` (client, gắn Server Action) |
| `components/home/` | Các khối của trang chủ (`home-header`, `home-hero`, `awards-section`, `kudos-section`, `home-footer`, ...); `account-menu` (client: Profile + Sign out, không có Admin Dashboard vì chưa có vai trò), `notification-button` (client: panel rỗng "Chưa có thông báo", chưa có nguồn dữ liệu), `sign-out-form` (Server Component gắn Server Action `signOut`), `home-countdown-live` + `home-countdown-ticker` (đếm ngược), `widget-button` |
| `components/ui/language-selector.tsx` | Chọn ngôn ngữ dùng chung cho login và trang chủ (client, VN/EN chỉ là giao diện, chưa đổi ngôn ngữ thật) |
| `lib/event/parse-iso-with-offset.ts` | `parseIsoWithOffset`: parse ISO 8601 có offset (hoặc `Z`) và ngày lịch có thật thành epoch ms, sai thì `null`; dùng chung cho hai hàm đọc env bên dưới |
| `lib/event/get-event-start-at.ts` | Đọc và kiểm `EVENT_START_AT` (chỉ để mở cổng chờ `/countdown`); `isEventLaunched` |
| `lib/event/get-awards-ceremony-at.ts` | Đọc và kiểm `AWARDS_CEREMONY_AT` (env chỉ dùng phía server, mốc lễ trao giải mà đếm ngược trang chủ nhắm tới); thiếu/sai thì log `[home-countdown] AWARDS_CEREMONY_AT missing or invalid` và trả `null` |
| `lib/countdown/` | Hàm thuần: `resolve-gate-redirect.ts`, `split-remaining-time.ts`, `server-clock-offset.ts`, `get-home-countdown.ts` (đếm ngược của trang chủ: nhận mốc từ `AWARDS_CEREMONY_AT`, không dùng `EVENT_START_AT`; mốc thiếu/sai hoặc đã qua thì hiện `00` và ẩn nhãn "Coming soon") |
| `lib/navigation/routes.ts` | Hằng số đường dẫn của trang chủ (`/`, `/awards-information`, `/sun-kudos`, `/tieu-chuan-chung`, `/profile`), danh sách slug giải thưởng và `awardHref()`. Các trang đích chưa làm nên đang 404 |
| `lib/auth/` | `constants.ts` (đường dẫn, `PUBLIC_PATHS`, `POST_LOGIN_PATH = "/"`, thông điệp lỗi, `ALLOWED_EMAIL_DOMAIN`), `resolve-auth-redirect.ts` (hàm thuần), `is-allowed-email.ts` (hàm thuần, khớp đúng tên miền), `sign-in-with-google.ts` (Server Action, gửi gợi ý `hd`), `sign-out.ts` (Server Action, `signOut({ scope: "local" })` rồi `redirect("/login")`, lỗi chỉ log) |
| `lib/profiles/get-current-profile.ts` | Helper phía server: `getClaims()` rồi đọc dòng `profiles` của chính người dùng, kiểm bằng zod; mọi lỗi chỉ log và trả `null` |
| `supabase/` | SQL chạy tay trong Supabase SQL Editor (không dùng Supabase CLI): `migrations/20261012133000_create_profiles.sql`, `verify/…_verify.sql`, `rollbacks/…_down.sql` |
| `lib/supabase/` | `env.ts` (zod, đọc env lúc chạy), `server.ts` (client theo request), `update-session.ts` (làm mới phiên cho proxy) |
| `lib/validation/` | Schema zod: `request-origin.ts` (Origin của Server Action), `auth-callback.ts` (query của callback), `profile.ts` (`profileSchema`, kiểu `Profile`, `PROFILE_COLUMNS`) |
| `public/images/countdown/`, `public/images/login/`, `public/images/home/` | Ảnh nền, logo, biểu tượng của ba màn. Ảnh hero `keyvisual-bg.webp` nặng khoảng 315 KB. Việc còn lại trước khi triển khai: thêm Cloudflare images binding (tối ưu ảnh `next/image` trên OpenNext) |
| `tests/unit/` | Vitest cho hàm thuần trong `lib/` (cổng, đếm ngược, `get-home-countdown`, `routes`, `resolve-auth-redirect`, `supabase-env`, `auth-callback-query`, `sign-in-origin`, `is-allowed-email`, `get-current-profile`) |
| `tests/e2e/` | Playwright: `countdown-prelaunch-gate.spec.ts`, `login.spec.ts`, `homepage.spec.ts`, `homepage-account-menu.spec.ts` |
| `tests/e2e/support/fake-supabase-server.mjs` | Supabase giả chỉ dùng cho test (127.0.0.1:54398): ký JWT ES256 và phát JWKS để `getClaims()` thật của proxy tự kiểm chữ ký; code production không có đường tắt |

Chưa có: `lib/supabase/client.ts` và `admin.ts` (chưa cần), Cloudflare (`wrangler.jsonc`, `open-next.config.ts`, binding ảnh), CSP theo nonce trong `proxy.ts`, các trang `/awards-information`, `/sun-kudos`, `/tieu-chuan-chung`, `/profile`. Màn Login và trang chủ chưa có F###/spec riêng (không chạy SDD); nếu cần thì chạy `/tkm:rebuild-spec --features`.

## Cổng chờ trước giờ mở (F001)

```text
request -> proxy.ts -> isEventLaunched(getEventStartAt(), Date.now())
        -> resolveGateRedirect(pathname, launched) -> 307 /countdown | 307 /login | tiếp tục
        -> updateSession (getClaims) -> resolveAuthRedirect(pathname, isAuthenticated)
           -> 307 / (đã đăng nhập, ở /login) | 307 /login (chưa đăng nhập, ngoài PUBLIC_PATHS) | trả response
```

| Trạng thái | `/countdown` | Route khác |
|---|---|---|
| Trước `EVENT_START_AT` | hiển thị | 307 về `/countdown` |
| Sau `EVENT_START_AT` | 307 sang `/login` | đi tiếp (qua bước phiên bên dưới: chưa đăng nhập thì về `/login`) |
| `EVENT_START_AT` thiếu/sai | 307 sang `/login`, log lỗi server | đi tiếp (qua bước phiên bên dưới: chưa đăng nhập thì về `/login`) |

Matcher của `proxy.ts` loại tường minh `_next/static`, `_next/image`, `images/`, `favicon.ico`, `robots.txt`, `sitemap.xml`. Asset tĩnh mới ngoài các đường dẫn này phải thêm vào matcher, nếu không sẽ bị cổng chặn trước giờ mở.

Trang `/countdown` truyền `target` và `serverNow` xuống `CountdownTimer`; client tính độ lệch với giờ server để hai đồng hồ không lệch nhau. Khi còn lại ≤ 0, timer gọi `router.replace("/login")` một lần.

## Đăng nhập Google (Supabase, PKCE)

```text
/login -> <form action={signInWithGoogle}> -> kiểm Origin -> signInWithOAuth(google, redirectTo=<origin>/auth/callback)
       -> Google -> /auth/callback?code=... -> exchangeCodeForSession -> isAllowedEmail -> 307 /
       (lỗi, hoặc email ngoài @sun-asterisk.com: signOut rồi 307 /login?error=auth_failed)
```

- Chỉ tài khoản Google có email `@sun-asterisk.com` được vào (khớp đúng tên miền sau dấu `@` cuối, không phân biệt hoa thường; `evil-sun-asterisk.com` hay subdomain bị loại). Ba lớp: `signInWithGoogle` gửi `hd=sun-asterisk.com` (chỉ lọc danh sách tài khoản của Google, không phải chốt chặn); callback kiểm `isAllowedEmail` (tài khoản ngoài tên miền đã tồn tại từ trước cổng vẫn đổi được `code`, nên bị đăng xuất tại đây); CSDL chặn tạo người dùng mới (xem mục Hồ sơ người dùng).

- Sau cổng, `proxy.ts` gọi `updateSession`: làm mới phiên bằng `getClaims()` (không dùng `getSession()`), ghi lại cookie auth kèm header no-store. Env Supabase thiếu/sai thì log lỗi và coi là chưa đăng nhập, không làm sập route.
- Mặc định chặn (default-deny, `resolveAuthRedirect`): người chưa đăng nhập chỉ mở được đúng `/login`, `/auth/callback`, `/countdown` (`PUBLIC_PATHS` trong `lib/auth/constants.ts`, khớp đúng đường dẫn sau khi bỏ dấu `/` cuối); đường dẫn khác, kể cả `/`, bị 307 sang `/login`. Route công khai mới phải thêm vào `PUBLIC_PATHS`. Cổng thời gian vẫn chạy trước: trước giờ mở mọi người về `/countdown`. Thiếu/sai env Supabase thì mọi người bị coi là chưa đăng nhập, nên các route ngoài danh sách đều về `/login`.
- Người đã đăng nhập mở `/login` bị 307 sang `/`. `/` là đích duy nhất sau đăng nhập, không có `next` nên không có open redirect.
- Đăng xuất: form trên trang chủ gọi Server Action `signOut` (`lib/auth/sign-out.ts`), `scope: "local"` nên chỉ xoá phiên của trình duyệt này, luôn kết thúc ở `/login`. Proxy chỉ chặn ở lớp request: trang dữ liệu sau này phải tự kiểm lại phiên phía server.
- Server Action `signInWithGoogle` chỉ tin header `Origin` (hợp lệ http(s)); thiếu hoặc sai thì về `/login?error=auth_failed`. Callback là GET từ Supabase nên không kiểm Origin; cookie PKCE verifier gắn luồng với trình duyệt.
- Lỗi chỉ log phía server; client chỉ thấy một thông điệp cố định.
- Biến môi trường (đọc lúc chạy, build không cần): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Playwright truyền giá trị giả cho cả ba server e2e.
- Triển khai thật cần đặt hai biến trên cho Worker và thêm `<origin>/auth/callback` vào danh sách redirect URL của Supabase. Chưa chạy thử luồng OAuth thật; ảnh nền `/login` là bản xấp xỉ vì export Figma lỗi.

## Hồ sơ người dùng (Supabase `public.profiles`)

Migration `supabase/migrations/20261012133000_create_profiles.sql` chạy tay (role `postgres`, một transaction, chạy lại được). Trạng thái đã áp dụng lên project thật chưa được ghi trong repo: kiểm bằng `supabase/verify/…_verify.sql`; hoàn tác bằng `supabase/rollbacks/…_down.sql` (xoá toàn bộ dòng profile, kể cả `department`).

| Thành phần | Nội dung |
|---|---|
| Bảng | `id` (khoá ngoại `auth.users`, xoá theo), `email`, `full_name`, `avatar_url`, `department` (null, trigger không bao giờ ghi), `created_at`, `updated_at` |
| Quy tắc tài khoản | `is_allowed_email`: email đúng `@sun-asterisk.com`; `is_allowed_account`: thêm `app_metadata.provider = 'google'` (không sửa được từ client) |
| Chốt chặn | Trigger BEFORE INSERT trên `auth.users` raise lỗi với tài khoản không đạt quy tắc (email/OTP, ẩn danh, tên miền khác); GoTrue trả lỗi, người dùng về `/login` với thông điệp chung |
| Đồng bộ | `email` từ `auth.users`; `full_name`, `avatar_url` từ identity Google trong `auth.identities` (làm mới mỗi lần đăng nhập lại), không đọc `raw_user_meta_data` |
| RLS | Bật. `authenticated` đạt quy tắc tài khoản (đọc từ JWT) được SELECT mọi dòng; không có policy ghi; `anon` không có quyền gì |

`getCurrentProfile()` lọc `id` theo `sub` của claims đã kiểm chữ ký (RLS cho đọc mọi dòng nên chính bộ lọc này giới hạn kết quả); chưa có trang nào gọi hàm này.

Vận hành: trước khi chạy migration phải tắt provider Email, Phone và Anonymous trong Supabase Dashboard (Authentication > Sign In / Providers); migration khoá ngắn `auth.users` và `auth.identities` nên chạy ngoài giờ cao điểm; các hàm trigger chạy trong lúc đăng nhập nên mọi ràng buộc thêm vào `profiles` sau này có thể chặn cả đăng nhập. Runbook từng bước: `plans/261012-1330-user-profiles-supabase/phase-03-apply-and-verify.md`. Biến môi trường production và redirect URL không đổi so với màn Login.

## Spec liên quan

- `docs/features/F001_CountdownPrelaunchGate/functional-spec.md`, `technical-spec.md`
- `docs/screens/SCR001_CountdownPrelaunch/spec.md`
- `docs/system/permissions.md`
