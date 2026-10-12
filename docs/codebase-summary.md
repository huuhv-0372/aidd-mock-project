# Codebase summary

Tóm tắt cấu trúc mã hiện có. Quy ước viết code nằm ở `CLAUDE.md`; cách chạy lệnh nằm ở `README.md`.

## Cấu trúc

| Đường dẫn | Vai trò |
|---|---|
| `proxy.ts` | Cổng truy cập theo thời gian (Next.js 16 proxy, trước đây là middleware) |
| `app/countdown/page.tsx` | Trang `/countdown` (Server Component, đọc env theo request trong `Suspense`) |
| `app/layout.tsx`, `app/globals.css` | Layout gốc, font (Montserrat, Digital Numbers), token Tailwind `@theme` |
| `app/fonts/` | Font LED `digital-numbers-regular.ttf` và `digital-numbers-font-provenance.md` (nguồn gốc, giấy phép) |
| `components/countdown/` | `countdown-screen.tsx` (khung tĩnh), `countdown-timer.tsx` (client, đếm mỗi giây), `countdown-unit.tsx` (khối Days/Hours/Minutes) |
| `lib/event/get-event-start-at.ts` | Đọc và kiểm `EVENT_START_AT`; `isEventLaunched` |
| `lib/countdown/` | Hàm thuần: `resolve-gate-redirect.ts`, `split-remaining-time.ts`, `server-clock-offset.ts` |
| `public/images/countdown/` | Ảnh nền trang đếm ngược |
| `tests/unit/` | Vitest cho các hàm thuần trong `lib/` |
| `tests/e2e/` | Playwright: `countdown-prelaunch-gate.spec.ts` |

Chưa có: Supabase (`lib/supabase/`), Cloudflare (`wrangler.jsonc`, `open-next.config.ts`), route `/login`.

## Cổng chờ trước giờ mở (F001)

```text
request -> proxy.ts -> isEventLaunched(getEventStartAt(), Date.now())
        -> resolveGateRedirect(pathname, launched) -> 307 /countdown | 307 /login | tiếp tục
```

| Trạng thái | `/countdown` | Route khác |
|---|---|---|
| Trước `EVENT_START_AT` | hiển thị | 307 về `/countdown` |
| Sau `EVENT_START_AT` | 307 sang `/login` | đi tiếp |
| `EVENT_START_AT` thiếu/sai | 307 sang `/login`, log lỗi server | đi tiếp |

Matcher của `proxy.ts` loại tường minh `_next/static`, `_next/image`, `images/`, `favicon.ico`, `robots.txt`, `sitemap.xml`. Asset tĩnh mới ngoài các đường dẫn này phải thêm vào matcher, nếu không sẽ bị cổng chặn trước giờ mở.

Trang `/countdown` truyền `target` và `serverNow` xuống `CountdownTimer`; client tính độ lệch với giờ server để hai đồng hồ không lệch nhau. Khi còn lại ≤ 0, timer gọi `router.replace("/login")` một lần.

## Spec liên quan

- `docs/features/F001_CountdownPrelaunchGate/functional-spec.md`, `technical-spec.md`
- `docs/screens/SCR001_CountdownPrelaunch/spec.md`
- `docs/system/permissions.md`
