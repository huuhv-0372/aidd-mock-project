# Kết quả chạy SQL thật + thử thật — Viết Kudo (#12)

Người chạy: hoang.van.huu · Ngày: 2026-10-19 · Môi trường: Supabase thật (SQL Editor, role `postgres`).
Bản SQL: migration + verify sau phase 07 (`kudos_search_sunners(text, integer, boolean)`).

## Migration
`supabase/migrations/20261019110000_create_kudo_write.sql` — chạy thành công (người dùng xác nhận "sql đã chạy thành công").

## Verify — 16/16 PASS
| # | Check | Result | Detail |
|---|---|---|---|
| 1 | S1 unaccent in extensions; kudos_unaccent immutable, folds accents | PASS | ext=1 fold=nguyen dang anh |
| 2 | S2 RPCs definer + search_path + volatility + account rule; owner bypasses RLS | PASS | ok |
| 3 | S3 execute: RPCs authenticated only; kudos_unaccent nobody; one kudos_search_sunners | PASS | search_overloads=1 |
| 4 | S4 bucket kudo-images: public, 5242880 bytes, jpeg/png/webp | PASS | match=1 |
| 5 | S5 storage.objects policies by owner_id (no path rule) | PASS | good=3 cmds=DELETE,INSERT,SELECT |
| 6 | B0 storage.objects fixture rows inserted | PASS | ok |
| 7 | B1 valid inputs (plain, 2 images + alias, anonymous w/o alias, 100/5000 chars) | PASS | storage_ok=true |
| 8 | B2 25 invalid inputs → 22023 + exact code, in check order; no partial write | PASS | kudos_by_a=4 |
| 9 | B3 wrong domain / non-Google / no claims: forbidden, empty search | PASS | ok |
| 10 | B4 anon denied on create_kudo + kudos_search_sunners | PASS | denied=2/2 |
| 11 | B5 search: id/name/avatar/department only (no email), not self, by name or email, blank, name-only | PASS | self_rows=0 others=2 keys=avatar_url,department,full_name,id blank=10/10 … |
| 12 | B6 kudos_feed: anonymous Kudo has sender = null, alias + images kept | PASS | sender_uid_in_anonymous_row=false |
| 13 | B7a select on storage.objects: A sees own objects, not B's | PASS | b_object_visible=0 own_visible=3 |
| 14 | B7b delete: A cannot delete B's object, can delete own | PASS | b_rows_deleted=0 b_object_left=1 own_rows_deleted=1 |
| 15 | B7c insert with owner_id = B or null: refused by RLS (42501) | PASS | owner_b=rls owner_null=rls |
| 16 | B7d insert with owner_id = A: allowed | PASS | owner_a=inserted |

## Thử thật (đăng nhập Google, dev server)
- Gửi Kudo có ảnh (người gửi Huu Hoang Van → Đặng Tuấn Kiệt, 21:37) và Kudo ẩn danh (→ Ngoc Vu Thi, 21:35): cả hai hiện đầu All Kudos; Kudo ẩn danh hiện "ẩn danh", không avatar/tên người gửi.
- `select name, owner_id from storage.objects where bucket_id = 'kudo-images' order by created_at desc limit 5;` → 1 dòng: `dc5fc04a-19f3-4a43-9b03-2ada9f958aca.jpg` | `41c99d19-1b8c-42c5-90f4-1ba7e162f1b9`. Tên phẳng `{uuid}.jpg` (không chứa id người gửi); `owner_id` do Storage gán từ JWT của phiên (app không gửi owner).
- Lần thử đầu bị chặn ở client vì ảnh > 5 MB ("Ảnh tối đa 5 MB") — đúng giới hạn; người dùng chọn **giữ 5 MB** (2026-10-19).

## Rủi ro đã biết (người dùng chấp nhận, 2026-10-19)
- Giới hạn bộ nhớ isolate 128 MB của Cloudflare Worker với 5 × 5 MB chưa thử trên Worker đã deploy. Bằng chứng hiện có: workerd local (OpenNext preview) gửi 5 × ~4,9 MB JPEG thành công, không lỗi 1101/500/bộ nhớ (`evidence/raw-temper-runs.json` mục 40–41); workerd local không áp giới hạn 128 MB. Người dùng: "chấp nhận ghi đây là rủi ro đã biết, đã chạy workerd trên máy local".
