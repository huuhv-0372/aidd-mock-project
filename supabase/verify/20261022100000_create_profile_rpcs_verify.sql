-- Verification for: supabase/migrations/20261022100000_create_profile_rpcs.sql
-- How to run: Supabase Dashboard > SQL Editor (role: postgres). Paste this WHOLE file and Run.
--           The last statement prints one row per check. Expected: every row result = PASS.
--           Safe to re-run any time: behaviour checks create throw-away users and Kudos, then raise inside a
--           sub-block, so EVERY write is rolled back (only session-local pg_temp functions remain, gone when
--           the session ends).
--           Behaviour checks impersonate `authenticated` / `anon` with `set local role` and fake JWT
--           claims in `request.jwt.claims` (what PostgREST does per request).
-- If a row FAILs: read `detail`; to undo the migration use
--           supabase/rollbacks/20261022100000_create_profile_rpcs_down.sql

-- One profile_card call as `authenticated`: the card, 'null' for SQL null, or the string 'sqlstate:message'.
create or replace function pg_temp.verify_profile_card_call(p_claims text, p_id uuid, p_self text)
returns jsonb
language plpgsql
as $$
declare
  v_res jsonb;
begin
  perform pg_catalog.set_config('request.jwt.claims', p_claims, true);
  set local role authenticated;
  begin
    v_res := coalesce(public.profile_card(p_id), 'null'::jsonb);
  exception when others then v_res := pg_catalog.to_jsonb(sqlstate || ':' || sqlerrm);
  end;
  execute pg_catalog.format('set local role %I', p_self);
  return v_res;
end;
$$;

-- One kudos_profile_feed call as `authenticated`: the rows as a jsonb array IN THE ORDER RETURNED, or 'sqlstate:message'.
create or replace function pg_temp.verify_profile_feed_call(
  p_claims text, p_profile uuid, p_direction text, p_cursor_created_at timestamptz, p_cursor_id uuid,
  p_limit integer, p_self text)
returns jsonb
language plpgsql
as $$
declare
  v_res jsonb;
begin
  perform pg_catalog.set_config('request.jwt.claims', p_claims, true);
  set local role authenticated;
  begin
    select coalesce(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(f) - 'ordinality' order by f.ordinality), '[]'::jsonb)
    into v_res
    from public.kudos_profile_feed(p_profile, p_direction, p_cursor_created_at, p_cursor_id, p_limit)
      with ordinality as f;
  exception when others then v_res := pg_catalog.to_jsonb(sqlstate || ':' || sqlerrm);
  end;
  execute pg_catalog.format('set local role %I', p_self);
  return v_res;
end;
$$;

-- Row ids of a feed result, in order ('{}' for anything that is not an array).
create or replace function pg_temp.verify_profile_ids(p_rows jsonb)
returns text[]
language sql
immutable
as $$
  select coalesce(pg_catalog.array_agg(e.value ->> 'id' order by e.ord), '{}'::text[])
  from pg_catalog.jsonb_array_elements(case when pg_catalog.jsonb_typeof(p_rows) = 'array' then p_rows else '[]'::jsonb end)
    with ordinality as e(value, ord);
$$;

