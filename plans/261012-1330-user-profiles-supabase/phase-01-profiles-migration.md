# Phase 01: Migration + rollback + verification SQL

## Context Links
- [plan.md](plan.md) · [clarifications.md](clarifications.md) · CLAUDE.md "Supabase" (RLS mandatory)

## Overview
- Priority: P1 · Status: completed · Effort: 0.5h · Owner: implementer
- Three SQL files delivered: migration with profile table, 3 triggers (INSERT backfill, email sync, identity sync), account rule gate + RLS; rollback; verify checks.

## Key Insights
- Supabase default grants give `anon`/`authenticated` full table privileges in `public`; RLS alone is not least privilege, so revoke explicitly then grant SELECT only.
- A throwing trigger on `auth.users` blocks every sign-in. Function must be tiny, null-safe, no NOT NULL beyond `id`.
- One function for INSERT and UPDATE events (upsert) keeps it DRY and self-heals a missing row.

## Requirements
- Functional: profile row exists for every auth user (new, updated, pre-existing); `department` never overwritten.
- Non-functional: idempotent migration (`if not exists` / `or replace` / `drop trigger if exists`), re-runnable; rollback leaves `auth.users` intact.

## Architecture
`auth.users` -> trigger `on_auth_user_upsert_profile` (AFTER INSERT; AFTER UPDATE OF email, raw_user_meta_data) -> `public.handle_auth_user_profile()` -> `public.profiles`.

## Related Code Files
Create (all owned by this phase):
- `supabase/migrations/20261012133000_create_profiles.sql`
- `supabase/rollbacks/20261012133000_create_profiles_down.sql`
- `supabase/verify/20261012133000_create_profiles_verify.sql`

Modify/delete: none.

## Implementation Steps
1. Migration, in order, inside `begin; ... commit;`:
   - `create table if not exists public.profiles (id uuid primary key references auth.users(id) on delete cascade, email text, full_name text, avatar_url text, department text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());`
   - `alter table public.profiles enable row level security;`
   - `revoke all on public.profiles from anon, authenticated; grant select on public.profiles to authenticated;`
   - `drop policy if exists ...; create policy "profiles_select_authenticated" on public.profiles for select to authenticated using (true);` (no write policies)
   - Function (sketch):
     ```sql
     create or replace function public.handle_auth_user_profile() returns trigger
     language plpgsql security definer set search_path = '' as $$
     begin
       insert into public.profiles (id, email, full_name, avatar_url)
       values (new.id, new.email,
         coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
         coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'))
       on conflict (id) do update set email = excluded.email, full_name = excluded.full_name,
         avatar_url = excluded.avatar_url, updated_at = now();
       return new;
     end $$;
     revoke execute on function public.handle_auth_user_profile() from public, anon, authenticated;
     ```
   - `drop trigger if exists on_auth_user_upsert_profile on auth.users;` then create it `after insert or update of email, raw_user_meta_data on auth.users for each row execute function public.handle_auth_user_profile();` (one trigger covers both events; split into two if Postgres rejects the combined form).
   - Backfill: same insert-select from `auth.users` with `on conflict (id) do nothing`.
2. Rollback: `drop trigger if exists ... on auth.users; drop function if exists public.handle_auth_user_profile(); drop policy if exists ... on public.profiles; drop table if exists public.profiles;`.
3. Verify file: labeled queries, each with expected result in a comment:
   - `select relrowsecurity from pg_class where oid = 'public.profiles'::regclass;` -> true
   - `select policyname, cmd, roles from pg_policies where tablename = 'profiles';` -> exactly one SELECT policy
   - `select tgname from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal;` -> contains trigger
   - `select (select count(*) from auth.users) as users, (select count(*) from public.profiles) as profiles;` -> equal
   - `select has_table_privilege('anon','public.profiles','select');` -> false; `has_table_privilege('authenticated','public.profiles','insert')` -> false
   - Idempotence: `update auth.users set raw_user_meta_data = raw_user_meta_data where false;` is a no-op; instruct a rerun of the whole migration to confirm no errors and unchanged counts.

## Todo List
- [ ] migration file
- [ ] rollback file
- [ ] verify file with expected-result comments
- [ ] SQL reviewed by eye: every name schema-qualified, `search_path = ''` set

## Success Criteria
- Files exist, each under ~100 lines, re-runnable on paper (no unguarded `create`).
- Verification checklist covers every item the user listed; phase 03 confirms results.

## Risk Assessment
| Risk | L | I | Countermove |
|------|---|---|-------------|
| Trigger error blocks all sign-in | L | H | Minimal null-safe body; verify file includes a rollback-ready step; user keeps down file open when applying; test a fresh sign-in in 03 |
| Combined `after insert or update of` form unsupported by edit | L | M | Fallback to two triggers sharing the function |
| Backfill misses users with null metadata | M | L | Columns nullable; Kudos UI handles null name later |
| Missed revoke leaves clients with write access | M | H | Verify query asserts `authenticated` has no insert/update/delete |

## Security Considerations
Definer function + empty search_path blocks search-path hijack; execute revoked from clients; RLS on; anon has zero access; no secret anywhere.

## Next Steps
Phase 03 applies and verifies. Later: Kudos/Profile plan adds department picker (and an own-row update policy limited to `department` if needed).
