# Kết quả chạy SQL thật + thử thật — Like Kudos (#13)

Người chạy: hoang.van.huu · Ngày: 2026-10-20 · Môi trường: Supabase thật (SQL Editor, role `postgres`).

## Migration
`supabase/migrations/20261020150000_create_kudo_heart_rpc.sql` — chạy thành công (người dùng xác nhận "verify SQL và thử thả tim thật đều ok").

## Verify — 7/7 PASS (`supabase/verify/20261020150000_create_kudo_heart_rpc_verify.sql`)
| # | Check | Result | Detail |
|---|---|---|---|
| 1 | H1 set_kudo_heart: definer + search_path + volatile + account rule + signature | PASS | match=1 |
| 2 | H2 like → true:1, like again unchanged, unlike → false:0, unlike again unchanged | PASS | true:1 \| true:1 \| false:0 \| false:0 heart_count=0 |
| 3 | H3 own → own_kudo; unknown/null → not_found; wrong domain/non-Google/no claims → forbidden | PASS | 22023:own_kudo \| 22023:not_found \| 22023:not_found \| 22023:not_found \| … |
| 4 | H4 sender hearts_received: normal day +1/−1 (awarded 1); x2 day +2/−2 (awarded 2) | PASS | awarded={1,2} stats={0,1,0,0,2,0} calls=true:1 \| false:0 |
| 5 | H5 kudo_hearts select/insert/delete as authenticated → 42501 | PASS | ok |
| 6 | H1b anon denied on set_kudo_heart (42501) | PASS | 42501 |
| 7 | H6 after like, kudos_feed of the viewer: liked_by_me = true, heart_count = 1 | PASS | call=true:1 liked_by_me=true heart_count=1 |

## Thử thật (đăng nhập Google, dev server)
- Thả tim Kudo "CHIẾN THẦN DEADLINE" (Lý Bảo Ngọc → Bùi Thanh Tâm) trên `/sun-kudos`: tim đỏ, số 6. Người dùng xác nhận thả/bỏ tim thật hoạt động ("thử thả tim thật đều ok"). Ảnh chụp chỉ có trạng thái đã tim; không có ảnh truy vấn `kudo_hearts`.
