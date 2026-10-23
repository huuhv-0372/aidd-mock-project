-- Migration: Admin - User screen (/admin/users): profiles.role, is_admin, admin_list_users, admin_set_user_role.
-- Purpose : role-based access for the admin area. The role lives ONLY in the database (never in the JWT), so a
--           demotion takes effect on the very next call.
--           - profiles.role: 'user' (default) | 'admin'. No write policy and no UPDATE grant exist on profiles, so
--             nobody can change a role through the API; only admin_set_user_role (security definer) writes it.
--           - is_admin(): true only for a caller whose verified JWT passes the account rule (is_allowed_account)
--             AND whose own profile has role 'admin'. Never raises.
--           - admin_list_users(...): the table of /admin/users and its CSV export. is_admin() is checked FIRST: any
--             other caller gets 0 rows, never an error. Filter, search and sort run here (no dynamic SQL); row_no,
--             total_count, sum_sent, sum_received cover the whole filtered result, before limit/offset.
--             Column definitions (plans/261023-1207-admin-user-management/clarifications.md):
--               sent     = Kudos the person sent (anonymous ones included: a count only, nothing is listed)
--               received = Kudos the person received
--               hearts   = sum(hearts_awarded) on Kudos the person SENT NON-anonymously. Deliberately differs from
--                          kudos_my_stats (which also counts anonymous ones): the per-Kudo heart counts are public, so
--                          an admin could subtract them and unmask who sent an anonymous Kudo
--               level    = Hero tier by distinct NON-anonymous senders (kudos_person_json): 0 | 1-4 | 5-9 | 10-20 | 21+
--               badges   = distinct badges opened (secret_boxes.opened_at not null)
--               time_to_6_badges = when the 6th distinct badge was first opened (max over badges of min(opened_at)),
--                          null until all 6 are opened
--               last_sign_in_at  = auth.users.last_sign_in_at
--           - admin_set_user_role(p_user_id, p_role) -> 'ok' | 'forbidden' | 'self' | 'invalid' | 'not_found', in
--             that check order after a transaction advisory lock (forbidden first: a non-admin learns nothing).
--             An admin cannot change their own role, so the last admin can never remove themselves; the lock makes
--             two admins demoting each other run one after the other, and the second one then sees it lost the role.
--           Mirrored by tests/e2e/support/admin-users-fake.mjs (contract double for E2E).
--           Plan: plans/261023-1207-admin-user-management/plan.md (phase 02b)
-- Prereq  : 20261012133000_create_profiles.sql (profiles, is_allowed_account, sign-in triggers),
--           20261015100000_create_kudos.sql (kudos, kudo_hearts, secret_boxes, departments).
-- How to run: paste this whole file into Supabase Dashboard > SQL Editor (role: postgres) and Run.
--           Idempotent; one transaction (all or nothing).
-- CAUTION : `add column ... default 'user'` is a metadata-only change on PostgreSQL 11+, but it and the check
--           constraint take a brief ACCESS EXCLUSIVE lock on public.profiles, which every sign-in writes: run it
--           off-peak, then sign in once with a real Google account. Sign-in stays safe because both sign-in triggers
--           (handle_auth_user_profile, handle_auth_identity_profile) insert only (id, email[, full_name, avatar_url])
--           and update only email / full_name / avatar_url / updated_at: they never write role, the default always
--           satisfies the check, so neither can raise because of this column.
-- First admin (after the run, by hand, role postgres):
--           update public.profiles set role = 'admin' where email = '<owner>@sun-asterisk.com';
-- Verify  : supabase/verify/20261024100000_create_admin_users_verify.sql (every row must be PASS)
-- Rollback: supabase/rollbacks/20261024100000_create_admin_users_down.sql

begin;

-- 1. profiles.role --------------------------------------------------------------
alter table public.profiles add column if not exists role text not null default 'user';
alter table public.profiles drop constraint if exists profiles_role_known;
alter table public.profiles add constraint profiles_role_known check (role in ('user', 'admin'));

-- 2. is_admin() -------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_jwt jsonb := auth.jwt();
  v_uid uuid := auth.uid();
begin
  if v_uid is null
     or not coalesce(public.is_allowed_account(v_jwt ->> 'email', v_jwt -> 'app_metadata'), false) then
    return false;
  end if;
  return exists (select 1 from public.profiles as p where p.id = v_uid and p.role = 'admin');
end;
$$;

-- 3. admin_list_users(...) ----------------------------------------------------------
-- Every aggregate is computed once per call over grouped sub-tables (no per-row sub-query). Sorting is static SQL:
-- one numeric sort_key picked by CASE p_sort, then two CASE columns for asc/desc, so an unknown p_sort or p_dir leaves
-- both null and the order falls back to (created_at, id) ascending. NULL keys are last in both directions.
create or replace function public.admin_list_users(
  p_department text,
  p_level smallint,
  p_role text,
  p_search text,
  p_sort text,
  p_dir text,
  p_limit integer,
  p_offset integer
)
returns table (
  user_id uuid, row_no integer, full_name text, email text, department text,
  sent integer, received integer, hearts integer, level integer, badges integer,
  time_to_6_badges timestamptz, last_sign_in_at timestamptz, role text,
  total_count integer, sum_sent integer, sum_received integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 5000);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_department text := nullif(p_department, '');
  v_role text := nullif(p_role, '');
  v_dir text := case when p_dir in ('asc', 'desc') then p_dir end;
  v_search text := pg_catalog.left(pg_catalog.btrim(coalesce(p_search, ''), E' \t\r\n'), 100);
  v_pattern text;
