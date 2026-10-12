-- Migration: public.profiles for @sun-asterisk.com Google users, synced from auth.users + auth.identities.
-- Purpose : one profile per allowed auth user. email comes from auth.users; full_name/avatar_url
--           from the Google identity (auth.identities.identity_data, not user-editable via the API;
--           raw_user_meta_data is never read). `department` is never written here.
--           Allowed = @sun-asterisk.com email AND account created via Google. A BEFORE INSERT gate
--           rejects every other signup (other domains; Email/Phone/Anonymous/Dashboard-invite users).
-- Prereq  : disable the Email, Phone and Anonymous providers first (phase-03 step 0).
-- How to run: paste this whole file into Supabase Dashboard > SQL Editor (role: postgres) and Run.
--           Idempotent; one transaction (all or nothing).
-- CAUTION : running it takes a brief ACCESS EXCLUSIVE lock on auth.users and auth.identities
--           (drop/create trigger): run off-peak. Every function below runs inside sign-in; a future
--           NOT NULL / unique / check constraint on profiles, or any change that makes these
--           functions raise, can block EVERY login. Only the gate raises, deliberately.
-- Verify  : supabase/verify/20261012133000_create_profiles_verify.sql
-- Rollback: supabase/rollbacks/20261012133000_create_profiles_down.sql

begin;

-- 1. Table -------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  avatar_url  text,
  department  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2. Access rules (the ONLY place the domain and the provider are written) ------
-- Domain: exact domain after the last '@', case-insensitive, non-empty local part. Not a suffix
-- match: '_%@sun-asterisk.com' rejects evil-sun-asterisk.com, sun-asterisk.com.evil.io, subdomains.
-- Mirrors lib/auth/is-allowed-email.ts.
create or replace function public.is_allowed_email(p_email text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(pg_catalog.lower(pg_catalog.btrim(p_email)) like '_%@sun-asterisk.com', false);
$$;

-- Account: domain + created via Google. GoTrue sets raw_app_meta_data.provider in the auth.users
-- INSERT itself (SignupParams.ToUserModel) and later only rewrites it to the provider of the OLDEST
-- identity (UpdateAppMetaDataProviders), so it stays 'google' for Google-born accounts even after
-- other identities are linked. Not `providers ? 'google'`: that would admit an email-born account
-- that later links a Google identity. app_metadata is not user-editable and is copied into the JWT.
create or replace function public.is_allowed_account(p_email text, p_app_metadata jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select public.is_allowed_email(p_email)
     and coalesce(p_app_metadata ->> 'provider' = 'google', false);
$$;
-- authenticated needs EXECUTE on both because the RLS policy below runs them as the querying user.
revoke execute on function public.is_allowed_email(text) from public, anon;
revoke execute on function public.is_allowed_account(text, jsonb) from public, anon;
grant execute on function public.is_allowed_email(text) to authenticated;
grant execute on function public.is_allowed_account(text, jsonb) to authenticated;

-- 3. RLS + least-privilege grants --------------------------------------------
-- Supabase default privileges give anon/authenticated ALL on new public tables; strip them.
alter table public.profiles enable row level security;
revoke all on table public.profiles from anon;
revoke all on table public.profiles from authenticated;
grant select on table public.profiles to authenticated;

-- Only callers whose verified JWT passes the account rule may read (Kudos shows sender/receiver),
-- so pre-existing non-domain or non-Google accounts get nothing even via direct API calls.
-- `(select ...)` makes it one evaluation per statement. No write policies: only definer triggers write.
drop policy if exists "profiles_select_allowed_domain" on public.profiles;
create policy "profiles_select_allowed_domain"
  on public.profiles
  for select
  to authenticated
  using ((select public.is_allowed_account(
    (select auth.jwt()) ->> 'email', (select auth.jwt()) -> 'app_metadata')));

-- 4. Gate: BEFORE INSERT on auth.users (deliberately raises) -------------------
-- GoTrue then fails the signup ("Database error saving new user") and redirects to our
-- callback with ?error=..., which shows the generic login error. Message stays generic.
create or replace function public.enforce_allowed_email_domain()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_allowed_account(new.email, new.raw_app_meta_data) then
    raise exception 'sign-up not allowed';
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_enforce_email_domain on auth.users;
create trigger on_auth_user_enforce_email_domain
  before insert on auth.users
  for each row
  execute function public.enforce_allowed_email_domain();

-- 5. Sync email: AFTER INSERT OR UPDATE OF email on auth.users -----------------
-- security definer + empty search_path: every name is schema-qualified. Must never raise.
-- The IS DISTINCT FROM guard makes an unchanged email a no-op (row and updated_at untouched).
create or replace function public.handle_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_allowed_account(new.email, new.raw_app_meta_data) then
    insert into public.profiles as p (id, email)
    values (new.id, new.email)
    on conflict (id) do update
      set email = excluded.email, updated_at = pg_catalog.now()
      where p.email is distinct from excluded.email;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_upsert_profile on auth.users;
create trigger on_auth_user_upsert_profile
  after insert or update of email on auth.users
  for each row
  execute function public.handle_auth_user_profile();

-- 6. Sync name/avatar: AFTER INSERT OR UPDATE OF identity_data on auth.identities ---
-- GoTrue writes identity_data on first link AND on every OAuth re-login, so name/avatar refresh.
-- insert ... select from auth.users keeps the FK satisfied and skips users failing the rule.
create or replace function public.handle_auth_identity_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles as p (id, email, full_name, avatar_url)
  select
    u.id,
    u.email,
    coalesce(new.identity_data ->> 'full_name', new.identity_data ->> 'name'),
    coalesce(new.identity_data ->> 'avatar_url', new.identity_data ->> 'picture')
  from auth.users as u
  where u.id = new.user_id
    and public.is_allowed_account(u.email, u.raw_app_meta_data)
  on conflict (id) do update
    set full_name  = excluded.full_name,
        avatar_url = excluded.avatar_url,
        updated_at = pg_catalog.now()
    where p.full_name  is distinct from excluded.full_name
       or p.avatar_url is distinct from excluded.avatar_url;
  return new;
end;
$$;

drop trigger if exists on_auth_identity_upsert_profile on auth.identities;
create trigger on_auth_identity_upsert_profile
  after insert or update of identity_data on auth.identities
  for each row
  when (new.provider = 'google')
  execute function public.handle_auth_identity_profile();

-- Only triggers should run these; triggers do not check EXECUTE at fire time.
revoke execute on function public.enforce_allowed_email_domain() from public, anon, authenticated;
revoke execute on function public.handle_auth_user_profile() from public, anon, authenticated;
revoke execute on function public.handle_auth_identity_profile() from public, anon, authenticated;

-- 7. Backfill allowed users that existed before this migration ----------------
-- Name/avatar from one Google identity per user (latest updated_at; id breaks ties).
insert into public.profiles (id, email, full_name, avatar_url)
select
  u.id,
  u.email,
  coalesce(i.identity_data ->> 'full_name', i.identity_data ->> 'name'),
  coalesce(i.identity_data ->> 'avatar_url', i.identity_data ->> 'picture')
from auth.users as u
left join lateral (
  select gi.identity_data
  from auth.identities as gi
  where gi.user_id = u.id and gi.provider = 'google'
  order by gi.updated_at desc nulls last, gi.id
  limit 1
) as i on true
where public.is_allowed_account(u.email, u.raw_app_meta_data)
on conflict (id) do nothing;

commit;
