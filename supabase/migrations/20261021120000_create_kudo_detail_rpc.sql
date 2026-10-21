-- Migration: one Kudo for the View Kudo page (/sun-kudos/{id}): kudo_detail.
-- Purpose : READS one Kudo by id in the same kudo_row shape as kudos_feed/kudos_highlight, through
--           kudos_rows, so the anonymity rule is the same everywhere: an anonymous Kudo comes back with
--           sender = null (only anonymous_name and is_mine for the viewer's own Kudo). Nothing else is added.
--           Same contract as the other read RPCs: account rule checked FIRST; a refused caller and an
--           unknown id both get 0 rows (never an error that reveals the Kudo exists). The app answers 404.
--           Plan: plans/261021-view-kudo/plan.md (phase 02b)
-- Prereq  : 20261012133000_create_profiles.sql (is_allowed_account), 20261015100000_create_kudos.sql
--           (kudo_row, kudos_rows).
-- How to run: paste this whole file into Supabase Dashboard > SQL Editor (role: postgres) and Run.
--           Idempotent; one transaction (all or nothing).
-- Verify  : supabase/verify/20261021120000_create_kudo_detail_rpc_verify.sql (every row must be PASS)
-- Rollback: supabase/rollbacks/20261021120000_create_kudo_detail_rpc_down.sql

begin;

create or replace function public.kudo_detail(p_id uuid)
returns setof public.kudo_row
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_jwt jsonb := auth.jwt();
begin
  if not coalesce(public.is_allowed_account(v_jwt ->> 'email', v_jwt -> 'app_metadata'), false) then
    return;
  end if;

  -- A null or unknown id joins nothing in kudos_rows: 0 rows.
  return query select * from public.kudos_rows(array[p_id], auth.uid());
end;
$$;

revoke execute on function public.kudo_detail(uuid) from public, anon;
grant execute on function public.kudo_detail(uuid) to authenticated;

commit;