begin
  if not public.is_admin() then
    return;
  end if;
  if (p_level is not null and p_level not between 0 and 4)
     or (v_role is not null and v_role not in ('user', 'admin')) then
    return;
  end if;
  -- Search is a plain substring: \ % _ are escaped, so they match themselves.
  v_pattern := '%' || pg_catalog.replace(pg_catalog.replace(pg_catalog.replace(
    v_search, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%';

  return query
  with sent_agg as (
    select k.sender_id as id, pg_catalog.count(*)::integer as sent
    from public.kudos as k
    group by k.sender_id
  ),
  received_agg as (
    select k.recipient_id as id, pg_catalog.count(*)::integer as received,
           (pg_catalog.count(distinct k.sender_id) filter (where not k.is_anonymous))::integer as distinct_senders
    from public.kudos as k
    group by k.recipient_id
  ),
  hearts_agg as (
    select k.sender_id as id, pg_catalog.sum(h.hearts_awarded)::integer as hearts
    from public.kudo_hearts as h
    join public.kudos as k on k.id = h.kudo_id
    where not k.is_anonymous
    group by k.sender_id
  ),
  badge_first as (
    select b.owner_id as id, b.badge, pg_catalog.min(b.opened_at) as first_opened
    from public.secret_boxes as b
    where b.opened_at is not null
    group by b.owner_id, b.badge
  ),
  badges_agg as (
    select bf.id, pg_catalog.count(*)::integer as badges,
           case when pg_catalog.count(*) = 6 then pg_catalog.max(bf.first_opened) end as time6
    from badge_first as bf
    group by bf.id
  ),
  base as (
    select p.id, p.full_name, p.email, p.department, p.role, p.created_at,
           coalesce(s.sent, 0) as sent,
           coalesce(r.received, 0) as received,
           coalesce(h.hearts, 0) as hearts,
           -- Hero tier thresholds: the ONE SQL copy of lib/kudos/hero-title.ts (heroTier).
           case
             when coalesce(r.distinct_senders, 0) >= 21 then 4
             when coalesce(r.distinct_senders, 0) >= 10 then 3
             when coalesce(r.distinct_senders, 0) >= 5 then 2
             when coalesce(r.distinct_senders, 0) >= 1 then 1
             else 0
           end as level,
           coalesce(bg.badges, 0) as badges,
           bg.time6,
           u.last_sign_in_at
    from public.profiles as p
    left join sent_agg as s on s.id = p.id
    left join received_agg as r on r.id = p.id
    left join hearts_agg as h on h.id = p.id
    left join badges_agg as bg on bg.id = p.id
    left join auth.users as u on u.id = p.id
  ),
  filtered as (
    select x.*,
           case p_sort
             when 'sent' then x.sent::numeric
             when 'received' then x.received::numeric
             when 'hearts' then x.hearts::numeric
             when 'level' then x.level::numeric
             when 'badges' then x.badges::numeric
             when 'time6' then extract(epoch from x.time6)::numeric
             when 'last_login' then extract(epoch from x.last_sign_in_at)::numeric
           end as sort_key
    from base as x
    where (v_department is null or x.department = v_department)
      and (p_level is null or x.level = p_level)
      and (v_role is null or x.role = v_role)
      and (v_search = ''
           or x.full_name ilike v_pattern escape E'\\'
           or x.email ilike v_pattern escape E'\\')
  ),
  ranked as (
    select f.*,
           (pg_catalog.row_number() over (
              order by (case when v_dir = 'asc' then f.sort_key end) asc nulls last,
                       (case when v_dir = 'desc' then f.sort_key end) desc nulls last,
                       f.created_at, f.id))::integer as row_no,
           (pg_catalog.count(*) over ())::integer as total_count,
           (pg_catalog.sum(f.sent) over ())::integer as sum_sent,
           (pg_catalog.sum(f.received) over ())::integer as sum_received
    from filtered as f
  )
  select rk.id, rk.row_no, rk.full_name, rk.email, rk.department, rk.sent, rk.received, rk.hearts, rk.level,
         rk.badges, rk.time6, rk.last_sign_in_at, rk.role, rk.total_count, rk.sum_sent, rk.sum_received
  from ranked as rk
  where rk.row_no > v_offset
  order by rk.row_no
  limit v_limit;
end;
$$;

-- 4. admin_set_user_role(p_user_id, p_role) ----------------------------------------
-- The advisory lock is taken BEFORE is_admin(): every role change runs one at a time, and in READ COMMITTED the
-- is_admin() statement after the lock gets a fresh snapshot, so it sees a demotion committed by the change before it.
create or replace function public.admin_set_user_role(p_user_id uuid, p_role text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('admin_set_user_role'));

  if not public.is_admin() then
    return 'forbidden';
  end if;
  if p_user_id = auth.uid() then
    return 'self';
  end if;
  if p_role is null or p_role not in ('user', 'admin') then
    return 'invalid';
  end if;

  update public.profiles as p
  set role = p_role, updated_at = pg_catalog.now()
  where p.id = p_user_id;
  if not found then
    return 'not_found';
  end if;
  return 'ok';
end;
$$;

-- 5. Grants -------------------------------------------------------------------------
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.admin_list_users(text, smallint, text, text, text, text, integer, integer)
  from public, anon;
revoke execute on function public.admin_set_user_role(uuid, text) from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.admin_list_users(text, smallint, text, text, text, text, integer, integer)
  to authenticated;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;

commit;
