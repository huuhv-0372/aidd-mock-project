# Codebase summary

Tóm tắt cấu trúc mã hiện có. Quy ước viết code nằm ở `CLAUDE.md`; cách chạy lệnh nằm ở `README.md`.

## Cấu trúc

| Đường dẫn | Vai trò |
|---|---|
| `proxy.ts` | Cổng truy cập theo thời gian (F001), rồi làm mới phiên Supabase và chuyển người đã đăng nhập khỏi `/login` (Next.js 16 proxy, trước đây là middleware) |
| `app/countdown/page.tsx` | Trang `/countdown` (Server Component, đọc env theo request trong `Suspense`) |
| `app/login/page.tsx` | Trang `/login` (PPR); banner lỗi đọc `?error` trong `Suspense`, chỉ hiện thông điệp cố định |
| `app/auth/callback/route.ts` | Route Handler GET `/auth/callback`: đổi `code` lấy phiên (PKCE), redirect về hằng số, không có tham số `next` |
| `app/layout.tsx`, `app/globals.css` | Layout gốc, font (Montserrat, Digital Numbers), token Tailwind `@theme` |
| `app/fonts/` | Font LED `digital-numbers-regular.ttf` và `digital-numbers-font-provenance.md` (nguồn gốc, giấy phép) |
| `components/countdown/` | `countdown-screen.tsx` (khung tĩnh), `countdown-timer.tsx` (client, đếm mỗi giây), `countdown-unit.tsx` (khối Days/Hours/Minutes) |
| `components/login/` | `login-header`, `login-hero`, `login-footer`, `login-background`, `login-error-banner`, `google-login-button`, `google-login-form` (client, gắn Server Action), `language-selector` (client, VN/EN chỉ là giao diện, chưa đổi ngôn ngữ thật) |
| `lib/event/get-event-start-at.ts` | Đọc và kiểm `EVENT_START_AT`; `isEventLaunched` |
| `lib/countdown/` | Hàm thuần: `resolve-gate-redirect.ts`, `split-remaining-time.ts`, `server-clock-offset.ts` |
| `lib/auth/` | `constants.ts` (đường dẫn, `POST_LOGIN_PATH = "/"`, thông điệp lỗi), `resolve-auth-redirect.ts` (hàm thuần), `sign-in-with-google.ts` (Server Action) |
| `lib/supabase/` | `env.ts` (zod, đọc env lúc chạy), `server.ts` (client theo request), `update-session.ts` (làm mới phiên cho proxy) |
| `lib/validation/` | Schema zod: `request-origin.ts` (Origin của Server Action), `auth-callback.ts` (query của callback) |
| `public/images/countdown/`, `public/images/login/` | Ảnh nền, logo của hai màn |
| `tests/unit/` | Vitest cho hàm thuần trong `lib/` (cổng, đếm ngược, `resolve-auth-redirect`, `supabase-env`, `auth-callback-query`, `sign-in-origin`) |
| `tests/e2e/` | Playwright: `countdown-prelaunch-gate.spec.ts`, `login.spec.ts` |

Chưa có: `lib/supabase/client.ts` và `admin.ts` (chưa cần), Cloudflare (`wrangler.jsonc`, `open-next.config.ts`), CSP theo nonce trong `proxy.ts`. Màn Login chưa có F###/spec riêng (không chạy SDD); nếu cần thì chạy `/tkm:rebuild-spec --features`.

## Cổng chờ trước giờ mở (F001)

```text
request -> proxy.ts -> isEventLaunched(getEventStartAt(), Date.now())
        -> resolveGateRedirect(pathname, launched) -> 307 /countdown | 307 /login | tiếp tục
        -> updateSession (getClaims) -> resolveAuthRedirect(pathname, isAuthenticated) -> 307 / | trả response
```

| Trạng thái | `/countdown` | Route khác |
|---|---|---|
| Trước `EVENT_START_AT` | hiển thị | 307 về `/countdown` |
| Sau `EVENT_START_AT` | 307 sang `/login` | đi tiếp (qua bước phiên bên dưới) |
| `EVENT_START_AT` thiếu/sai | 307 sang `/login`, log lỗi server | đi tiếp (qua bước phiên bên dưới) |

Matcher của `proxy.ts` loại tường minh `_next/static`, `_next/image`, `images/`, `favicon.ico`, `robots.txt`, `sitemap.xml`. Asset tĩnh mới ngoài các đường dẫn này phải thêm vào matcher, nếu không sẽ bị cổng chặn trước giờ mở.

Trang `/countdown` truyền `target` và `serverNow` xuống `CountdownTimer`; client tính độ lệch với giờ server để hai đồng hồ không lệch nhau. Khi còn lại ≤ 0, timer gọi `router.replace("/login")` một lần.

## Đăng nhập Google (Supabase, PKCE)

```text
/login -> <form action={signInWithGoogle}> -> kiểm Origin -> signInWithOAuth(google, redirectTo=<origin>/auth/callback)
       -> Google -> /auth/callback?code=... -> exchangeCodeForSession -> 307 /   (lỗi: 307 /login?error=auth_failed)
```

- Sau cổng, `proxy.ts` gọi `updateSession`: làm mới phiên bằng `getClaims()` (không dùng `getSession()`), ghi lại cookie auth kèm header no-store. Env Supabase thiếu/sai thì log lỗi và coi là chưa đăng nhập, không làm sập route.
- Người đã đăng nhập mở `/login` bị 307 sang `/` (`resolveAuthRedirect`). `/` là đích duy nhất sau đăng nhập, không có `next` nên không có open redirect.
- Server Action `signInWithGoogle` chỉ tin header `Origin` (hợp lệ http(s)); thiếu hoặc sai thì về `/login?error=auth_failed`. Callback là GET từ Supabase nên không kiểm Origin; cookie PKCE verifier gắn luồng với trình duyệt.
- Lỗi chỉ log phía server; client chỉ thấy một thông điệp cố định.
- Biến môi trường (đọc lúc chạy, build không cần): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Playwright truyền giá trị giả cho cả ba server e2e.
- Triển khai thật cần đặt hai biến trên cho Worker và thêm `<origin>/auth/callback` vào danh sách redirect URL của Supabase. Chưa chạy thử luồng OAuth thật; ảnh nền `/login` là bản xấp xỉ vì export Figma lỗi.

## Spec liên quan

- `docs/features/F001_CountdownPrelaunchGate/functional-spec.md`, `technical-spec.md`
- `docs/screens/SCR001_CountdownPrelaunch/spec.md`
- `docs/system/permissions.md`
