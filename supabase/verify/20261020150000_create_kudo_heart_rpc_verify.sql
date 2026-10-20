-- Verification for: supabase/migrations/20261020150000_create_kudo_heart_rpc.sql
-- How to run: Supabase Dashboard > SQL Editor (role: postgres). Paste this WHOLE file and Run.
--           The last statement prints one row per check. Expected: every row result = PASS.
--           Safe to re-run any time: behaviour checks create throw-away users, Kudos, hearts and x2 days
--           (and hide any x2 day that covers now()), then raise inside a sub-block, so EVERY write is rolled
--           back (only session-local pg_temp functions remain, gone when the session ends).
--           Behaviour checks impersonate `authenticated` / `anon` with `set local role` and fake JWT
--           claims in `request.jwt.claims` (what PostgREST does per request).
-- If a row FAILs: read `detail`; to undo the migration use
--           supabase/rollbacks/20261020150000_create_kudo_heart_rpc_down.sql

-- One set_kudo_heart call as `authenticated` with the given claims: 'liked:heart_count' or 'sqlstate:message'.
create or replace function pg_temp.verify_kudo_heart_call(p_claims text, p_kudo uuid, p_liked boolean, p_self text)
returns text
language plpgsql
as $$
declare
  v_res text;
begin
  perform pg_catalog.set_config('request.jwt.claims', p_claims, true);
  set local role authenticated;
  begin
    select s.liked::text || ':' || s.heart_count::text into v_res from public.set_kudo_heart(p_kudo, p_liked) as s;
    v_res := coalesce(v_res, 'no row');
  exception when others then v_res := sqlstate || ':' || sqlerrm;
  end;
  execute pg_catalog.format('set local role %I', p_self);
  return v_res;
end;
$$;

-- kudos_my_stats().hearts_received of the caller in p_claims (null = no row or error).
create or replace function pg_temp.verify_kudo_heart_stats(p_claims text, p_self text)
returns integer
language plpgsql
as $$
declare
  v_n integer;
begin
  perform pg_catalog.set_config('request.jwt.claims', p_claims, true);
  set local role authenticated;
  begin
    select s.hearts_received into v_n from public.kudos_my_stats() as s;
  exception when others then v_n := null;
  end;
  execute pg_catalog.format('set local role %I', p_self);
  return v_n;
end;
$$;

create or replace function pg_temp.verify_kudo_heart_rpc()
returns table (no integer, check_name text, result text, detail text)
language plpgsql
as $$
#variable_conflict use_column
declare
  v_out   jsonb := '[]'::jsonb;
  v_fn    constant text := 'public.set_kudo_heart(uuid, boolean)';
  v_meta  constant jsonb := '{"provider":"google","providers":["google"]}';
  v_self  constant text := current_user;  -- role to switch back to after impersonating
  v_a uuid := pg_catalog.gen_random_uuid();  -- sender of k1
  v_b uuid := pg_catalog.gen_random_uuid();  -- liker; sender of k2
  v_c uuid := pg_catalog.gen_random_uuid();  -- liker on the x2 day; recipient of both
  v_ca text; v_cb text; v_cc text;
  v_k1 uuid; v_k2 uuid; v_k1_at timestamptz;
  v_r text[]; v_txt text; v_ok boolean; v_n bigint; v_s integer[]; v_awarded smallint[];
  v_liked boolean; v_cnt integer;
