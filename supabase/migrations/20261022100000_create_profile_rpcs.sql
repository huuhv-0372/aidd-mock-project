-- Migration: the Profile pages (/profile, /profile/{id}): profile_card + kudos_profile_feed.
-- Purpose : READ-ONLY RPCs, same contract as the other read RPCs: security definer, empty search_path, stable, account
--           rule checked FIRST; a refused caller gets null / 0 rows, never an error that reveals data exists.
--           - profile_card(p_id): the person JSON the board already embeds in every Kudo (kudos_person_json: id,
--             full_name, avatar_url, department, kudos_received, distinct_senders). No email, no auth fields.
--             Unknown or null id -> null (the app answers 404).
--           - kudos_profile_feed(p_profile, p_direction, cursor, limit): one keyset page, newest first, through
--             kudos_rows, so an anonymous Kudo still comes back with sender = null (alias + is_mine only).
--             'received' = Kudos whose recipient is p_profile.
--             'sent'     = ONLY the caller's own profile (p_profile = auth.uid()), anonymous Kudos included. Any other
--                          profile gets 0 rows: someone else's sent list would reveal which anonymous Kudos they sent.
--             Any other direction, or a null profile -> 0 rows.
--           Uses the existing kudos_recipient_id_idx / kudos_sender_id_idx; no new index, no data change.
--           Plan: plans/261021-profile/plan.md (phase 02b)
-- Prereq  : 20261012133000_create_profiles.sql (is_allowed_account), 20261015100000_create_kudos.sql
--           (kudo_row, kudos_rows, kudos_person_json).
-- How to run: paste this whole file into Supabase Dashboard > SQL Editor (role: postgres) and Run.
--           Idempotent; one transaction (all or nothing).
-- Verify  : supabase/verify/20261022100000_create_profile_rpcs_verify.sql (every row must be PASS)
-- Rollback: supabase/rollbacks/20261022100000_create_profile_rpcs_down.sql

begin;

create or replace function public.profile_card(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_jwt jsonb := auth.jwt();
begin
  if not coalesce(public.is_allowed_account(v_jwt ->> 'email', v_jwt -> 'app_metadata'), false) then
    return null;
  end if;

  -- A null or unknown id matches no profile: null.
  return public.kudos_person_json(p_id);
end;
$$;

-- Same order, keyset and clamp as kudos_feed: (created_at desc, id desc); the cursor applies only when both halves
-- are given; 1..20 rows (default 10).
create or replace function public.kudos_profile_feed(
  p_profile uuid,
  p_direction text,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null,
  p_limit integer default 10
)
returns setof public.kudo_row
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_jwt jsonb := auth.jwt();
  v_uid uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 10), 1), 20);
  v_ids uuid[];
begin
  if not coalesce(public.is_allowed_account(v_jwt ->> 'email', v_jwt -> 'app_metadata'), false) then
    return;
  end if;
  if p_profile is null then
    return;
  end if;

  if p_direction = 'received' then
    select pg_catalog.array_agg(x.id order by x.created_at desc, x.id desc) into v_ids
    from (
      select k.id, k.created_at
      from public.kudos as k
      where k.recipient_id = p_profile
        and (p_cursor_created_at is null or p_cursor_id is null
             or (k.created_at, k.id) < (p_cursor_created_at, p_cursor_id))
      order by k.created_at desc, k.id desc
      limit v_limit
    ) as x;
  elsif p_direction = 'sent' and v_uid is not null and p_profile = v_uid then
    -- The caller's own sent list only. The filter is on v_uid (from the verified JWT), never on p_profile alone.
    select pg_catalog.array_agg(x.id order by x.created_at desc, x.id desc) into v_ids
    from (
      select k.id, k.created_at
      from public.kudos as k
      where k.sender_id = v_uid
        and (p_cursor_created_at is null or p_cursor_id is null
             or (k.created_at, k.id) < (p_cursor_created_at, p_cursor_id))
      order by k.created_at desc, k.id desc
      limit v_limit
    ) as x;
  else
    return;
  end if;

  -- No match leaves v_ids null; kudos_rows then returns 0 rows.
  return query select * from public.kudos_rows(v_ids, v_uid);
end;
$$;

revoke execute on function public.profile_card(uuid) from public, anon;
revoke execute on function public.kudos_profile_feed(uuid, text, timestamptz, uuid, integer) from public, anon;
grant execute on function public.profile_card(uuid) to authenticated;
grant execute on function public.kudos_profile_feed(uuid, text, timestamptz, uuid, integer) to authenticated;

commit;
