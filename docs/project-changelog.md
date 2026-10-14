# Changelog

Ghi các thay đổi đáng kể về hành vi. Mới nhất ở trên. Chi tiết mã nằm ở `git log`.

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
  - Chưa kiểm `Cache-Control: private, no-cache` trên OpenNext/Cloudflare (Cloudflare chưa cài; header mới được kiểm ở bản chạy cục bộ). `Vary: Cookie` không dùng được vì Next ghi đè `Vary` của response trang.
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