begin
  -- H1. Definer, empty search_path, volatile, account rule, owner bypasses RLS (writes kudo_hearts);
  --     exactly (p_kudo_id uuid, p_liked boolean) -> TABLE(liked boolean, heart_count integer);
  --     EXECUTE for authenticated only (no PUBLIC, no anon).
  select pg_catalog.count(*) into v_n
  from pg_catalog.pg_proc as pr
  join pg_catalog.pg_roles as r on r.oid = pr.proowner
  where pr.oid = pg_catalog.to_regprocedure(v_fn)
    and pr.prosecdef and pr.proconfig = array['search_path=""'] and pr.provolatile = 'v'
    and pg_catalog.pg_get_functiondef(pr.oid) like '%public.is_allowed_account(%'
    and (r.rolbypassrls or r.rolsuper)
    and pg_catalog.pg_get_function_identity_arguments(pr.oid) = 'p_kudo_id uuid, p_liked boolean'
    and pg_catalog.pg_get_function_result(pr.oid) = 'TABLE(liked boolean, heart_count integer)'
    and not exists (select 1 from pg_catalog.aclexplode(pr.proacl) as a
                    where a.grantee = 0 and a.privilege_type = 'EXECUTE');
  v_ok := false;
  if v_n = 1 then  -- has_function_privilege raises when the function does not exist
    v_ok := pg_catalog.has_function_privilege('authenticated', v_fn, 'execute')
      and not pg_catalog.has_function_privilege('anon', v_fn, 'execute');
  end if;
  v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
    'name', 'H1 set_kudo_heart: definer + search_path + volatile + account rule + signature; execute authenticated only',
    'ok', coalesce(v_ok, false), 'detail', 'match=' || v_n));

  -- Behaviour: fixtures + impersonation; everything is rolled back at the end of the block.
  begin
    insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, created_at, updated_at)
    select x.id, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated',
           x.email, v_meta, pg_catalog.now(), pg_catalog.now()
    from (values (v_a, 'verify-kudo-heart-a@sun-asterisk.com'), (v_b, 'verify-kudo-heart-b@sun-asterisk.com'),
                 (v_c, 'verify-kudo-heart-c@sun-asterisk.com')) as x(id, email);
    insert into public.profiles (id, email)
    values (v_a, 'verify-kudo-heart-a@sun-asterisk.com'), (v_b, 'verify-kudo-heart-b@sun-asterisk.com'),
           (v_c, 'verify-kudo-heart-c@sun-asterisk.com')
    on conflict (id) do nothing;
    -- Future timestamps: k1 is found in kudos_feed by a cursor just after it, whatever real Kudos exist.
    v_k1_at := pg_catalog.now() + interval '1 hour';
    insert into public.kudos (sender_id, recipient_id, title, content, created_at)
    values (v_a, v_c, 'VERIFY HEART', 'verify heart k1', v_k1_at) returning id into v_k1;
    insert into public.kudos (sender_id, recipient_id, title, content, created_at)
    values (v_b, v_c, 'VERIFY HEART', 'verify heart k2', v_k1_at + interval '1 hour') returning id into v_k2;
    -- Normal day first: hide any configured x2 day that covers now() (rolled back with the rest).
    delete from public.special_heart_days as d where d.starts_at <= pg_catalog.now() and pg_catalog.now() < d.ends_at;
    v_ca := pg_catalog.jsonb_build_object('sub', v_a, 'role', 'authenticated',
      'email', 'verify-kudo-heart-a@sun-asterisk.com', 'app_metadata', v_meta)::text;
    v_cb := pg_catalog.jsonb_build_object('sub', v_b, 'role', 'authenticated',
      'email', 'verify-kudo-heart-b@sun-asterisk.com', 'app_metadata', v_meta)::text;
    v_cc := pg_catalog.jsonb_build_object('sub', v_c, 'role', 'authenticated',
      'email', 'verify-kudo-heart-c@sun-asterisk.com', 'app_metadata', v_meta)::text;

    -- H2. B sets the heart on A's k1: like, like again (no change), unlike, unlike again (no change, never < 0).
    --     Normal day (H4 part 1): hearts_awarded = 1; A (the SENDER) gets +1, then -1.
    v_s := array[pg_temp.verify_kudo_heart_stats(v_ca, v_self)];
    v_r := array[pg_temp.verify_kudo_heart_call(v_cb, v_k1, true, v_self)];
    v_r := v_r || pg_temp.verify_kudo_heart_call(v_cb, v_k1, true, v_self);
    v_s := v_s || pg_temp.verify_kudo_heart_stats(v_ca, v_self);
    select pg_catalog.array_agg(h.hearts_awarded) into v_awarded from public.kudo_hearts as h where h.kudo_id = v_k1;
    v_r := v_r || pg_temp.verify_kudo_heart_call(v_cb, v_k1, false, v_self);
    v_r := v_r || pg_temp.verify_kudo_heart_call(v_cb, v_k1, false, v_self);
    v_s := v_s || pg_temp.verify_kudo_heart_stats(v_ca, v_self);
    v_cnt := (select k.heart_count from public.kudos as k where k.id = v_k1);
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'H2 like -> true:1, like again unchanged, unlike -> false:0, unlike again unchanged',
      'ok', v_r = array['true:1', 'true:1', 'false:0', 'false:0'] and v_cnt = 0,
      'detail', pg_catalog.array_to_string(v_r, ' | ') || ' heart_count=' || coalesce(v_cnt::text, 'null')));

    -- H3. Refusals (22023 + code, in check order) and nothing written.
    v_r := array[
      pg_temp.verify_kudo_heart_call(v_ca, v_k1, true, v_self),                          -- own_kudo
      pg_temp.verify_kudo_heart_call(v_cb, pg_catalog.gen_random_uuid(), true, v_self),  -- not_found
      pg_temp.verify_kudo_heart_call(v_cb, null, true, v_self),                          -- not_found
      pg_temp.verify_kudo_heart_call(v_cb, v_k1, null, v_self),                          -- not_found
      pg_temp.verify_kudo_heart_call(v_cb, v_k2, false, v_self),                         -- own_kudo (unlike too)
      pg_temp.verify_kudo_heart_call(pg_catalog.jsonb_build_object('sub', v_b, 'role', 'authenticated',
        'email', 'verify-kudo-heart-b@gmail.com', 'app_metadata', v_meta)::text, v_k1, true, v_self),
      pg_temp.verify_kudo_heart_call(pg_catalog.jsonb_build_object('sub', v_b, 'role', 'authenticated',
        'email', 'verify-kudo-heart-b@sun-asterisk.com', 'app_metadata', '{"provider":"email"}'::jsonb)::text,
        v_k1, true, v_self),
      pg_temp.verify_kudo_heart_call('', v_k1, true, v_self),
      -- forbidden is checked before not_found and own_kudo
      pg_temp.verify_kudo_heart_call('', pg_catalog.gen_random_uuid(), true, v_self)];
    select pg_catalog.count(*) into v_n from public.kudo_hearts as h where h.kudo_id in (v_k1, v_k2);
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'H3 own -> own_kudo; unknown/null -> not_found; wrong domain/non-Google/no claims -> forbidden; no row',
      'ok', v_r = array['22023:own_kudo', '22023:not_found', '22023:not_found', '22023:not_found', '22023:own_kudo',
                        '22023:forbidden', '22023:forbidden', '22023:forbidden', '22023:forbidden'] and v_n = 0,
      'detail', pg_catalog.array_to_string(v_r, ' | ') || ' rows=' || v_n));

    -- H4. x2 day covering now(): C's heart is stored as 2, heart_count still +1, A gets +2; the x2 day then ends
    --     (row deleted) and the unlike still takes back exactly 2.
    insert into public.special_heart_days (starts_at, ends_at)
    values (pg_catalog.now() - interval '1 hour', pg_catalog.now() + interval '1 hour');
    v_s := v_s || pg_temp.verify_kudo_heart_stats(v_ca, v_self);
    v_r := array[pg_temp.verify_kudo_heart_call(v_cc, v_k1, true, v_self)];
    v_awarded := v_awarded || (select h.hearts_awarded from public.kudo_hearts as h
                               where h.kudo_id = v_k1 and h.user_id = v_c);
    v_s := v_s || pg_temp.verify_kudo_heart_stats(v_ca, v_self);
    delete from public.special_heart_days as d where d.starts_at <= pg_catalog.now() and pg_catalog.now() < d.ends_at;
    v_r := v_r || pg_temp.verify_kudo_heart_call(v_cc, v_k1, false, v_self);
    v_s := v_s || pg_temp.verify_kudo_heart_stats(v_ca, v_self);
    -- v_s: [before, after normal like, after normal unlike, before x2, after x2 like, after x2 unlike]
    v_ok := v_awarded = array[1, 2]::smallint[] and v_r = array['true:1', 'false:0']
      and v_s[2] = v_s[1] + 1 and v_s[3] = v_s[1] and v_s[5] = v_s[4] + 2 and v_s[6] = v_s[4];
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'H4 sender hearts_received: normal day +1/-1 (awarded 1); x2 day +2/-2 (awarded 2), heart_count +1',
      'ok', coalesce(v_ok, false),
      'detail', 'awarded=' || coalesce(v_awarded::text, 'null') || ' stats=' || coalesce(v_s::text, 'null')
                || ' calls=' || pg_catalog.array_to_string(v_r, ' | ')));

    -- H5. The table itself stays closed to clients: select / insert / delete as authenticated -> 42501.
    perform pg_catalog.set_config('request.jwt.claims', v_cb, true);
    set local role authenticated;
    v_txt := null;
    foreach v_txt in array array[
        'select count(*) from public.kudo_hearts',
        pg_catalog.format('insert into public.kudo_hearts (kudo_id, user_id, hearts_awarded) values (%L, %L, 2)', v_k1, v_b),
        pg_catalog.format('delete from public.kudo_hearts where kudo_id = %L', v_k1)] loop
      begin
        execute v_txt;
        v_r := v_r || ('allowed: ' || v_txt);
      exception when others then
        if sqlstate <> '42501' then v_r := v_r || (sqlstate || ': ' || v_txt); end if;
      end;
    end loop;
    execute pg_catalog.format('set local role %I', v_self);
    v_ok := pg_catalog.cardinality(v_r) = 2;  -- the two H4 calls only
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'H5 kudo_hearts select/insert/delete as authenticated -> 42501',
      'ok', v_ok, 'detail', coalesce(nullif(pg_catalog.array_to_string(v_r[3:], ' | '), ''), 'ok')));

    -- H1b. anon cannot execute the RPC.
    perform pg_catalog.set_config('request.jwt.claims', '', true);
    set local role anon;
    begin
      perform public.set_kudo_heart(v_k1, true);
      v_txt := 'executed';
    exception when others then v_txt := sqlstate;
    end;
    execute pg_catalog.format('set local role %I', v_self);
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'H1b anon denied on set_kudo_heart (42501)', 'ok', v_txt = '42501', 'detail', v_txt));

    -- H6. After B likes k1, B's kudos_feed shows k1 liked_by_me = true with heart_count 1.
    v_txt := pg_temp.verify_kudo_heart_call(v_cb, v_k1, true, v_self);
    perform pg_catalog.set_config('request.jwt.claims', v_cb, true);
    set local role authenticated;
    select f.liked_by_me, f.heart_count into v_liked, v_cnt
    from public.kudos_feed(null, null, v_k1_at + interval '1 millisecond', v_k1, 20) as f
    where f.id = v_k1;
    execute pg_catalog.format('set local role %I', v_self);
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'H6 after like, kudos_feed of the viewer: liked_by_me = true, heart_count = 1',
      'ok', v_txt = 'true:1' and coalesce(v_liked, false) and v_cnt = 1,
      'detail', 'call=' || v_txt || ' liked_by_me=' || coalesce(v_liked::text, 'null')
                || ' heart_count=' || coalesce(v_cnt::text, 'null')));

    raise exception 'verify-kudo-heart-rollback';
  exception when others then
    if sqlerrm <> 'verify-kudo-heart-rollback' then
      v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
        'name', 'H* behaviour block aborted', 'ok', false, 'detail', sqlstate || ' ' || sqlerrm));
    end if;
  end;

  return query
    select e.ord::integer, e.value ->> 'name',
           case when coalesce((e.value ->> 'ok')::boolean, false) then 'PASS' else 'FAIL' end,
           e.value ->> 'detail'
    from pg_catalog.jsonb_array_elements(v_out) with ordinality as e(value, ord);
end;
$$;

select * from pg_temp.verify_kudo_heart_rpc();
