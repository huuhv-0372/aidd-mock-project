# Phase 02 — Track B: migration `set_kudo_heart`

**Owner:** implementer · **Priority:** P1 · **Status:** completed (2026-10-20: migration chạy trên Supabase thật, verify 7/7 PASS, `reports/db-verify-result.md`) · **Effort:** 0.75h · RED-first qua verify SQL

## Context
- `supabase/migrations/20261015100000_create_kudos.sql`: `kudo_hearts` (PK `kudo_id,user_id`), trigger `kudo_hearts_set_awarded` (chặn tự tim, gán 1|2 theo `special_heart_days`), `kudo_hearts_sync_count`, revoke hết quyền bảng, `kudos_my_stats`.
- Quy ước #12 (`20261019110000_create_kudo_write.sql`): `security definer`, `set search_path = ''`, kiểm `auth.uid()` + `is_allowed_account` trước, lỗi `22023` + mã ngắn, revoke public/anon, grant authenticated.

## Files (sở hữu)
- Tạo: `supabase/migrations/20261020150000_create_kudo_heart_rpc.sql`, `supabase/rollbacks/20261020150000_create_kudo_heart_rpc_down.sql`, `supabase/verify/20261020150000_create_kudo_heart_rpc_verify.sql`.

## Thiết kế
```sql
create or replace function public.set_kudo_heart(p_kudo_id uuid, p_liked boolean)
returns table (liked boolean, heart_count integer)  -- volatile, security definer, search_path ''
-- 1. uid null / không phải allowed account → 'forbidden'
-- 2. p_kudo_id null hoặc p_liked null hoặc Kudo không tồn tại → 'not_found' (null p_liked: 'not_found' hay mã riêng, chọn 1, ghi comment)
-- 3. kudos.sender_id = uid → 'own_kudo'
-- 4. p_liked: insert (kudo_id, user_id) on conflict do nothing   -- trigger gán hearts_awarded
--    else:    delete where kudo_id and user_id = uid           -- hearts_received của người gửi tự giảm 1|2
-- 5. return query: exists(dòng của uid), kudos.heart_count (đọc sau trigger)
```
- Không nhận `hearts_awarded` từ client; không đụng `heart_count` trực tiếp.

## Verify (chạy nhiều lần được, `begin … rollback`, PASS/FAIL từng dòng như file verify #12)
- H1 hàm definer + search_path + volatile; chỉ `authenticated` có EXECUTE; anon bị từ chối.
- H2 like → `liked=true`, `heart_count` +1; like lần 2 → không đổi (idempotent); unlike → −1; unlike lần 2 → không đổi, không âm.
- H3 Kudo của mình → `own_kudo`; id lạ → `not_found`; claims sai domain / không claims → `forbidden`; không ghi dòng nào.
- H4 ngày đặc biệt (insert `special_heart_days` bao `now()`): `hearts_awarded=2`; `kudos_my_stats().hearts_received` của **người gửi** +2; unlike → −2. Ngày thường +1/−1.
- H5 select/insert thẳng `kudo_hearts` với role authenticated vẫn bị từ chối.
- H6 sau like, `kudos_feed` của người xem trả `liked_by_me=true`.

## Steps
1. Viết verify trước (RED: hàm chưa có). 2. Viết migration + rollback. 3. Người dùng chạy migration + verify trên Supabase thật, gửi kết quả; ghi `reports/db-verify-result.md`.

## Success
Verify all PASS trên Supabase thật; rollback drop sạch hàm.
