# CLAUDE.md

Hướng dẫn cho Claude Code khi làm việc trong dự án này.

## Stack

Next.js 16 (App Router, TypeScript) → deploy lên **Cloudflare Workers** qua `@opennextjs/cloudflare`.
Backend/DB/Auth dùng **Supabase**. UI dựng bằng Tailwind CSS v4 (CSS-first, `@theme` trong `app/globals.css`).

> Không dùng `@cloudflare/next-on-pages` (đã deprecated) hay `vinext` (còn beta, chưa hỗ trợ đủ
> Cache Components/PPR). `@opennextjs/cloudflare` là lựa chọn ổn định duy nhất hiện tại.

## Clean code & tổ chức source

- Mỗi file giữ dưới ~200 dòng; tách theo một trách nhiệm duy nhất.
- Đặt tên file kebab-case, tên nói rõ file dùng để làm gì.
- Cấu trúc thư mục:
  - `app/` — routing only (page, layout, route handler).
  - `components/ui/` — thành phần UI dùng chung, **chỉ tạo khi nó lặp lại lần thứ hai** (YAGNI) —
    không scaffold Container/Grid/Stack trước khi có nhu cầu thật.
  - `components/<feature>/` — thành phần theo tính năng.
  - `lib/supabase/` — client factory (xem bên dưới).
  - `lib/security/`, `lib/validation/` — helper bảo mật và schema zod dùng chung.
- YAGNI / KISS / DRY cho mọi thay đổi — không thêm abstraction, config, hay fallback cho tình huống chưa xảy ra.
- Không tạo bản sao "enhanced" của file cũ — sửa trực tiếp file đang có.

## Next.js 16 + Cloudflare Workers

- Build/deploy qua `wrangler.jsonc` + `open-next.config.ts`; bật `compatibility_flags: ["nodejs_compat"]`.
- `middleware.ts` đã đổi tên thành `proxy.ts` ở Next.js 16 — mặc định chạy **Node.js runtime** (không đặt được
  `runtime` trong proxy). Dù vậy, code proxy chỉ dùng Web API (Web Crypto, không `fs`/`path`) để chạy ổn trên
  Cloudflare Workers qua OpenNext.
- Giữ các flag `cacheComponents`, `partialPrefetching` đã bật trong `next.config.ts` — OpenNext hỗ trợ tốt.
- Bí mật/biến môi trường: `wrangler secret put` cho production, không để secret thật trong `vars` của
  `wrangler.jsonc` (dễ bị commit nhầm dạng plaintext).
- Đẩy `"use client"` xuống component lá nhỏ nhất; Server Component giữ phần layout tĩnh để tận dụng cache/prefetch.
- Lưu ý giới hạn kích thước Worker (3 MiB free / 10 MiB paid, gzip) khi thêm dependency nặng.

## Supabase

- Dùng `@supabase/ssr` + `@supabase/supabase-js` (không dùng `@supabase/auth-helpers-nextjs` đã deprecated).
- Ba client factory riêng biệt:
  - `lib/supabase/client.ts` — browser client (`createBrowserClient`).
  - `lib/supabase/server.ts` — server/SSR client (`createServerClient`, đọc/ghi cookie qua `cookies()`).
  - `lib/supabase/admin.ts` — service-role client, **chỉ import từ file server-only**, không bao giờ
    lọt vào file `"use client"` hay bundle phía trình duyệt.
- Middleware (`proxy.ts`) làm mới phiên mỗi request bằng `getClaims()` — **không dùng `getSession()`**
  (đọc cookie chưa xác thực chữ ký, là nguyên nhân phổ biến gây mất phiên đột ngột).
- Biến môi trường: dự án tạo mới dùng tên key mới `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` /
  `SUPABASE_SECRET_KEY` thay cho `..._ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` cũ — **kiểm tra lại tên
  chính xác trên dashboard Supabase thật trước khi dùng**, vì việc chuyển đổi tên key vẫn đang diễn ra.
- **RLS (Row Level Security) bắt buộc bật trên mọi bảng trước khi dùng, không ngoại lệ** — publishable
  key là public by design, không có RLS thì key đó đọc/ghi được mọi dòng.

## Responsive design

- Giữ nguyên cấu hình Tailwind v4 CSS-first (`@theme` trong `app/globals.css`), không thêm `tailwind.config.js`.
- Dùng breakpoint mặc định của Tailwind (`sm`/`md`/`lg`/`xl`/`2xl`) — chỉ thêm breakpoint tuỳ chỉnh khi
  có thiết kế thật cần đến, không đoán trước.
- `next/image` luôn khai báo `sizes` phù hợp với breakpoint đang dùng — thiếu `sizes` ảnh hưởng trực
  tiếp LCP/CLS.
- Vùng chạm tối thiểu `min-h-11 min-w-11` (44px) cho mọi phần tử tương tác trên mobile.
- Dùng `focus-visible:` thay vì `focus:`; animation bọc trong `motion-safe:` kèm fallback `motion-reduce:`.
- Mobile-first: viết CSS mặc định cho màn nhỏ trước, override dần lên `md:`/`lg:`/`xl:`.

## Bảo mật — OWASP secure coding

- **Header bảo mật**: route động set qua `next.config.ts` `headers()` (CSP theo nonce đặt ở `proxy.ts`
  vì cần giá trị mới mỗi request); asset tĩnh set qua file `public/_headers` — Worker của OpenNext
  **không** phục vụ static asset qua `headers()` nên hai cơ chế không thay thế được nhau.
- **CSRF**: Server Action đã có check Origin/Host tự động của Next.js; Route Handler làm thay đổi dữ
  liệu (dưới `app/api/*`) **không** có bảo vệ đó — phải tự kiểm tra Origin/Referer qua
  `lib/security/verify-origin.ts` trước khi xử lý.
- **Validate input**: mọi Server Action/Route Handler nhận input từ client phải validate bằng schema
  zod (`lib/validation/*.ts`) trước khi chạm logic nghiệp vụ.
- **Không lộ lỗi nội bộ**: lỗi phía server log đầy đủ (`console.error` hoặc tương đương) nhưng chỉ trả
  về client một thông điệp chung, không bao giờ trả `stack` hay `err.message` thô ở production.
- **Secrets**: không bao giờ gắn tiền tố `NEXT_PUBLIC_` cho secret; service-role key chỉ đọc trong
  `lib/supabase/admin.ts`.
- **Rate limiting**: dùng Cloudflare Rate Limiting Rules (cấu hình ở Cloudflare, không viết code) làm
  lớp chặn cơ bản cho endpoint auth/mutate công khai.
- **Dependency hygiene**: commit lockfile, chạy `npm audit` định kỳ, tránh `eval`/`require` động.

## Lint & build

- Lint trước khi commit: `npm run lint`.
- Build phải qua được `npm run build` trước khi coi một thay đổi là xong.
- Không bỏ qua lỗi build/test để "cho xanh" CI.