create or replace function pg_temp.verify_profile_rpcs()
returns table (no integer, check_name text, result text, detail text)
language plpgsql
as $$
#variable_conflict use_column
declare
  v_out     jsonb := '[]'::jsonb;
  v_card_fn constant text := 'public.profile_card(uuid)';
  v_feed_fn constant text := 'public.kudos_profile_feed(uuid, text, timestamptz, uuid, integer)';
  v_meta    constant jsonb := '{"provider":"google","providers":["google"]}';
  v_self    constant text := current_user;  -- role to switch back to after impersonating
  v_t0      constant timestamptz := pg_catalog.now() - interval '1 day';
  v_a uuid := pg_catalog.gen_random_uuid();  -- sends one ANONYMOUS Kudo (to C) and one named Kudo (to D)
  v_b uuid := pg_catalog.gen_random_uuid();  -- sends one named Kudo (to D); the main viewer
  v_c uuid := pg_catalog.gen_random_uuid();  -- the profile under test: 22 received (21 named from E + A's anonymous one)
  v_d uuid := pg_catalog.gen_random_uuid();  -- receives A's and B's named Kudos
  v_e uuid := pg_catalog.gen_random_uuid();  -- bulk sender to C
  v_ca text; v_cb text; v_nosub text;
  v_k_anon uuid; v_k_a uuid; v_k_b uuid;
  v_exp text[]; v_ids text[]; v_ids2 text[]; v_ids3 text[]; v_r text[];
  v_rows jsonb; v_rows2 jsonb; v_rows3 jsonb; v_card jsonb; v_card_a jsonb; v_all text;
  v_def text; v_txt text; v_ok boolean; v_n bigint;
begin
  -- P1. profile_card: definer, empty search_path, stable, account rule, owner bypasses RLS; exactly (p_id uuid) -> jsonb;
  --     EXECUTE for authenticated only (no PUBLIC, no anon).
  select pg_catalog.count(*) into v_n
  from pg_catalog.pg_proc as pr
  join pg_catalog.pg_roles as r on r.oid = pr.proowner
  where pr.oid = pg_catalog.to_regprocedure(v_card_fn)
    and pr.prosecdef and pr.proconfig = array['search_path=""'] and pr.provolatile = 's'
    and pg_catalog.pg_get_functiondef(pr.oid) like '%public.is_allowed_account(%'
    and (r.rolbypassrls or r.rolsuper)
    and pg_catalog.pg_get_function_identity_arguments(pr.oid) = 'p_id uuid'
    and not pr.proretset and pr.prorettype = 'jsonb'::regtype
    and not exists (select 1 from pg_catalog.aclexplode(pr.proacl) as a
                    where a.grantee = 0 and a.privilege_type = 'EXECUTE');
  v_ok := false;
  if v_n = 1 then  -- has_function_privilege raises when the function does not exist
    v_ok := pg_catalog.has_function_privilege('authenticated', v_card_fn, 'execute')
      and not pg_catalog.has_function_privilege('anon', v_card_fn, 'execute');
  end if;
  v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
    'name', 'P1 profile_card: definer + search_path + stable + account rule + signature; execute authenticated only',
    'ok', coalesce(v_ok, false), 'detail', 'match=' || v_n));

  -- P2. kudos_profile_feed: same, SETOF public.kudo_row, and the account rule comes before anything else.
  select pg_catalog.count(*), pg_catalog.max(pg_catalog.pg_get_functiondef(pr.oid)) into v_n, v_def
  from pg_catalog.pg_proc as pr
  join pg_catalog.pg_roles as r on r.oid = pr.proowner
  where pr.oid = pg_catalog.to_regprocedure(v_feed_fn)
    and pr.prosecdef and pr.proconfig = array['search_path=""'] and pr.provolatile = 's'
    and (r.rolbypassrls or r.rolsuper)
    and pg_catalog.pg_get_function_identity_arguments(pr.oid) = 'p_profile uuid, p_direction text, '
      || 'p_cursor_created_at timestamp with time zone, p_cursor_id uuid, p_limit integer'
    and pr.proretset and pr.prorettype = pg_catalog.to_regtype('public.kudo_row')
    and not exists (select 1 from pg_catalog.aclexplode(pr.proacl) as a
                    where a.grantee = 0 and a.privilege_type = 'EXECUTE');
  v_ok := false;
  if v_n = 1 then
    v_ok := pg_catalog.strpos(v_def, 'public.is_allowed_account(') > 0
      and pg_catalog.strpos(v_def, 'public.is_allowed_account(') < pg_catalog.strpos(v_def, 'p_profile is null')
      and pg_catalog.has_function_privilege('authenticated', v_feed_fn, 'execute')
      and not pg_catalog.has_function_privilege('anon', v_feed_fn, 'execute');
  end if;
  v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
    'name', 'P2 kudos_profile_feed: definer + search_path + stable + account rule first + signature; execute authenticated only',
    'ok', coalesce(v_ok, false), 'detail', 'match=' || v_n));

  -- Behaviour: fixtures + impersonation; everything is rolled back at the end of the block.
  begin
    insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, created_at, updated_at)
    select x.id, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated',
           x.email, v_meta, pg_catalog.now(), pg_catalog.now()
    from (values (v_a, 'verify-profile-a@sun-asterisk.com'), (v_b, 'verify-profile-b@sun-asterisk.com'),
                 (v_c, 'verify-profile-c@sun-asterisk.com'), (v_d, 'verify-profile-d@sun-asterisk.com'),
                 (v_e, 'verify-profile-e@sun-asterisk.com')) as x(id, email);
    -- The sign-in trigger already created the rows; set the names the checks read.
    insert into public.profiles (id, email, full_name)
    values (v_a, 'verify-profile-a@sun-asterisk.com', 'Verify A'), (v_b, 'verify-profile-b@sun-asterisk.com', 'Verify B'),
           (v_c, 'verify-profile-c@sun-asterisk.com', 'Verify C'), (v_d, 'verify-profile-d@sun-asterisk.com', 'Verify D'),
           (v_e, 'verify-profile-e@sun-asterisk.com', 'Verify E')
    on conflict (id) do update set full_name = excluded.full_name;
    -- 21 named Kudos E -> C, one hour apart. g = 9 and 10 share created_at: in C's list they are rows 10 and 11, so the
    -- page 1 / page 2 boundary falls inside a tie and only the (created_at, id) keyset keeps it exact.
    insert into public.kudos (sender_id, recipient_id, title, content, created_at)
    select v_e, v_c, 'VERIFY PROFILE', 'verify profile bulk ' || g,
           v_t0 - pg_catalog.make_interval(hours => case when g = 10 then 9 else g end)
    from pg_catalog.generate_series(1, 21) as g;
    insert into public.kudos (sender_id, recipient_id, title, content, is_anonymous, anonymous_name, created_at)
    values (v_a, v_c, 'VERIFY PROFILE', 'verify profile anon', true, 'Verify alias', v_t0) returning id into v_k_anon;
    insert into public.kudos (sender_id, recipient_id, title, content, created_at)
    values (v_a, v_d, 'VERIFY PROFILE', 'verify profile a named', v_t0 - interval '5 hours') returning id into v_k_a;
    insert into public.kudos (sender_id, recipient_id, title, content, created_at)
    values (v_b, v_d, 'VERIFY PROFILE', 'verify profile b named', v_t0 - interval '3 hours') returning id into v_k_b;
    v_ca := pg_catalog.jsonb_build_object('sub', v_a, 'role', 'authenticated',
      'email', 'verify-profile-a@sun-asterisk.com', 'app_metadata', v_meta)::text;
    v_cb := pg_catalog.jsonb_build_object('sub', v_b, 'role', 'authenticated',
      'email', 'verify-profile-b@sun-asterisk.com', 'app_metadata', v_meta)::text;
    v_nosub := pg_catalog.jsonb_build_object('role', 'authenticated',
      'email', 'verify-profile-a@sun-asterisk.com', 'app_metadata', v_meta)::text;
    select pg_catalog.array_agg(k.id::text order by k.created_at desc, k.id desc) into v_exp
    from public.kudos as k where k.recipient_id = v_c;

    -- C1. B reads C's card: exactly the six person keys (no email), C's id, 22 received, 1 distinct (named) sender.
    v_card := pg_temp.verify_profile_card_call(v_cb, v_c, v_self);
    v_ok := false;
    if pg_catalog.jsonb_typeof(v_card) = 'object' then
      v_ok := (select pg_catalog.array_agg(k order by k) from pg_catalog.jsonb_object_keys(v_card) as k)
                = array['avatar_url', 'department', 'distinct_senders', 'full_name', 'id', 'kudos_received']
        and v_card ->> 'id' = v_c::text and v_card ->> 'full_name' = 'Verify C'
        and (v_card ->> 'kudos_received')::integer = 22 and (v_card ->> 'distinct_senders')::integer = 1;
    end if;
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'C1 profile_card: exactly id/full_name/avatar_url/department/kudos_received/distinct_senders',
      'ok', coalesce(v_ok, false), 'detail', pg_catalog.left(v_card::text, 300)));

    -- C2. Own card works; unknown id and null id -> null (not an error).
    v_card_a := pg_temp.verify_profile_card_call(v_ca, v_a, v_self);
    v_r := array[pg_temp.verify_profile_card_call(v_cb, pg_catalog.gen_random_uuid(), v_self)::text,
                 pg_temp.verify_profile_card_call(v_cb, null, v_self)::text];
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'C2 own card -> own id; unknown id / null id -> null',
      'ok', coalesce(v_card_a ->> 'id' = v_a::text, false) and v_r = array['null', 'null'],
      'detail', pg_catalog.left(v_card_a::text, 120) || ' | ' || pg_catalog.array_to_string(v_r, ' | ')));

    -- C3. Refused callers (wrong domain, non-Google, no claims): card null, received feed 0 rows, never an error.
    v_r := array[]::text[];
    foreach v_txt in array array[
      pg_catalog.jsonb_build_object('sub', v_b, 'role', 'authenticated',
        'email', 'verify-profile-b@gmail.com', 'app_metadata', v_meta)::text,
      pg_catalog.jsonb_build_object('sub', v_b, 'role', 'authenticated',
        'email', 'verify-profile-b@sun-asterisk.com', 'app_metadata', '{"provider":"email"}'::jsonb)::text,
      '']
    loop
      v_r := v_r || pg_temp.verify_profile_card_call(v_txt, v_c, v_self)::text
                 || pg_temp.verify_profile_feed_call(v_txt, v_c, 'received', null, null, 10, v_self)::text;
    end loop;
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'C3 wrong domain / non-Google / no claims -> card null, feed 0 rows',
      'ok', v_r = array['null', '[]', 'null', '[]', 'null', '[]'], 'detail', pg_catalog.array_to_string(v_r, ' | ')));

    -- R1. B reads C received, page 1: the 10 newest of C's Kudos in order, all addressed to C; the newest is A's
    --     anonymous Kudo with sender null.
    v_rows := pg_temp.verify_profile_feed_call(v_cb, v_c, 'received', null, null, 10, v_self);
    v_ids := pg_temp.verify_profile_ids(v_rows);
    v_ok := false;
    if pg_catalog.jsonb_typeof(v_rows) = 'array' then
      v_ok := v_ids = v_exp[1:10]
        and not exists (select 1 from pg_catalog.jsonb_array_elements(v_rows) as e(value)
                        where e.value -> 'recipient' ->> 'id' is distinct from v_c::text)
        and v_rows -> 0 ->> 'id' = v_k_anon::text and v_rows -> 0 -> 'sender' = 'null'::jsonb;
    end if;
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'R1 received page 1: right rows, newest first (created_at desc, id desc), all to C',
      'ok', coalesce(v_ok, false), 'detail', pg_catalog.left(v_rows::text, 300)));

    -- R2. Keyset: page 2 from page 1's last row, page 3 from page 2's; all 22 exactly once, no overlap.
    v_rows2 := pg_temp.verify_profile_feed_call(v_cb, v_c, 'received', (v_rows -> 9 ->> 'created_at')::timestamptz,
      (v_rows -> 9 ->> 'id')::uuid, 10, v_self);
    v_ids2 := pg_temp.verify_profile_ids(v_rows2);
    v_ids3 := '{}';
    if pg_catalog.cardinality(v_ids2) = 10 then
      v_rows3 := pg_temp.verify_profile_feed_call(v_cb, v_c, 'received', (v_rows2 -> 9 ->> 'created_at')::timestamptz,
        (v_rows2 -> 9 ->> 'id')::uuid, 10, v_self);
      v_ids3 := pg_temp.verify_profile_ids(v_rows3);
    end if;
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'R2 keyset: page 2 and 3 continue page 1 with no overlap and no gap',
      'ok', coalesce(v_ids2 = v_exp[11:20] and v_ids3 = v_exp[21:22] and not (v_ids && v_ids2), false),
      'detail', 'page2=' || pg_catalog.cardinality(v_ids2) || ' page3=' || pg_catalog.cardinality(v_ids3)));

    -- R3. Half a cursor is ignored (first page again), like kudos_feed.
    v_ok := pg_temp.verify_profile_ids(pg_temp.verify_profile_feed_call(v_cb, v_c, 'received',
              (v_rows -> 9 ->> 'created_at')::timestamptz, null, 10, v_self)) = v_exp[1:10]
      and pg_temp.verify_profile_ids(pg_temp.verify_profile_feed_call(v_cb, v_c, 'received',
              null, (v_rows -> 9 ->> 'id')::uuid, 10, v_self)) = v_exp[1:10];
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'R3 cursor with only one half -> ignored (page 1)', 'ok', coalesce(v_ok, false), 'detail', ''));

    -- R4. Limit clamp 1..20, default 10: 0 -> 1, -5 -> 1, null -> 10, 21 -> 20, 100 -> 20.
    v_r := array[]::text[];
    foreach v_n in array array[0, -5, null, 21, 100]::bigint[]
    loop
      v_r := v_r || pg_catalog.cardinality(pg_temp.verify_profile_ids(pg_temp.verify_profile_feed_call(
        v_cb, v_c, 'received', null, null, v_n::integer, v_self)))::text;
    end loop;
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'R4 limit clamp: 0 / -5 / null / 21 / 100 -> 1 / 1 / 10 / 20 / 20 rows',
      'ok', v_r = array['1', '1', '10', '20', '20'], 'detail', pg_catalog.array_to_string(v_r, ' | ')));

    -- R5. Unknown direction (wrong case, other word, empty, null), null profile, unknown profile -> 0 rows.
    v_r := array[
      pg_temp.verify_profile_feed_call(v_cb, v_c, 'Received', null, null, 10, v_self)::text,
      pg_temp.verify_profile_feed_call(v_cb, v_c, 'all', null, null, 10, v_self)::text,
      pg_temp.verify_profile_feed_call(v_cb, v_c, '', null, null, 10, v_self)::text,
      pg_temp.verify_profile_feed_call(v_cb, v_c, null, null, null, 10, v_self)::text,
      pg_temp.verify_profile_feed_call(v_cb, null, 'received', null, null, 10, v_self)::text,
      pg_temp.verify_profile_feed_call(v_cb, pg_catalog.gen_random_uuid(), 'received', null, null, 10, v_self)::text];
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'R5 unknown direction / null profile / unknown profile -> 0 rows',
      'ok', v_r = array['[]', '[]', '[]', '[]', '[]', '[]'], 'detail', pg_catalog.array_to_string(v_r, ' | ')));

    -- SEC_002. A's own sent list includes A's anonymous Kudo, shown like the board (sender null, alias kept,
    --          is_mine true), newest first, then the named one (sender A, is_mine true).
    v_rows := pg_temp.verify_profile_feed_call(v_ca, v_a, 'sent', null, null, 10, v_self);
    v_ok := pg_temp.verify_profile_ids(v_rows) = array[v_k_anon::text, v_k_a::text]
      and v_rows -> 0 -> 'sender' = 'null'::jsonb and (v_rows -> 0 ->> 'is_anonymous')::boolean
      and v_rows -> 0 ->> 'anonymous_name' = 'Verify alias' and (v_rows -> 0 ->> 'is_mine')::boolean
      and v_rows -> 1 -> 'sender' ->> 'id' = v_a::text and (v_rows -> 1 ->> 'is_mine')::boolean;
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'SEC_002 own sent list includes own anonymous Kudo (sender null, is_mine true)',
      'ok', coalesce(v_ok, false), 'detail', pg_catalog.left(v_rows::text, 300)));

    -- SEC_003. A and B each see only their own sent Kudos; asking for the other's sent list (any limit or cursor),
    --          or asking with allowed claims that carry no sub, gives 0 rows.
    v_ids := pg_temp.verify_profile_ids(v_rows);
    v_ids2 := pg_temp.verify_profile_ids(pg_temp.verify_profile_feed_call(v_cb, v_b, 'sent', null, null, 20, v_self));
    v_r := array[
      pg_temp.verify_profile_feed_call(v_ca, v_b, 'sent', null, null, 20, v_self)::text,
      pg_temp.verify_profile_feed_call(v_cb, v_a, 'sent', null, null, 20, v_self)::text,
      pg_temp.verify_profile_feed_call(v_cb, v_a, 'sent', pg_catalog.now(), pg_catalog.gen_random_uuid(), 10, v_self)::text,
      pg_temp.verify_profile_feed_call(v_nosub, v_a, 'sent', null, null, 10, v_self)::text];
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'SEC_003 sent never crosses users: A sees only A''s, B only B''s, the other''s sent list -> 0 rows',
      'ok', coalesce(v_ids2 = array[v_k_b::text] and not (v_ids && v_ids2)
                     and v_r = array['[]', '[]', '[]', '[]'], false),
      'detail', 'b_sent=' || pg_catalog.array_to_string(v_ids2, ',') || ' | ' || pg_catalog.array_to_string(v_r, ' | ')));

    -- SEC_004. No email or auth field anywhere in the payloads (cards, every received page as B and as A, A's sent list),
    --          and the anonymous sender's id (A) appears nowhere in C's received list, whoever reads it.
    v_all := pg_catalog.concat_ws(' ', v_card, v_card_a, v_rows, v_rows2, v_rows3,
      pg_temp.verify_profile_feed_call(v_ca, v_c, 'received', null, null, 20, v_self),
      pg_temp.verify_profile_feed_call(v_ca, v_c, 'received', (v_rows2 -> 9 ->> 'created_at')::timestamptz,
        (v_rows2 -> 9 ->> 'id')::uuid, 20, v_self));
    v_txt := pg_catalog.concat_ws(' ', pg_temp.verify_profile_feed_call(v_cb, v_c, 'received', null, null, 20, v_self),
      v_rows2, v_rows3,
      pg_temp.verify_profile_feed_call(v_ca, v_c, 'received', null, null, 20, v_self));
    v_ok := pg_catalog.strpos(v_all, '@') = 0 and pg_catalog.strpos(v_all, '"email"') = 0
      and pg_catalog.strpos(v_all, 'provider') = 0 and pg_catalog.strpos(v_all, 'app_metadata') = 0
      and pg_catalog.strpos(v_all, '"aud"') = 0 and pg_catalog.strpos(v_all, '"sub"') = 0
      and pg_catalog.strpos(v_txt, v_a::text) = 0 and pg_catalog.length(v_txt) > 1000;
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'SEC_004 no email / auth fields in any payload; anonymous sender id absent from C''s received list',
      'ok', coalesce(v_ok, false), 'detail', 'bytes=' || pg_catalog.length(v_all)));

    -- P1b/P2b. anon cannot execute either RPC.
    perform pg_catalog.set_config('request.jwt.claims', '', true);
    v_r := array[]::text[];
    set local role anon;
    begin
      perform public.profile_card(v_c);
      v_r := v_r || 'executed'::text;
    exception when others then v_r := v_r || sqlstate::text;
    end;
    begin
      perform public.kudos_profile_feed(v_c, 'received');
      v_r := v_r || 'executed'::text;
    exception when others then v_r := v_r || sqlstate::text;
    end;
    execute pg_catalog.format('set local role %I', v_self);
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'P1b/P2b anon denied on profile_card and kudos_profile_feed (42501)',
      'ok', v_r = array['42501', '42501'], 'detail', pg_catalog.array_to_string(v_r, ' | ')));

    raise exception 'verify-profile-rpcs-rollback';
  exception when others then
    if sqlerrm <> 'verify-profile-rpcs-rollback' then
      v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
        'name', 'X behaviour block aborted', 'ok', false, 'detail', sqlstate || ' ' || sqlerrm));
    end if;
  end;

  return query
    select e.ord::integer, e.value ->> 'name',
           case when coalesce((e.value ->> 'ok')::boolean, false) then 'PASS' else 'FAIL' end,
           e.value ->> 'detail'
    from pg_catalog.jsonb_array_elements(v_out) with ordinality as e(value, ord);
end;
$$;

select * from pg_temp.verify_profile_rpcs();
