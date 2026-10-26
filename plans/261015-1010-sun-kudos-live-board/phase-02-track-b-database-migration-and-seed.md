---
phase: 02
title: "Track B: migration Kudos (bảng, RLS, RPC đọc) + seed demo"
status: completed
owner: implementer
effort: 3h
test_policy: e2e-red-first
blocked_by: []
---

# Phase 02 — Migration + seed

## Context
- Thiết kế đầy đủ: [database-design.md](database-design.md) — nguồn duy nhất cho tên bảng, cột, RPC.
- Mẫu cần theo: `supabase/migrations/20261012133000_create_profiles.sql` (+ `rollbacks/`, `verify/`): một transaction, idempotent, `set search_path = ''`, tên schema đầy đủ, revoke quyền mặc định.
- Không có `psql`/Supabase CLI: người dùng dán SQL vào Dashboard > SQL Editor (role postgres).

## Goal
Một migration tạo toàn bộ schema Kudos cho #11/#12/#13 + 5 RPC đọc; file verify chứng minh RLS chặn đúng; seed demo cho board có dữ liệu.

## Owned files
- Create: `supabase/migrations/20261015100000_create_kudos.sql`, `supabase/rollbacks/20261015100000_create_kudos_down.sql`, `supabase/verify/20261015100000_create_kudos_verify.sql`, `supabase/seed/20261015_kudos_demo_seed.sql`, `supabase/seed/kudos_demo_seed_cleanup.sql`, `lib/kudos/kudo-types.ts` (**làm đầu tiên** — Track A dùng file này).
- Không sửa trigger/hàm trong migration profiles. Không sửa `lib/validation/profile.ts`.

## Steps
1. `lib/kudos/kudo-types.ts`: kiểu TS cho dòng Kudo, Person, Spotlight, Stats, GiftRecipient, Hashtag, Department đúng hình dạng JSON của RPC (snake_case như DB — theo quy ước `profileSchema`). Không zod ở đây (zod ở 03).
2. Lấy dữ liệu danh mục từ MoMorph/Figma, không đoán:
   - Phòng ban: `get_frame_node_tree` / `query_component` của `WXK5AYB_rG` (CSV dính dấu cách, ví dụ `STVC - R&D` không tách được).
   - Hashtag: 13 tên VI từ `JWpsISMAaM`; `name_en` qua `list_file_localizations`; tên nào không có → tự dịch, ghi vào `reports/en-localizations.md`.
   - Quà: "1 áo phông SAA" (+ các quà khác nếu Figma có).
3. Migration theo thứ tự: bảng danh mục + insert dữ liệu (`on conflict do nothing`) → FK `profiles.department` → bảng giao dịch + check + index → trigger `kudo_hearts` (BEFORE INSERT chặn tự tim + gán `hearts_awarded` theo `special_heart_days`; AFTER INSERT/DELETE cập nhật `heart_count`) → RLS + revoke/grant → helper `kudos_person_json(uuid)` (internal, không grant) → 5 RPC đọc.
   - RPC: `security definer`, `stable`, `set search_path = ''`, kiểm `is_allowed_account` đầu hàm; `p_limit` kẹp `least(greatest(p_limit,1),20)`; keyset `(created_at, id) < (cursor)`.
   - Kudo ẩn danh: `sender = null`, giữ `anonymous_name`.
4. Rollback: drop RPC, trigger, bảng (thứ tự ngược), bỏ FK trên `profiles` — không đụng cột `department` và trigger đăng nhập.
5. Verify (chạy được nhiều lần, chỉ `select` + `rollback`): bảng có RLS bật; `anon` không đọc được bảng/RPC nào; giả lập `authenticated` với claims hợp lệ (`set local role authenticated; set local request.jwt.claims = ...`) gọi được 5 RPC; claims sai domain → rỗng; select thẳng `kudos` → bị từ chối; insert tim cho kudo của chính mình → lỗi; tim trong `special_heart_days` → `hearts_awarded = 2`; `heart_count` khớp `count(*)`.
6. Seed theo `database-design.md` § Seed (idempotent, đánh dấu `seed: kudos-demo`); cleanup xoá sạch, chạy lại seed được.
7. Người dùng chạy migration → verify → seed trên Supabase thật; dán kết quả verify vào `reports/db-verify-result.md`.

## Success criteria
- [ ] Verify trả toàn bộ dòng `PASS`; đăng nhập Google vẫn hoạt động sau migration (kiểm tay 1 lần — migration đụng FK trên `profiles`).
- [ ] Seed → board có ≥ 60 kudo, 5 highlight, ≥ 20 recipient; cleanup → 0 dòng demo.
- [x] `npx tsc --noEmit` sạch (types) — `evidence/temper-results.json`.

## Risks
| Risk | L/I | Counter |
|------|-----|---------|
| FK mới trên `profiles` làm hỏng đăng nhập | L/H | `department` hiện luôn null; trigger không ghi cột này; FK `on delete set null`; kiểm đăng nhập sau migrate |
| RPC definer lộ dữ liệu | M/H | Kiểm `is_allowed_account` đầu mỗi hàm; verify có case sai domain + anon |
| Chèn `auth.users` cho seed lệch phiên bản GoTrue | M/M | Chỉ cột tối thiểu (`id, instance_id, aud, role, email, raw_app_meta_data, created_at, updated_at`); gate trigger vẫn chạy và phải cho qua |
| Seed lỡ chạy trên production | L/M | Header cảnh báo; mọi dòng gắn `seed: kudos-demo`; cleanup sẵn |

## Security
Safety-critical (migration, RLS, dữ liệu): verify chạy đầy đủ, cần người duyệt ký trước commit. Không secret nào trong file SQL.

## MoMorph refs:
- Sun* Kudos - Live board: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/MaZUn5xHXZ
- Clarifications: plans/261015-1010-sun-kudos-live-board/clarifications.md
- testPolicy: e2e-red-first

## Completion notes (2026-10-15)
- [x] Steps 1–4, 6: có đủ `supabase/migrations/20261015100000_create_kudos.sql`, `rollbacks/..._down.sql`, `verify/..._verify.sql` (có B11), `seed/20261015_kudos_demo_seed.sql`, `seed/kudos_demo_seed_cleanup.sql`, `lib/kudos/kudo-types.ts`. Review sealed sau fix (distinct_senders, bỏ helper `kudo_matches_filters`, EXISTS inline).
- [x] Danh mục: `list_file_localizations` không có 13 hashtag, nên tên EN tự dịch (`reports/en-localizations.md`). Phòng ban 50 mã (không phải ~49).
- [ ] Step 5 (chạy verify trên DB thật) và step 7 (migration → verify → seed trên Supabase; dán kết quả vào `reports/db-verify-result.md`): **chưa làm**, file kết quả chưa tồn tại. Owner: hoang.van.huu. Xem plan việc 1.
- [ ] Đăng nhập Google sau migrate: chưa làm (plan việc 2).
- Trạng thái: in-review, không đóng cho đến khi có kết quả DB thật và chữ ký riskGate.
