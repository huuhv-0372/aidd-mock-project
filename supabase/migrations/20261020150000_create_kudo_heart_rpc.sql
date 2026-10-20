-- Migration: heart a Kudo (#13 Like Kudos): set_kudo_heart, the ONLY write path to kudo_hearts.
-- Purpose : SETS the caller's heart on a Kudo (p_liked = desired state, not a toggle: repeated or
--           overlapping calls cannot flip each other) and returns (liked, heart_count) read after the
--           heart triggers of 20261015100000. The client never sends hearts_awarded nor a count:
--           kudo_hearts_set_awarded stores 1 or 2 (x2 days in special_heart_days, configured by SQL),
--           kudo_hearts_sync_count keeps kudos.heart_count = number of rows, and deleting the row takes
--           back exactly what it gave (kudos_my_stats sums hearts_awarded for the SENDER).
--           Errors: SQLSTATE 22023 + short message code, checked in this order: forbidden, not_found,
--           own_kudo — mirrored by tests/e2e/support/kudo-hearts-fake.mjs.
--           Plan: plans/261020-1429-like-kudos/phase-02-track-b-heart-rpc-migration.md
-- Prereq  : 20261012133000_create_profiles.sql, 20261015100000_create_kudos.sql.
-- How to run: paste this whole file into Supabase Dashboard > SQL Editor (role: postgres) and Run.
--           Idempotent; one transaction (all or nothing).
-- Verify  : supabase/verify/20261020150000_create_kudo_heart_rpc_verify.sql (every row must be PASS)
-- Rollback: supabase/rollbacks/20261020150000_create_kudo_heart_rpc_down.sql

begin;

create or replace function public.set_kudo_heart(p_kudo_id uuid, p_liked boolean)
returns table (liked boolean, heart_count integer)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_jwt jsonb := auth.jwt();
  v_uid uuid := auth.uid();
  v_sender uuid;
begin
  if v_uid is null
     or not coalesce(public.is_allowed_account(v_jwt ->> 'email', v_jwt -> 'app_metadata'), false) then
    raise exception 'forbidden' using errcode = '22023';
  end if;

  -- A null argument is reported as not_found (no separate code): there is no Kudo/state to act on, and the
  -- app validates both arguments before calling, so a null only comes from a hand-made request.
  select k.sender_id into v_sender from public.kudos as k where k.id = p_kudo_id;
  if v_sender is null or p_liked is null then
    raise exception 'not_found' using errcode = '22023';
  end if;

  -- Checked here for a clear code; the BEFORE INSERT trigger refuses it too (check_violation). Unliking
  -- your own Kudo is refused as well: there can be no such row.
  if v_sender = v_uid then
    raise exception 'own_kudo' using errcode = '22023';
  end if;

  if p_liked then
    insert into public.kudo_hearts (kudo_id, user_id)
    values (p_kudo_id, v_uid)
    on conflict (kudo_id, user_id) do nothing;
  else
    delete from public.kudo_hearts as h
    where h.kudo_id = p_kudo_id and h.user_id = v_uid;
  end if;

  -- After the triggers: the real state of this caller's row and the count other likers moved too.
  return query
    select exists (select 1 from public.kudo_hearts as h where h.kudo_id = p_kudo_id and h.user_id = v_uid),
           k.heart_count
    from public.kudos as k
    where k.id = p_kudo_id;
end;
$$;

revoke execute on function public.set_kudo_heart(uuid, boolean) from public, anon;
grant execute on function public.set_kudo_heart(uuid, boolean) to authenticated;

commit;
