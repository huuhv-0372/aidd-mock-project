# Phase 02 — Track B: hạ tầng i18n

**Context:** [plan.md](plan.md) · `proxy.ts` · `app/layout.tsx` · `lib/countdown/resolve-gate-redirect.ts` ·
`lib/auth/resolve-auth-redirect.ts` · CLAUDE.md (Server Action phải validate zod; proxy chỉ dùng Web API).

## Overview
Priority P2 · Status completed · 1.25h · Owner implementer. Sở hữu: `proxy.ts`, `app/**`, `lib/i18n/**`,
`lib/validation/locale.ts`.

## Key Insights
- Gate countdown + auth redirect tính trên pathname **gốc** → giữ nguyên, chỉ thêm rewrite ở cuối.
- `cacheComponents` bật: đọc cookie trong page sẽ ép trang động → để proxy quyết locale, page nhận qua `params`.
- Redirect hiện có trả về URL không prefix → không phải sửa `routes.ts`.

## Architecture
```
request /awards-information (cookie NEXT_LOCALE=en)
  → proxy: gate → updateSession → auth redirect (như cũ)
  → rewrite /en/awards-information   (giữ cookie Supabase trên response)
  → app/[locale]/awards-information/page.tsx  (params.locale="en", prerender sẵn)
```

## Related Code Files
- Tạo: `lib/i18n/locales.ts` (`LOCALES`, `Locale`, `DEFAULT_LOCALE`, `LOCALE_COOKIE`, `isLocale`,
  `resolveLocale`), `lib/i18n/get-dictionary.ts` (`server-only`), `lib/i18n/set-locale-action.ts`
  (`"use server"`), `lib/validation/locale.ts`, `app/[locale]/[...rest]/page.tsx` (gọi `notFound()`).
- Dời (`git mv`) + sửa: `app/layout.tsx` → `app/[locale]/layout.tsx` (`lang={locale}`,
  `generateStaticParams`, locale lạ → `notFound()`); `page.tsx`, `not-found.tsx`,
  `login/`, `countdown/`, `awards-information/` → dưới `app/[locale]/`; `generateMetadata` theo locale.
- Sửa: `proxy.ts`, `lib/supabase/update-session.ts` (nếu cần hàm rewrite giữ cookie, như `redirectWithSession`).

## Implementation Steps
1. **15 phút đầu:** tạo `locales.ts` + `get-dictionary.ts` (chữ ký `getDictionary(locale): Dictionary`,
   kiểu `Dictionary` suy từ `messages/vi`) → báo Track A bắt đầu.
2. `proxy.ts`: sau auth redirect, nếu path không phải `/auth/*` thì rewrite sang `/{locale}{path}`,
   chép cookie từ `response` của `updateSession` sang response rewrite.
3. Dời route, thêm `params: Promise<{ locale }>` vào page, truyền `dict` xuống component (Track A định prop).
4. `set-locale-action.ts`: parse bằng schema zod, `cookies().set(LOCALE_COOKIE, v, { path: "/",
   maxAge: 31536000, sameSite: "lax" })`. Không trả lỗi nội bộ ra client.
5. Catch-all `[...rest]` cho 404; kiểm tra `/vi/login` gõ tay → 404 (không lộ segment nội bộ).
6. `npm run build` + `npx tsc --noEmit`.

## Todo
- [x] hợp đồng locale/dictionary (`lib/i18n/locales.ts`, `get-dictionary.ts`) · [x] rewrite proxy (`proxy.ts`, `update-session.ts` rewriteWithSession) · [x] dời 6 route vào `app/[locale]/` · [x] action + zod (`set-locale-action.ts`, `lib/validation/locale.ts`) · [x] 404 catch-all (`[...rest]/page.tsx`) · [x] build (exit 0, 2 bản tĩnh mỗi trang)

## Success Criteria
Build ra 2 bản tĩnh/trang (`/vi/...`, `/en/...` trong output build); unit test phase-01 xanh; gate/auth E2E cũ không đổi.

## Risks
- Mất cookie phiên Supabase khi rewrite → bắt buộc chép cookie (bước 2), E2E authed kiểm tra.
- `not-found` toàn cục cần root layout → giải bằng catch-all trong `[locale]`.

## Security
Cookie locale chỉ nhận `vi|en` (zod + `resolveLocale`), không phản chiếu giá trị thô. Server Action có check Origin sẵn.
