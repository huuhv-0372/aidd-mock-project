# Changelog

Ghi các thay đổi đáng kể về hành vi. Mới nhất ở trên. Chi tiết mã nằm ở `git log`.

## 2026-10-13

### Sửa: một luật "đã đăng nhập" cho proxy và header; chuẩn hoá `//`

- Proxy (`lib/supabase/update-session.ts`) và header trang chủ (`lib/auth/get-is-authenticated.ts`) cùng dùng `isSignedInClaims()` (`lib/auth/is-signed-in-claims.ts`): đã đăng nhập khi `getClaims()` không lỗi và claims có `sub`. Trước đây proxy chỉ cần có claims, còn header đòi thêm `sub`. Phiên trống (`AuthSessionMissingError`) không còn bị header ghi log lỗi; các lỗi khác vẫn ghi log và coi là khách. (Mức độ: thấp; ảnh hưởng: log, tính nhất quán.)
- `resolveAuthRedirect`: đường dẫn chỉ gồm dấu `/` (`//`, `///`) nay được chuẩn hoá thành `/` (trang chủ công khai) thay vì chuỗi rỗng. (Mức độ: thấp; trước đây người chưa đăng nhập bị đưa sang `/login`, vẫn an toàn.)

### Thay đổi: trang chủ `/` công khai

- `PUBLIC_PATHS` (`lib/auth/constants.ts`) nay gồm `/`, `/login`, `/auth/callback`, `/countdown`. Trước đây `/` yêu cầu đăng nhập. Mọi đường dẫn khác vẫn mặc định chặn: người chưa đăng nhập bị 307 sang `/login`.
- Header trang chủ đọc phiên phía server (`components/home/header-session-controls.tsx` gọi `getIsAuthenticated()` trong `lib/auth/get-is-authenticated.ts`, dùng `getClaims()`). Đã đăng nhập: chuông thông báo và menu tài khoản (có Đăng xuất). Khách: nút "Đăng nhập" sang `/login`. Bộ chọn ngôn ngữ luôn hiện.
- `/` vẫn là Partial Prerender: phần header phụ thuộc phiên nằm trong `Suspense`, fallback là `components/home/header-controls-placeholder.tsx`.
- Test: thêm `tests/e2e/homepage-guest.spec.ts` và `tests/unit/get-is-authenticated.test.ts`; `homepage.spec.ts` chỉ còn ca đã đăng nhập; test cổng đếm ngược nay mong `/` của người chưa đăng nhập ở lại `/`.
- Tài liệu cập nhật: `README.md`, `docs/codebase-summary.md`, `docs/system/permissions.md`, edge case trong spec F001 (`functional-spec.md`, `technical-spec.md`).
