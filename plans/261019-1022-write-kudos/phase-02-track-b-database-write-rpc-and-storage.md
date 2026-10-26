# Phase 02 — Track B: migration create_kudo, tìm Sunner, Storage

**Owner:** implementer · **Priority:** P1 · **Status:** completed (2026-10-19: migration chạy thành công trên Supabase thật, verify 16/16 PASS gồm S2, B5, B6, B7a–d, `reports/db-verify-result.md`; caveat: lần chạy thứ 2 để chứng minh idempotent chưa ghi, làm khi deploy môi trường khác; phase 07 đổi chữ ký `kudos_search_sunners` thêm `p_name_only`). Lưu ý: mục 3 (regex ảnh theo `auth.uid()/`) và mục 4 (policy theo thư mục) đã bị thay ở fix round 1 bằng tên phẳng `{uuid}.{ext}` + `owner_id`, xem `clarifications.md` · Safety-critical (DB, auth, Storage policy) → review SQL đầy đủ

## Context
- `supabase/migrations/20261015100000_create_kudos.sql` (bảng, `is_allowed_account`, mẫu RPC `security definer`, grants), `supabase/verify/20261015100000_create_kudos_verify.sql` (mẫu verify).
- `plans/261015-1010-sun-kudos-live-board/database-design.md`. Máy không có `psql`: người dùng chạy SQL bằng tay trong Supabase SQL Editor.

## Files (sở hữu)
- Tạo: `supabase/migrations/20261019110000_create_kudo_write.sql`, `supabase/rollbacks/20261019110000_create_kudo_write_down.sql`, `supabase/verify/20261019110000_create_kudo_write_verify.sql`.

## Nội dung migration
1. `create extension if not exists unaccent with schema extensions;` + wrapper `public.kudos_unaccent(text)` `immutable` (gọi `extensions.unaccent('extensions.unaccent', $1)`).
2. `kudos_search_sunners(p_query text, p_limit int default 10)` → `setof (id, full_name, avatar_url, department)`. `stable security definer set search_path=''`; sai tài khoản → rỗng; `btrim(p_query)` rỗng → rỗng; escape `%`/`_`; so `kudos_unaccent(lower(full_name)) like '%'||…||'%'`; bỏ `auth.uid()`; `order by full_name limit least(greatest(p_limit,1),10)`.
3. `create_kudo(p_recipient_id uuid, p_title text, p_content text, p_hashtag_slugs text[], p_image_urls text[], p_is_anonymous boolean, p_anonymous_name text)` → `uuid`. `volatile security definer set search_path=''`. Kiểm theo thứ tự, lỗi `raise exception … using errcode = '22023'` với mã ngắn (`invalid_recipient`, `invalid_title`, `invalid_content`, `invalid_hashtags`, `invalid_images`, `invalid_alias`, `forbidden`):
   - `auth.uid()` null hoặc `is_allowed_account` sai → `forbidden`. Sender **luôn** là `auth.uid()`, không nhận từ tham số.
   - Người nhận tồn tại trong `profiles`, ≠ sender.
   - `btrim(title)` 1–100; `content` 1–5000 và không toàn khoảng trắng.
   - Slug: 1–5, không trùng, tất cả có trong `hashtags` (đếm khớp).
   - Ảnh: 0–5; mỗi URL khớp `'/storage/v1/object/public/kudo-images/' || auth.uid() || '/[0-9a-f-]{36}\.(jpg|png|webp)$'` **và** có dòng `storage.objects` (`bucket_id='kudo-images'`, `name` tương ứng, `owner = auth.uid()`).
   - Alias: `not p_is_anonymous` → phải null; ẩn danh → `nullif(btrim(alias),'')`, ≤50.
   - Insert `kudos` (title/alias đã trim) → `kudo_hashtags` → `kudo_images` (position 1..n theo thứ tự mảng); trả `id`.
4. Storage: bucket `kudo-images` (`public = true`, `file_size_limit = 5242880`, `allowed_mime_types = {image/jpeg,image/png,image/webp}`), insert `on conflict do nothing`. Policy trên `storage.objects` cho `authenticated`: INSERT và DELETE khi `bucket_id='kudo-images' and (storage.foldername(name))[1] = auth.uid()::text and is_allowed_account(...)`. Không policy UPDATE/SELECT (đọc qua URL public).
5. Grants: `revoke execute … from public, anon`; `grant execute … to authenticated` cho 2 RPC; wrapper unaccent cũng revoke khỏi `anon`.

## Verify SQL (chạy tay, ghi PASS/FAIL từng dòng như file #11)
Gọi RPC dưới `set local role authenticated` + `request.jwt.claims` giả: tạo hợp lệ (có/không ảnh, ẩn danh có/không alias); từng lỗi ở mục 3; gửi cho chính mình; 6 hashtag; slug lạ; URL ảnh thư mục người khác; URL đúng mẫu nhưng không có object; `anon` gọi bị từ chối; kết quả search không có email, không có chính mình, "nguyen" khớp "Nguyễn"; `kudos_feed` trả Kudo ẩn danh mới với `sender = null`.

## Rollback file
Drop 2 RPC + wrapper, drop 2 policy, `delete from storage.buckets where id='kudo-images'` chỉ khi rỗng. Không drop extension `unaccent`.

## Success
Migration chạy 2 lần không lỗi (idempotent); verify toàn PASS trên Supabase thật (`reports/db-verify-result.md`); reviewer SQL ký checklist ở phase 06.

## Risk
- `storage.objects.owner` kiểu `uuid` vs `owner_id text` tuỳ phiên bản Storage → kiểm cột thật trước khi viết (`tkm:search-docs` Supabase Storage).
- `unaccent` không immutable → wrapper bắt buộc nếu sau này đánh index.
