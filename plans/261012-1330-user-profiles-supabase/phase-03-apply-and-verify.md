# Phase 03: Apply migration, run checklist, docs note

## Context Links
- [plan.md](plan.md) · [clarifications.md](clarifications.md) · phase 02 helper
- SQL: `supabase/migrations/20261012133000_create_profiles.sql` · `supabase/verify/20261012133000_create_profiles_verify.sql` · `supabase/rollbacks/20261012133000_create_profiles_down.sql`

## Overview
- Priority: P1 · Status: completed (migration đã chạy trên project thật: mọi migration sau, từ 2026-10-15, phụ thuộc vào nó; ngày chính xác không được ghi) · Effort: 0.75h · Owner: user (Dashboard + SQL Editor) + orchestrator (checks, docs)
- Awaits user SQL apply + sign-off. Login phase 05 committed (68eb213). Phases 01/02 ready; schema, migration, helper, tests all pass.

## Key Insights
- Agent cannot touch the Supabase project: the user-run runbook below is the hard gate, not optional.
- Access rule = `is_allowed_account`: email `@sun-asterisk.com` AND `app_metadata.provider = 'google'`. Gate (BEFORE INSERT on `auth.users`), RLS, both sync triggers and the backfill all use it.
- `raw_user_meta_data` is ignored by design (name/avatar come from `auth.identities`): editing it changes nothing. The old "update raw_user_meta_data" probe is NOT a valid test.
- The gate also rejects Dashboard "Add user"/"Invite user" (provider `email`). Intended: people join by signing in with Google.

## Requirements
- Email, Phone, Anonymous providers off; Google on. Checks 1-8 and 10 match their expected results.
- Real-login tests in step 3 pass. Docs mention the table, RLS stance, manual-migration workflow.

## Architecture
No new components. Order: providers off -> migration -> verify -> real logins -> (optional check 9) -> report.

## Related Code Files
Modify: `docs/codebase-summary.md` (short "Supabase schema / migrations" note) and `docs/system/permissions.md` (profiles: Google + domain users read-only, no client writes); doc-writer owns these. Docs impact: minor.
Plan housekeeping: `plan.md` statuses. Create/delete: none.

## Implementation Steps (runbook cho user)
0. **Chuẩn bị**
   - Kiểm tra project ref trên Dashboard trùng host trong `NEXT_PUBLIC_SUPABASE_URL`.
   - Mở file rollback ở một tab SQL Editor thứ hai (chưa chạy) để dùng ngay nếu cần.
   - Dashboard > Authentication > Sign In / Providers (UI cũ: Authentication > Providers): **tắt Email, Phone và "Allow anonymous sign-ins"**, giữ Google bật. Ghi lại trạng thái (ảnh chụp hoặc một dòng mô tả) cho bước 6.
1. **Chạy migration**: dán toàn bộ file migration vào SQL Editor (role `postgres`) > Run. Kỳ vọng "Success. No rows returned".
   - Lỗi `permission denied` / `must be owner of table identities` (hoặc `users`): role `postgres` thiếu quyền TRIGGER trên bảng auth. Migration chạy trong một transaction nên **không có gì được áp dụng**, không cần rollback. Dừng lại, gửi nguyên văn lỗi cho orchestrator; không tự sửa SQL (bỏ trigger trên `auth.identities` thì tên/avatar không đồng bộ).
2. **Chạy verify** từng block một (bôi đen block > Run), đối chiếu kết quả:
   - 1: `rls_enabled = true` · 2: đúng 1 policy, `uses_account_rule = true` · 3: đúng 3 trigger, `enabled = 'O'`
   - 4: 5 function, `search_path=""` tất cả; `domain_in_rule` chỉ `is_allowed_email`; `provider_in_rule` chỉ `is_allowed_account`; `uses_account_rule` true ở gate + 2 hàm `handle_*`
   - 5: `allowed_users = profiles`, `missing = 0`, `non_rule_profiles = 0`. Nếu `domain_non_google_users > 0`: xem bằng
     `select id, email, raw_app_meta_data ->> 'provider' as provider, created_at, email_confirmed_at from auth.users where public.is_allowed_email(email) and not public.is_allowed_account(email, raw_app_meta_data);`
     tài khoản lạ (tạo qua email/OTP) thì xoá ở Authentication > Users. Không có profile nên không cần rollback.
   - 6: chỉ `auth_select = true` · 7: chỉ `domain_rule_auth`, `account_rule_auth` = true · 8: chỉ `allowed`, `upper`, `google_account` = true
   - 10: chạy lại cả file migration -> "Success"; check 5 ra số như cũ.
