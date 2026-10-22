<!-- Tiêu đề PR theo conventional commit: feat(kudos): ..., fix(auth): ... -->

## Mô tả
<!-- Thay đổi gì, vì sao -->

Closes #
Epic: #

## Thiết kế
- Màn hình: SCR___ — <link MoMorph/Figma>

| Figma | Thực tế (desktop) | Thực tế (mobile) |
|-------|-------------------|------------------|
|       |                   |                  |

## Thay đổi chính
-

## Database (Supabase)
- [ ] Không thay đổi DB
- [ ] Có migration — đủ bộ `migrations/` + `rollbacks/` + `verify/`
- [ ] RLS đã bật trên bảng mới; RPC/policy đã kiểm tra quyền
- [ ] Đã chạy migration + verify trên Supabase thật

## Cách test
**Điều kiện trước:** (tài khoản, dữ liệu seed…)
1.

**Kết quả mong đợi:**

## Checklist
**Kiểm tra tự động**
- [ ] `npm run lint`
- [ ] `npm test` (Vitest)
- [ ] `npm run test:e2e` (Playwright)
- [ ] `npm run build`
- [ ] `npm run preview` — bắt buộc nếu đụng `next.config.ts`, `proxy.ts`, `<Suspense>` hoặc thêm dependency

**UI**
- [ ] Khớp Figma trên mobile và desktop
- [ ] Mọi locale hiển thị đúng
- [ ] Vùng chạm ≥ 44px, `focus-visible`, animation bọc `motion-safe`

**Bảo mật**
- [ ] Input từ client validate bằng zod (`lib/validation/`)
- [ ] Route Handler ghi dữ liệu có gọi `verify-origin`
- [ ] Lỗi không lộ `err.message`/stack ra client
- [ ] `lib/supabase/admin.ts` không bị import vào code phía client
- [ ] Không có secret trong code / `wrangler.jsonc`; biến mới đã `wrangler secret put`

**Tài liệu**
- [ ] Cập nhật `docs/project-changelog.md` (và `docs/system/` nếu đổi kiến trúc/quyền)

## Phụ thuộc
- Merge sau PR #

## Ghi chú cho reviewer

## Thời gian
Estimate: __h · Thực tế: __h
