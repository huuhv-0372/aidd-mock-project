-- Rollback for: supabase/migrations/20261012133000_create_profiles.sql
-- Purpose : remove the profiles triggers, functions and table (its policy goes with the table).
--           Deletes all profile rows (incl. any assigned department). auth.users/auth.identities
--           rows are untouched, so sign-in keeps working, and the signup gate is lifted too.
-- How to run: paste this whole file into Supabase Dashboard > SQL Editor (role: postgres) and Run.
--           Safe to re-run. One transaction (all or nothing). Takes a brief ACCESS EXCLUSIVE
--           lock on auth.users and auth.identities: run off-peak.

begin;

-- Triggers first, so auth writes stop depending on the functions/table.
drop trigger if exists on_auth_user_enforce_email_domain on auth.users;
drop trigger if exists on_auth_user_upsert_profile on auth.users;
drop trigger if exists on_auth_identity_upsert_profile on auth.identities;

drop function if exists public.enforce_allowed_email_domain();
drop function if exists public.handle_auth_user_profile();
drop function if exists public.handle_auth_identity_profile();

-- Dropping the table also drops its RLS policy.
drop table if exists public.profiles;

-- Last: the policy above used them (is_allowed_account calls is_allowed_email).
drop function if exists public.is_allowed_account(text, jsonb);
drop function if exists public.is_allowed_email(text);

commit;