3. **Test đăng nhập thật** (app đang chạy, mỗi lần dùng phiên mới / cửa sổ ẩn danh):
   - a) Precondition: chọn tài khoản `@sun-asterisk.com` chưa từng đăng nhập (kiểm tra `select count(*) from auth.users where email = '<email>';` = 0) để đảm bảo gate's INSERT path chạy (không UPDATE cũ). Tài khoản Google `@sun-asterisk.com` đăng nhập được. Chạy `select email, full_name, avatar_url, department, updated_at from public.profiles where email = '<email>';` -> có tên + avatar, `department` null.
   - b) Đăng xuất, đăng nhập lại cùng tài khoản; chạy lại câu trên -> `updated_at` không đổi (trừ khi tên/ảnh Google vừa đổi).
   - c) Tài khoản Google ngoài domain (vd gmail cá nhân, chọn "Use another account") -> `/login` hiện lỗi chung; `select count(*) from auth.users where email = '<gmail>';` = 0 (nếu tài khoản này từng đăng nhập trước khi có gate thì vẫn là 1 cũ, không tăng; app callback từ chối và đăng xuất; không có profile).
4. **(Tuỳ chọn) verify check 9**: chạy cả block `begin ... rollback`. Kỳ vọng "Success. No rows returned". Lỗi `permission denied` trên `auth.users`/`auth.identities` -> bỏ qua, bước 3 đã chứng minh hành vi này. Lỗi `step x ... failed` -> báo orchestrator.
5. **Khi nào chạy rollback**: chỉ khi bước 3a thất bại (domain user không đăng nhập được) hoặc check 1/2/3/6/7 sai. Rollback xoá bảng `profiles`, mọi trigger và gỡ gate; đăng nhập trở lại như trước. KHÔNG rollback vì lỗi quyền ở check 9, vì `domain_non_google_users > 0`, hay vì sửa `raw_user_meta_data` không đổi profile.
6. **Gửi kết quả cho orchestrator**: trạng thái providers (bước 0), output checks 1-8 và 10, kết quả 3a-3c, check 9 (nếu chạy). Che email thật trước khi commit làm bằng chứng.
7. Orchestrator: smoke `getCurrentProfile()` tạm thời khi đã đăng nhập (không commit, xoá sau); lưu bằng chứng vào `reports/verification-*.md`; chạy `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`; doc-writer cập nhật 2 docs; đóng status phase và plan.

## Todo List
- [ ] Email / Phone / Anonymous providers disabled, Google enabled (recorded)
- [ ] migration applied without error
- [ ] verify checks 1-8 and 10 green
- [ ] real logins: domain user gets name/avatar; re-login keeps `updated_at`; non-domain gets generic error, no `auth.users` row
- [ ] helper smoke returns a `Profile`
- [ ] full lint/tsc/test/build green
- [ ] docs updated; statuses closed

## Success Criteria
- Results pasted and stored in `reports/verification-*.md` (emails redacted).
- Signed-in domain Google user gets own profile via the helper; `anon` gets no rows/permission error.

## Risk Assessment
| Risk | L | I | Countermove |
|------|---|---|-------------|
| Migration breaks sign-in | L | H | Run rollback (tab already open); auth untouched; fix and re-apply |
| `postgres` lacks TRIGGER on auth tables | M | M | Transaction aborts atomically; report error, redesign before retry |
| Email provider left on | L | M | Gate + RLS already block non-Google; step 0 is defence in depth |
| SQL applied to wrong project | L | H | Step 0 project-ref check |
| Checklist skipped, RLS silently off | L | H | Phase cannot close without pasted results |

## Security Considerations
`anon` has no privileges; `authenticated` SELECT only, rows visible only to domain Google JWTs. No keys or secrets in the repo or reports.

## Next Steps
Homepage / Kudos plans consume `getCurrentProfile`; Kudos/Profile plan adds `department` assignment (and the narrow update policy it needs).
