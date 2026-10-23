-- Verification for: supabase/migrations/20261024100000_create_admin_users.sql
-- How to run: Supabase Dashboard > SQL Editor (role: postgres). Paste this WHOLE file and Run.
--           The last statement prints one row per check. Expected: every row result = PASS.
--           Safe to re-run any time: behaviour checks create throw-away users (emails vfyadm-*@sun-asterisk.com),
--           Kudos, hearts and boxes, then raise inside a sub-block, so EVERY write is rolled back (only session-local
--           pg_temp functions remain, gone when the session ends).
--           Behaviour checks impersonate `authenticated` / `anon` with `set local role` and fake JWT claims in
--           `request.jwt.claims` (what PostgREST does per request). List checks are scoped with the search term
--           'vfyadm', so real profiles never change a result.
-- After every row is PASS, assign the first admin by hand (role postgres):
--           update public.profiles set role = 'admin' where email = '<owner>@sun-asterisk.com';
-- If a row FAILs: read `detail`; to undo the migration use
--           supabase/rollbacks/20261024100000_create_admin_users_down.sql

-- Claims of an allowed caller (sub + email + app_metadata.provider), as PostgREST would set them.
create or replace function pg_temp.vau_claims(p_uid uuid, p_email text, p_provider text default 'google')
returns text
language sql
immutable
as $$
  select pg_catalog.jsonb_build_object('sub', p_uid, 'role', 'authenticated', 'email', p_email,
    'app_metadata', pg_catalog.jsonb_build_object('provider', p_provider,
      'providers', pg_catalog.jsonb_build_array(p_provider)))::text;
$$;

-- One admin_list_users call as `authenticated`: the rows as a jsonb array IN THE ORDER RETURNED, or 'sqlstate:message'.
create or replace function pg_temp.vau_list(p_claims text, p_department text, p_level smallint, p_role text,
  p_search text, p_sort text, p_dir text, p_limit integer, p_offset integer, p_self text)
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
    from public.admin_list_users(p_department, p_level, p_role, p_search, p_sort, p_dir, p_limit, p_offset)
      with ordinality as f;
  exception when others then v_res := pg_catalog.to_jsonb(sqlstate || ':' || sqlerrm);
  end;
  execute pg_catalog.format('set local role %I', p_self);
  return v_res;
end;
$$;

-- The temp users only (search 'vfyadm'), whole result in one call unless limit/offset say otherwise.
create or replace function pg_temp.vau_scoped(p_claims text, p_sort text, p_dir text, p_limit integer,
  p_offset integer, p_self text)
returns jsonb
language sql
as $$
  select pg_temp.vau_list(p_claims, null, null, null, 'vfyadm', p_sort, p_dir, p_limit, p_offset, p_self);
$$;

-- One call as p_as ('authenticated' | 'anon'): the answer as text, or the SQLSTATE when it raised.
create or replace function pg_temp.vau_call(p_claims text, p_what text, p_user uuid, p_role text, p_as text,
  p_self text)
returns text
language plpgsql
as $$
declare
  v_res text;
begin
  perform pg_catalog.set_config('request.jwt.claims', p_claims, true);
  execute pg_catalog.format('set local role %I', p_as);
  begin
    case p_what
      -- Dynamic SQL on purpose: a PL/pgSQL simple expression (`v_res := public.is_admin()`) keeps its executor
      -- state for the whole transaction, so EXECUTE is checked once, as the first caller's role. A later call as
      -- anon would then wrongly succeed. `execute` plans (and checks privileges) on every call, like PostgREST.
      when 'is_admin' then execute 'select public.is_admin()::text' into v_res;
      when 'set_role' then
        execute 'select coalesce(public.admin_set_user_role($1, $2), ''null'')' into v_res using p_user, p_role;
      when 'my_stats' then
        select pg_catalog.to_jsonb(m)::text into v_res from public.kudos_my_stats() as m;
      when 'update_role' then
        update public.profiles set role = 'admin' where id = p_user;
        v_res := 'executed';
      when 'insert_profile' then
        insert into public.profiles (id, email, role) values (p_user, 'vfyadm-insert@sun-asterisk.com', 'admin');
        v_res := 'executed';
    end case;
  exception when others then v_res := sqlstate;
  end;
  execute pg_catalog.format('set local role %I', p_self);
  return v_res;
end;
$$;

-- user_id of each row, in order ('{}' for anything that is not an array).
create or replace function pg_temp.vau_ids(p_rows jsonb)
returns text[]
language sql
immutable
as $$
  select coalesce(pg_catalog.array_agg(e.value ->> 'user_id' order by e.ord), '{}'::text[])
  from pg_catalog.jsonb_array_elements(case when pg_catalog.jsonb_typeof(p_rows) = 'array' then p_rows else '[]'::jsonb end)
    with ordinality as e(value, ord);
$$;

-- The row of one user in a result (null when absent).
create or replace function pg_temp.vau_row(p_rows jsonb, p_id uuid)
returns jsonb
language sql
immutable
as $$
  select e.value
  from pg_catalog.jsonb_array_elements(case when pg_catalog.jsonb_typeof(p_rows) = 'array' then p_rows else '[]'::jsonb end)
    as e(value)
  where e.value ->> 'user_id' = p_id::text
  limit 1;
$$;

create or replace function pg_temp.vau_set(p_ids anyarray)
returns text[]
language sql
immutable
as $$
  select coalesce(pg_catalog.array_agg(x::text order by x::text), '{}'::text[]) from pg_catalog.unnest(p_ids) as x;
$$;

-- Independent restatement of the order: key in p_dir, NULL last both ways, ties by (created_at, id) ascending.
create or replace function pg_temp.vau_is_sorted(p_rows jsonb, p_key text, p_dir text)
returns boolean
language sql
stable
as $$
  with r as (
    select e.ord, p.created_at, p.id,
           case when p_key in ('time_to_6_badges', 'last_sign_in_at')
                then extract(epoch from (e.value ->> p_key)::timestamptz)
                else (e.value ->> p_key)::numeric end as k
    from pg_catalog.jsonb_array_elements(p_rows) with ordinality as e(value, ord)
    join public.profiles as p on p.id = (e.value ->> 'user_id')::uuid
  )
  select pg_catalog.jsonb_typeof(p_rows) = 'array' and pg_catalog.jsonb_array_length(p_rows) > 1
     and not exists (
       select 1 from r as a join r as b on b.ord = a.ord + 1
       where (a.k is null and b.k is not null)
          or (a.k is not null and b.k is not null and a.k <> b.k
              and ((p_dir = 'asc' and a.k > b.k) or (p_dir = 'desc' and a.k < b.k)))
          or (a.k is not distinct from b.k and (a.created_at, a.id) > (b.created_at, b.id)));
$$;

create or replace function pg_temp.verify_admin_users()
returns table (no integer, check_name text, result text, detail text)
language plpgsql
as $$
#variable_conflict use_column
declare
  v_out  jsonb := '[]'::jsonb;
  v_self constant text := current_user;
  v_meta constant jsonb := '{"provider":"google","providers":["google"]}';
  v_t0   constant timestamptz := pg_catalog.now() - interval '10 days';
  v_fn_is   constant text := 'public.is_admin()';
  v_fn_list constant text := 'public.admin_list_users(text, smallint, text, text, text, text, integer, integer)';
  v_fn_set  constant text := 'public.admin_set_user_role(uuid, text)';
  v_adm uuid := pg_catalog.gen_random_uuid();  v_adm2 uuid := pg_catalog.gen_random_uuid();
  v_usr uuid := pg_catalog.gen_random_uuid();
  v_p1 uuid := pg_catalog.gen_random_uuid();   -- name 'Vfyadm_u 100%_off'
  v_p2 uuid := pg_catalog.gen_random_uuid();   -- name 'Vfyadm 100x9 decoy', email vfyadm-decoy@
  v_p5 uuid := pg_catalog.gen_random_uuid();   -- name 'Vfyadm back\slash'
  v_p6 uuid := pg_catalog.gen_random_uuid();   -- 100-character name
  v_s uuid[]; v_l uuid[];                      -- 21 senders; 8 recipients with v_ln distinct named senders
  v_ln constant integer[] := array[0, 1, 4, 5, 9, 10, 20, 21];
  v_all uuid[]; v_tags text[];
  v_long constant text := 'Vfyadm long ' || pg_catalog.repeat('x', 88);
  v_c_adm text; v_c_adm2 text; v_c_usr text;
  v_dept text; v_k1 uuid; v_k2 uuid; v_k3 uuid; v_k4 uuid;
  v_rows jsonb; v_page jsonb; v_e jsonb; v_stats jsonb;
  v_ids text[]; v_ids2 text[]; v_exp text[]; v_r text[];
  v_def text; v_txt text; v_ok boolean; v_n bigint; v_m bigint; v_off integer; v_ts timestamptz; v_rec record;
begin
  -- S1. The three functions: definer, empty search_path, volatility, exact signature, owner bypasses RLS,
  --     no PUBLIC execute; authenticated may execute, anon may not.
  select pg_catalog.count(*) into v_n
  from (values (v_fn_is, 's', '', false), (v_fn_set, 'v', 'p_user_id uuid, p_role text', false),
               (v_fn_list, 's', 'p_department text, p_level smallint, p_role text, p_search text, p_sort text, '
                 || 'p_dir text, p_limit integer, p_offset integer', true)) as f(sig, vol, args, retset)
  join pg_catalog.pg_proc as pr on pr.oid = pg_catalog.to_regprocedure(f.sig)
  join pg_catalog.pg_roles as r on r.oid = pr.proowner
  where pr.prosecdef and pr.proconfig = array['search_path=""'] and pr.provolatile::text = f.vol
    and pg_catalog.pg_get_function_identity_arguments(pr.oid) = f.args and pr.proretset = f.retset
    and (r.rolbypassrls or r.rolsuper)
    and not exists (select 1 from pg_catalog.aclexplode(pr.proacl) as a
                    where a.grantee = 0 and a.privilege_type = 'EXECUTE');
  v_ok := false;
  if v_n = 3 then  -- has_function_privilege raises when the function does not exist
    v_ok := pg_catalog.has_function_privilege('authenticated', v_fn_is, 'execute')
      and pg_catalog.has_function_privilege('authenticated', v_fn_list, 'execute')
      and pg_catalog.has_function_privilege('authenticated', v_fn_set, 'execute')
      and not pg_catalog.has_function_privilege('anon', v_fn_is, 'execute')
      and not pg_catalog.has_function_privilege('anon', v_fn_list, 'execute')
      and not pg_catalog.has_function_privilege('anon', v_fn_set, 'execute');
  end if;
  v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
    'name', 'S1 is_admin / admin_list_users / admin_set_user_role: definer + search_path + volatility + signature; '
      || 'execute authenticated only', 'ok', coalesce(v_ok, false), 'detail', 'match=' || v_n));

  -- S2. Contract columns of admin_list_users (names and types the app and the E2E fake read).
  select pg_catalog.string_agg(t.n || ' ' || pg_catalog.format_type(t.ty, null), ', ' order by t.i) into v_txt
  from pg_catalog.pg_proc as pr,
       -- Multi-array unnest is FROM-clause sugar for ROWS FROM and only works unqualified; spell it out instead.
       rows from (pg_catalog.unnest(pr.proargnames), pg_catalog.unnest(pr.proargmodes::text[]),
                  pg_catalog.unnest(pr.proallargtypes)) with ordinality as t(n, m, ty, i)
  where pr.oid = pg_catalog.to_regprocedure(v_fn_list) and t.m = 't';
  v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
    'name', 'S2 admin_list_users returns the 16 contract columns in order',
    'ok', coalesce(v_txt = 'user_id uuid, row_no integer, full_name text, email text, department text, sent integer, '
      || 'received integer, hearts integer, level integer, badges integer, time_to_6_badges timestamp with time zone, '
      || 'last_sign_in_at timestamp with time zone, role text, total_count integer, sum_sent integer, sum_received integer',
      false), 'detail', coalesce(v_txt, 'missing')));

  -- S3. Check order in the bodies: account rule in is_admin; is_admin before the query; lock -> is_admin -> self ->
  --     invalid -> not_found; no dynamic SQL anywhere.
  v_def := pg_catalog.concat_ws(' || ',
    pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure(v_fn_is)),
    pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure(v_fn_list)),
    pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure(v_fn_set)));
  v_ok := pg_catalog.strpos(pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure(v_fn_is)),
            'public.is_allowed_account(') > 0;
  v_txt := pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure(v_fn_list));
  v_ok := v_ok and pg_catalog.strpos(v_txt, 'public.is_admin()') > 0
    and pg_catalog.strpos(v_txt, 'public.is_admin()') < pg_catalog.strpos(v_txt, 'return query');
  v_txt := pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure(v_fn_set));
  v_ok := v_ok and pg_catalog.strpos(v_txt, 'pg_advisory_xact_lock') > 0
    and pg_catalog.strpos(v_txt, 'pg_advisory_xact_lock') < pg_catalog.strpos(v_txt, 'public.is_admin()')
    and pg_catalog.strpos(v_txt, 'public.is_admin()') < pg_catalog.strpos(v_txt, '''self''')
    and pg_catalog.strpos(v_txt, '''self''') < pg_catalog.strpos(v_txt, '''invalid''')
    and pg_catalog.strpos(v_txt, '''invalid''') < pg_catalog.strpos(v_txt, '''not_found''')
    and v_def !~* '\mexecute\M' and v_def !~* '\mformat\s*\(';
  v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
    'name', 'S3 check order (account rule; is_admin first; lock -> forbidden -> self -> invalid -> not_found); no dynamic SQL',
    'ok', coalesce(v_ok, false), 'detail', ''));

  -- V1. profiles.role: not null, default 'user', check constraint present.
  select pg_catalog.count(*) into v_n
  from pg_catalog.pg_attribute as a
  join pg_catalog.pg_attrdef as d on d.adrelid = a.attrelid and d.adnum = a.attnum
  where a.attrelid = 'public.profiles'::regclass and a.attname = 'role' and a.attnotnull and not a.attisdropped
    and pg_catalog.format_type(a.atttypid, a.atttypmod) = 'text'
    and pg_catalog.pg_get_expr(d.adbin, d.adrelid) = '''user''::text'
    and exists (select 1 from pg_catalog.pg_constraint as c
                where c.conrelid = a.attrelid and c.conname = 'profiles_role_known' and c.contype = 'c');
  v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
    'name', 'V1a profiles.role is text not null default ''user'' with check profiles_role_known',
    'ok', v_n = 1, 'detail', 'match=' || v_n));

  -- S4. Sign-in triggers intact (3 enabled).
  select pg_catalog.count(*) into v_n from pg_catalog.pg_trigger as t
  where t.tgrelid in ('auth.users'::regclass, 'auth.identities'::regclass) and not t.tgisinternal and t.tgenabled = 'O'
    and t.tgname in ('on_auth_user_enforce_email_domain', 'on_auth_user_upsert_profile', 'on_auth_identity_upsert_profile');
  v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
    'name', 'S4 sign-in triggers intact', 'ok', v_n = 3, 'detail', 'enabled=' || v_n));

  -- Behaviour: fixtures + impersonation; everything is rolled back at the end of the block.
  begin
    select pg_catalog.array_agg(pg_catalog.gen_random_uuid()) into v_s from pg_catalog.generate_series(1, 21);
    select pg_catalog.array_agg(pg_catalog.gen_random_uuid()) into v_l from pg_catalog.generate_series(1, 8);
    v_all := array[v_adm, v_adm2, v_usr, v_p1, v_p2, v_p5, v_p6] || v_s || v_l;
    v_tags := array['adm', 'adm2', 'usr', 'p1', 'decoy', 'p5', 'p6']
      || (select pg_catalog.array_agg('s' || pg_catalog.lpad(g::text, 2, '0') order by g) from pg_catalog.generate_series(1, 21) as g)
      || (select pg_catalog.array_agg('l' || pg_catalog.lpad(n::text, 2, '0') order by o)
          from pg_catalog.unnest(v_ln) with ordinality as x(n, o));
    -- Goes through the real sign-in trigger (handle_auth_user_profile).
    insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, created_at, updated_at)
    select x.id, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated',
           'vfyadm-' || x.tag || '@sun-asterisk.com', v_meta, pg_catalog.now(), pg_catalog.now()
    from rows from (pg_catalog.unnest(v_all), pg_catalog.unnest(v_tags)) as x(id, tag);

    -- V2. Sign-in path: every new profile was created by the trigger with role 'user'; a Google identity insert
    --     (handle_auth_identity_profile) and an email change still succeed and leave role alone.
    select pg_catalog.count(*) into v_n from public.profiles as p where p.id = any (v_all) and p.role = 'user';
    v_txt := 'ok';
    begin
      insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
      values (v_usr::text, v_usr, pg_catalog.jsonb_build_object('sub', v_usr::text, 'email', 'vfyadm-usr@sun-asterisk.com',
              'full_name', 'Vfyadm identity'), 'google', pg_catalog.now(), pg_catalog.now(), pg_catalog.now());
      update auth.users set email = 'vfyadm-usr2@sun-asterisk.com' where id = v_usr;
      update auth.users set email = 'vfyadm-usr@sun-asterisk.com' where id = v_usr;
    exception when others then v_txt := sqlstate || ' ' || sqlerrm;
    end;
    select pg_catalog.count(*) into v_m from public.profiles as p
    where p.id = v_usr and p.role = 'user' and p.full_name = 'Vfyadm identity' and p.email = 'vfyadm-usr@sun-asterisk.com';
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'V2 sign-in triggers create profiles with role user; identity insert + email change do not raise',
      'ok', v_n = pg_catalog.cardinality(v_all) and v_m = 1 and v_txt = 'ok',
      'detail', 'trigger_profiles=' || v_n || '/' || pg_catalog.cardinality(v_all) || ' identity=' || v_m || ' ' || v_txt));

    -- Fixtures (as postgres). Distinct created_at in v_all order, so the default order is known.
    insert into public.profiles (id, email)
    select x.id, 'vfyadm-' || x.tag || '@sun-asterisk.com'
    from rows from (pg_catalog.unnest(v_all), pg_catalog.unnest(v_tags)) as x(id, tag)
    on conflict (id) do nothing;
    update public.profiles as p set full_name = 'Vfyadm ' || x.tag, created_at = v_t0 + x.o * interval '1 second'
    from rows from (pg_catalog.unnest(v_all), pg_catalog.unnest(v_tags)) with ordinality as x(id, tag, o)
    where p.id = x.id;
    update public.profiles set full_name = 'Vfyadm_u 100%_off' where id = v_p1;
    update public.profiles set full_name = 'Vfyadm 100x9 decoy' where id = v_p2;
    update public.profiles set full_name = E'Vfyadm back\\slash' where id = v_p5;
    update public.profiles set full_name = v_long where id = v_p6;
    update public.profiles set role = 'admin' where id in (v_adm, v_adm2);
    select d.code into v_dept from public.departments as d order by d.sort_order limit 1;
    update public.profiles set department = v_dept where id in (v_adm, v_l[2], v_p2);
    update auth.users set last_sign_in_at = v_t0 + interval '1 hour' where id = v_adm;
    update auth.users set last_sign_in_at = v_t0 + interval '2 hours' where id = v_usr;
    update auth.users set last_sign_in_at = v_t0 - interval '1 hour' where id = v_l[8];
    -- Level boundaries: recipient i gets one named Kudo from each of the first v_ln[i] senders...
    insert into public.kudos (sender_id, recipient_id, title, content, created_at)
    select v_s[g], v_l[x.o::integer], 'VERIFY ADMIN', 'verify admin level', v_t0
    from pg_catalog.unnest(v_ln) with ordinality as x(n, o), pg_catalog.generate_series(1, 21) as g
    where g <= x.n;
    -- ...plus an ANONYMOUS Kudo from one more sender that must not count (0 -> 0, 4 -> 1, 20 -> 3).
    insert into public.kudos (sender_id, recipient_id, title, content, is_anonymous, anonymous_name, created_at)
    values (v_s[1], v_l[1], 'VERIFY ADMIN', 'anon', true, 'Alias', v_t0),
           (v_s[5], v_l[3], 'VERIFY ADMIN', 'anon', true, 'Alias', v_t0),
           (v_s[21], v_l[7], 'VERIFY ADMIN', 'anon', true, 'Alias', v_t0);
    insert into public.kudos (sender_id, recipient_id, title, content, created_at)
    values (v_adm, v_usr, 'VERIFY ADMIN', 'adm 1', v_t0) returning id into v_k1;
    insert into public.kudos (sender_id, recipient_id, title, content, created_at)
    values (v_adm, v_usr, 'VERIFY ADMIN', 'adm 2', v_t0) returning id into v_k2;
    insert into public.kudos (sender_id, recipient_id, title, content, is_anonymous, anonymous_name, created_at)
    values (v_adm, v_usr, 'VERIFY ADMIN', 'adm anon', true, 'Alias', v_t0) returning id into v_k4;
    select k.id into v_k3 from public.kudos as k where k.sender_id = v_s[1] and k.recipient_id = v_l[8];
    -- v_k4 (adm's anonymous Kudo) is hearted too: Total Heart must leave it out (V6a2).
    insert into public.kudo_hearts (kudo_id, user_id)
    values (v_k1, v_usr), (v_k1, v_l[2]), (v_k2, v_l[2]), (v_k3, v_l[8]), (v_k3, v_adm), (v_k4, v_l[2]);
    -- Badges: adm opens all six (stay_gold twice, the second time AFTER the sixth badge) + one unopened box;
    --         usr opens five distinct badges, stay_gold three times.
    insert into public.secret_boxes (owner_id, badge, opened_at)
    values (v_adm, 'stay_gold', v_t0 + interval '1 minute'), (v_adm, 'flow_to_horizon', v_t0 + interval '2 minutes'),
           (v_adm, 'beyond_the_boundary', v_t0 + interval '3 minutes'), (v_adm, 'root_further', v_t0 + interval '4 minutes'),
           (v_adm, 'touch_of_light', v_t0 + interval '5 minutes'), (v_adm, 'revival', v_t0 + interval '6 minutes'),
           (v_adm, 'stay_gold', v_t0 + interval '9 minutes'), (v_adm, null, null),
           (v_usr, 'stay_gold', v_t0 + interval '1 minute'), (v_usr, 'stay_gold', v_t0 + interval '2 minutes'),
           (v_usr, 'stay_gold', v_t0 + interval '3 minutes'), (v_usr, 'flow_to_horizon', v_t0 + interval '4 minutes'),
           (v_usr, 'beyond_the_boundary', v_t0 + interval '5 minutes'), (v_usr, 'root_further', v_t0 + interval '6 minutes'),
           (v_usr, 'touch_of_light', v_t0 + interval '7 minutes');
    v_c_adm := pg_temp.vau_claims(v_adm, 'vfyadm-adm@sun-asterisk.com');
    v_c_adm2 := pg_temp.vau_claims(v_adm2, 'vfyadm-adm2@sun-asterisk.com');
    v_c_usr := pg_temp.vau_claims(v_usr, 'vfyadm-usr@sun-asterisk.com');

    -- V1b. The check rejects an unknown role and null (as postgres, so only the constraint can refuse).
    v_r := array[]::text[];
    begin update public.profiles set role = 'root' where id = v_usr; v_r := v_r || 'updated'::text;
    exception when others then v_r := v_r || sqlstate::text; end;
    begin update public.profiles set role = null where id = v_usr; v_r := v_r || 'updated'::text;
    exception when others then v_r := v_r || sqlstate::text; end;
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'V1b role ''root'' -> check_violation (23514); null -> not_null_violation (23502)',
      'ok', v_r = array['23514', '23502'], 'detail', pg_catalog.array_to_string(v_r, ' | ')));

    -- V3. authenticated has no write path to profiles: updating role and inserting a profile are refused.
    v_r := array[pg_temp.vau_call(v_c_usr, 'update_role', v_usr, null, 'authenticated', v_self),
                 pg_temp.vau_call(v_c_usr, 'insert_profile', pg_catalog.gen_random_uuid(), null, 'authenticated', v_self)];
    select p.role into v_txt from public.profiles as p where p.id = v_usr;
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'V3 authenticated: update profiles set role -> 42501; insert profile -> 42501; role unchanged',
      'ok', v_r = array['42501', '42501'] and v_txt = 'user',
      'detail', pg_catalog.array_to_string(v_r, ' | ') || ' role=' || coalesce(v_txt, 'null')));

    -- V4. is_admin: admin true; user false; admin with a wrong domain / non-Google / no-sub / no claims false; anon 42501.
    v_r := array[
      pg_temp.vau_call(v_c_adm, 'is_admin', null, null, 'authenticated', v_self),
      pg_temp.vau_call(v_c_usr, 'is_admin', null, null, 'authenticated', v_self),
      pg_temp.vau_call(pg_temp.vau_claims(v_adm, 'vfyadm-adm@gmail.com'), 'is_admin', null, null, 'authenticated', v_self),
      pg_temp.vau_call(pg_temp.vau_claims(v_adm, 'vfyadm-adm@sun-asterisk.com', 'email'), 'is_admin', null, null,
        'authenticated', v_self),
      pg_temp.vau_call(pg_catalog.jsonb_build_object('role', 'authenticated', 'email', 'vfyadm-adm@sun-asterisk.com',
        'app_metadata', v_meta)::text, 'is_admin', null, null, 'authenticated', v_self),
      pg_temp.vau_call('', 'is_admin', null, null, 'authenticated', v_self),
      pg_temp.vau_call('', 'is_admin', null, null, 'anon', v_self)];
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'V4 is_admin: admin true; user / wrong domain / non-Google / no sub / no claims false; anon 42501',
      'ok', v_r = array['true', 'false', 'false', 'false', 'false', 'false', '42501'],
      'detail', pg_catalog.array_to_string(v_r, ' | ')));

    -- V5. admin_list_users refuses quietly: user / no claims / admin with a wrong domain -> 0 rows; anon 42501.
    v_r := array[
      pg_temp.vau_list(v_c_usr, null, null, null, null, null, null, 20, 0, v_self)::text,
      pg_temp.vau_list('', null, null, null, null, null, null, 20, 0, v_self)::text,
      pg_temp.vau_list(pg_temp.vau_claims(v_adm, 'vfyadm-adm@gmail.com'), null, null, null, null, null, null, 20, 0,
        v_self)::text];
    perform pg_catalog.set_config('request.jwt.claims', '', true);
    set local role anon;
    begin
      perform public.admin_list_users(null, null, null, null, null, null, 20, 0);
      v_txt := 'executed';
    exception when others then v_txt := sqlstate;
    end;
    execute pg_catalog.format('set local role %I', v_self);
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'V5 admin_list_users: user / no claims / wrong domain -> 0 rows (no error); anon 42501',
      'ok', v_r = array['[]', '[]', '[]'] and v_txt = '42501',
      'detail', pg_catalog.array_to_string(v_r, ' | ') || ' | anon=' || v_txt));

    -- V6a. sent / received of every temp user = kudos_my_stats of the same user; hearts = an independent sum of
    --      hearts_awarded over the Kudos that user sent NON-anonymously (deliberately NOT kudos_my_stats, which also
    --      counts anonymous ones).
    v_rows := pg_temp.vau_scoped(v_c_adm, null, null, 5000, 0, v_self);
    v_n := 0;
    for v_e in select e.value from pg_catalog.jsonb_array_elements(
                 case when pg_catalog.jsonb_typeof(v_rows) = 'array' then v_rows else '[]'::jsonb end) as e(value)
    loop
      v_txt := pg_temp.vau_call(pg_temp.vau_claims((v_e ->> 'user_id')::uuid, v_e ->> 'email'), 'my_stats', null, null,
        'authenticated', v_self);
      if v_txt is null or v_txt not like '{%' then
        v_n := v_n + 1;
        continue;
      end if;
      v_stats := v_txt::jsonb;
      select coalesce(pg_catalog.sum(h.hearts_awarded), 0) into v_m
      from public.kudo_hearts as h join public.kudos as k on k.id = h.kudo_id
      where k.sender_id = (v_e ->> 'user_id')::uuid and not k.is_anonymous;
      if (v_stats ->> 'sent') is distinct from (v_e ->> 'sent')
         or (v_stats ->> 'received') is distinct from (v_e ->> 'received')
         or v_m is distinct from (v_e ->> 'hearts')::bigint then
        v_n := v_n + 1;
      end if;
    end loop;
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'V6a sent/received match kudos_my_stats; hearts = sum over NON-anonymous sent Kudos, for every temp user',
      'ok', coalesce(pg_catalog.cardinality(pg_temp.vau_ids(v_rows)) = pg_catalog.cardinality(v_all) and v_n = 0, false),
      'detail', 'rows=' || pg_catalog.cardinality(pg_temp.vau_ids(v_rows)) || ' mismatches=' || v_n));

    -- V6a2. adm sent 2 named Kudos (k1, k2) and 1 anonymous (k4), all hearted: sent counts all 3, Total Heart only
    --       k1 + k2, while kudos_my_stats (adm's own Kudos page) still counts k4 too.
    select pg_catalog.sum(h.hearts_awarded) filter (where h.kudo_id in (v_k1, v_k2)),
           pg_catalog.sum(h.hearts_awarded) filter (where h.kudo_id = v_k4)
    into v_n, v_m
    from public.kudo_hearts as h where h.kudo_id in (v_k1, v_k2, v_k4);
    v_e := pg_temp.vau_row(v_rows, v_adm);
    v_txt := pg_temp.vau_call(v_c_adm, 'my_stats', null, null, 'authenticated', v_self);
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'V6a2 hearts on an anonymous Kudo are NOT in Total Heart (kudos_my_stats keeps them); it still counts in sent',
      'ok', coalesce(v_n >= 3 and v_m >= 1 and (v_e ->> 'hearts')::bigint = v_n and (v_e ->> 'sent')::integer = 3
        and case when v_txt like '{%' then (v_txt::jsonb ->> 'hearts_received')::bigint end = v_n + v_m
        and (pg_temp.vau_row(v_rows, v_usr) ->> 'received')::integer = 3, false),
      'detail', 'named_hearts=' || coalesce(v_n::text, 'null') || ' anon_hearts=' || coalesce(v_m::text, 'null')
        || ' my_stats=' || coalesce(v_txt, 'null') || ' adm=' || coalesce(v_e::text, 'missing')));

    -- V6b. Level at the boundaries 0/1/4/5/9/10/20/21 distinct named senders; the extra anonymous Kudos do not count.
    select pg_catalog.array_agg(pg_temp.vau_row(v_rows, x.id) ->> 'level' order by x.o) into v_r
    from pg_catalog.unnest(v_l) with ordinality as x(id, o);
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'V6b level for 0/1/4/5/9/10/20/21 distinct named senders = 0/1/1/2/2/3/3/4 (anonymous ignored)',
      'ok', v_r = array['0', '1', '1', '2', '2', '3', '3', '4'], 'detail', pg_catalog.array_to_string(v_r, ',')));

    -- V6c. Badges: distinct badges only; time to 6 = max over badges of the FIRST opening; null below 6.
    v_ok := (pg_temp.vau_row(v_rows, v_adm) ->> 'badges')::integer = 6
      and (pg_temp.vau_row(v_rows, v_adm) ->> 'time_to_6_badges')::timestamptz = v_t0 + interval '6 minutes'
      and (pg_temp.vau_row(v_rows, v_usr) ->> 'badges')::integer = 5
      and pg_temp.vau_row(v_rows, v_usr) -> 'time_to_6_badges' = 'null'::jsonb
      and (pg_temp.vau_row(v_rows, v_l[2]) ->> 'badges')::integer = 0
      and pg_temp.vau_row(v_rows, v_l[2]) -> 'time_to_6_badges' = 'null'::jsonb;
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'V6c badges: duplicates do not count; time_to_6_badges = max(min(opened_at)) at 6, null below',
      'ok', coalesce(v_ok, false), 'detail', 'adm=' || coalesce((pg_temp.vau_row(v_rows, v_adm) ->> 'badges'), '?') || '/'
        || coalesce((pg_temp.vau_row(v_rows, v_adm) ->> 'time_to_6_badges'), 'null')
        || ' usr=' || coalesce((pg_temp.vau_row(v_rows, v_usr) ->> 'badges'), '?')));

    -- V6d. last_sign_in_at from auth.users; null when the user never signed in.
    v_ok := pg_temp.vau_row(v_rows, v_l[1]) -> 'last_sign_in_at' = 'null'::jsonb
      and (pg_temp.vau_row(v_rows, v_adm) ->> 'last_sign_in_at')::timestamptz = v_t0 + interval '1 hour';
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'V6d last_sign_in_at = auth.users.last_sign_in_at, null when never signed in',
      'ok', coalesce(v_ok, false), 'detail', ''));

    -- V7a-c. Filters: department, level (+ out of range), role (+ unknown, empty = no filter).
    v_ok := pg_temp.vau_set(pg_temp.vau_ids(pg_temp.vau_list(v_c_adm, v_dept, null, null, 'vfyadm', null, null, 5000, 0,
              v_self))) = pg_temp.vau_set(array[v_adm, v_l[2], v_p2]);
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'V7a department filter keeps exactly that department', 'ok', coalesce(v_ok, false), 'detail', v_dept));
    v_r := array[
      pg_catalog.array_to_string(pg_temp.vau_set(pg_temp.vau_ids(pg_temp.vau_list(v_c_adm, null, 3::smallint, null,
        'vfyadm', null, null, 5000, 0, v_self))), ','),
      pg_catalog.array_to_string(pg_temp.vau_set(pg_temp.vau_ids(pg_temp.vau_list(v_c_adm, null, 4::smallint, null,
        'vfyadm', null, null, 5000, 0, v_self))), ','),
      pg_temp.vau_list(v_c_adm, null, 5::smallint, null, null, null, null, 20, 0, v_self)::text,
      pg_temp.vau_list(v_c_adm, null, (-1)::smallint, null, null, null, null, 20, 0, v_self)::text];
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'V7b level filter: 3 -> the 10 and 20 recipients, 4 -> the 21 recipient; 5 and -1 -> 0 rows',
      'ok', v_r = array[pg_catalog.array_to_string(pg_temp.vau_set(array[v_l[6], v_l[7]]), ','), v_l[8]::text, '[]', '[]'],
      'detail', pg_catalog.array_to_string(v_r, ' | ')));
    v_r := array[
      pg_catalog.array_to_string(pg_temp.vau_set(pg_temp.vau_ids(pg_temp.vau_list(v_c_adm, null, null, 'admin', 'vfyadm',
        null, null, 5000, 0, v_self))), ','),
      pg_catalog.cardinality(pg_temp.vau_ids(pg_temp.vau_list(v_c_adm, null, null, 'user', 'vfyadm', null, null, 5000, 0,
        v_self)))::text,
      pg_temp.vau_list(v_c_adm, null, null, 'root', null, null, null, 20, 0, v_self)::text,
      pg_catalog.cardinality(pg_temp.vau_ids(pg_temp.vau_list(v_c_adm, null, null, '', 'vfyadm', null, null, 5000, 0,
        v_self)))::text];
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'V7c role filter: admin -> the two admins, user -> the rest; unknown -> 0 rows; empty -> no filter',
      'ok', v_r = array[pg_catalog.array_to_string(pg_temp.vau_set(array[v_adm, v_adm2]), ','),
                        (pg_catalog.cardinality(v_all) - 2)::text, '[]', pg_catalog.cardinality(v_all)::text],
      'detail', pg_catalog.array_to_string(v_r, ' | ')));

    -- V7d. Search: % _ \ are plain characters; case-insensitive; email too; trimmed and cut to 100; blank = no filter.
    v_r := array[
      pg_catalog.array_to_string(pg_temp.vau_ids(pg_temp.vau_list(v_c_adm, null, null, null, '100%_', null, null, 5000, 0,
        v_self)), ','),
      pg_catalog.array_to_string(pg_temp.vau_ids(pg_temp.vau_list(v_c_adm, null, null, null, 'VFYADM_U', null, null, 5000,
        0, v_self)), ','),
      pg_catalog.array_to_string(pg_temp.vau_ids(pg_temp.vau_list(v_c_adm, null, null, null, E'k\\s', null, null, 5000, 0,
        v_self)), ','),
      pg_catalog.array_to_string(pg_temp.vau_ids(pg_temp.vau_list(v_c_adm, null, null, null, 'vfyadm-decoy@', null, null,
        5000, 0, v_self)), ','),
      pg_catalog.array_to_string(pg_temp.vau_ids(pg_temp.vau_list(v_c_adm, null, null, null, '  ' || v_long || 'ZZZZ', null,
        null, 5000, 0, v_self)), ',')];
    select pg_catalog.count(*) into v_n from public.profiles;
    v_rows := pg_temp.vau_list(v_c_adm, null, null, null, E'  \t', null, null, 1, 0, v_self);
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'V7d search: ''100%_'' / ''VFYADM_U'' / ''k\s'' match literally; email matches; >100 chars cut; blank = all',
      'ok', coalesce(v_r = array[v_p1::text, v_p1::text, v_p5::text, v_p2::text, v_p6::text]
        and (v_rows -> 0 ->> 'total_count')::bigint = v_n, false),
      'detail', pg_catalog.array_to_string(v_r, ' | ') || ' blank_total=' || coalesce(v_rows -> 0 ->> 'total_count', '?')
        || '/' || v_n));

    -- V8a. Every sort key, both directions: ordered, NULL last, ties by (created_at, id).
    v_r := array[]::text[];
    for v_rec in select * from (values ('sent', 'sent'), ('received', 'received'), ('hearts', 'hearts'),
                                       ('level', 'level'), ('badges', 'badges'), ('time6', 'time_to_6_badges'),
                                       ('last_login', 'last_sign_in_at')) as t(sort_key, col),
                               (values ('asc'), ('desc')) as d(dir)
    loop
      if not coalesce(pg_temp.vau_is_sorted(pg_temp.vau_scoped(v_c_adm, v_rec.sort_key, v_rec.dir, 5000, 0, v_self),
                                            v_rec.col, v_rec.dir), false) then
        v_r := v_r || (v_rec.sort_key || ' ' || v_rec.dir);
      end if;
    end loop;
    v_ok := (pg_temp.vau_ids(pg_temp.vau_scoped(v_c_adm, 'time6', 'asc', 5000, 0, v_self)))[1] = v_adm::text
      and (pg_temp.vau_ids(pg_temp.vau_scoped(v_c_adm, 'time6', 'desc', 5000, 0, v_self)))[1] = v_adm::text
      and (pg_temp.vau_ids(pg_temp.vau_scoped(v_c_adm, 'last_login', 'asc', 5000, 0, v_self)))[1:3]
          = array[v_l[8]::text, v_adm::text, v_usr::text]
      and (pg_temp.vau_ids(pg_temp.vau_scoped(v_c_adm, 'last_login', 'desc', 5000, 0, v_self)))[1:3]
          = array[v_usr::text, v_adm::text, v_l[8]::text];
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'V8a sort: 7 keys x asc/desc ordered, NULL last both ways, ties by created_at then id',
      'ok', pg_catalog.cardinality(v_r) = 0 and coalesce(v_ok, false),
      'detail', 'unsorted=' || coalesce(pg_catalog.array_to_string(v_r, ','), '') || ' nulls_last=' || coalesce(v_ok::text, 'null')));

    -- V8b. Paging (7 a page): pages concatenate to the full read, row_no continuous, totals the same on every page;
    --      past the end -> 0 rows.
    v_rows := pg_temp.vau_scoped(v_c_adm, 'level', 'desc', 5000, 0, v_self);
    v_exp := pg_temp.vau_ids(v_rows);
    select pg_catalog.sum((e.value ->> 'sent')::integer), pg_catalog.sum((e.value ->> 'received')::integer) into v_n, v_m
    from pg_catalog.jsonb_array_elements(v_rows) as e(value);
    v_ids := '{}'; v_ok := true; v_off := 0;
    loop
      v_page := pg_temp.vau_scoped(v_c_adm, 'level', 'desc', 7, v_off, v_self);
      exit when pg_catalog.cardinality(pg_temp.vau_ids(v_page)) = 0 or v_off > 1000;
      v_ids := v_ids || pg_temp.vau_ids(v_page);
      v_ok := v_ok and not exists (
        select 1 from pg_catalog.jsonb_array_elements(v_page) with ordinality as e(value, ord)
        where (e.value ->> 'row_no')::integer <> v_off + e.ord
           or (e.value ->> 'total_count')::integer <> pg_catalog.cardinality(v_exp)
           or (e.value ->> 'sum_sent')::bigint <> v_n or (e.value ->> 'sum_received')::bigint <> v_m);
      v_off := v_off + 7;
    end loop;
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'V8b pages of 7 = full read (stable ties), row_no continuous, total/sums fixed on every page; past end -> 0 rows',
      'ok', coalesce(v_ok and v_ids = v_exp and pg_catalog.cardinality(v_exp) = pg_catalog.cardinality(v_all)
        and pg_catalog.cardinality(pg_temp.vau_set(v_exp)) = pg_catalog.cardinality(v_exp)
        and pg_temp.vau_scoped(v_c_adm, 'level', 'desc', 7, pg_catalog.cardinality(v_all) + 10, v_self) = '[]'::jsonb, false),
      'detail', 'pages_rows=' || pg_catalog.cardinality(v_ids) || ' full=' || pg_catalog.cardinality(v_exp)
        || ' sum_sent=' || coalesce(v_n::text, 'null')));

    -- V8c. Clamps: limit 0 / -5 / null -> 1 / 1 / 20; 99999 is clamped (to 5000) without an error and returns all 36
    --      temp rows (proving the 5000 bound itself would need more than 5000 rows); negative offset = 0.
    v_r := array[
      pg_catalog.cardinality(pg_temp.vau_ids(pg_temp.vau_scoped(v_c_adm, null, null, 0, 0, v_self)))::text,
      pg_catalog.cardinality(pg_temp.vau_ids(pg_temp.vau_scoped(v_c_adm, null, null, -5, 0, v_self)))::text,
      pg_catalog.cardinality(pg_temp.vau_ids(pg_temp.vau_scoped(v_c_adm, null, null, null, 0, v_self)))::text,
      pg_catalog.cardinality(pg_temp.vau_ids(pg_temp.vau_scoped(v_c_adm, null, null, 99999, 0, v_self)))::text,
      pg_temp.vau_scoped(v_c_adm, null, null, 5, -3, v_self) -> 0 ->> 'row_no'];
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'V8c limit 0 / -5 / null -> 1 / 1 / 20; 99999 -> clamped, returns all 36; offset -3 starts at row 1',
      'ok', v_r = array['1', '1', '20', pg_catalog.cardinality(v_all)::text, '1'],
      'detail', pg_catalog.array_to_string(v_r, ' | ')));

    -- V9. admin_set_user_role: forbidden before self before invalid before not_found; ok changes role + updated_at;
    --     a demoted admin loses is_admin at once; anon 42501.
    update public.profiles set updated_at = v_t0 where id = v_usr;
    v_r := array[
      pg_temp.vau_call(v_c_usr, 'set_role', v_adm, 'user', 'authenticated', v_self),
      pg_temp.vau_call(v_c_usr, 'set_role', v_usr, 'root', 'authenticated', v_self),
      pg_temp.vau_call(v_c_adm, 'set_role', v_adm, 'user', 'authenticated', v_self),
      pg_temp.vau_call(v_c_adm, 'set_role', v_adm, 'root', 'authenticated', v_self),
      pg_temp.vau_call(v_c_adm, 'set_role', v_usr, 'root', 'authenticated', v_self),
      pg_temp.vau_call(v_c_adm, 'set_role', v_usr, null, 'authenticated', v_self),
      pg_temp.vau_call(v_c_adm, 'set_role', pg_catalog.gen_random_uuid(), 'admin', 'authenticated', v_self),
      pg_temp.vau_call(v_c_adm, 'set_role', null, 'admin', 'authenticated', v_self),
      pg_temp.vau_call(v_c_adm, 'set_role', v_usr, 'admin', 'authenticated', v_self),
      pg_temp.vau_call(v_c_usr, 'is_admin', null, null, 'authenticated', v_self),
      pg_temp.vau_call(v_c_adm, 'set_role', v_adm2, 'user', 'authenticated', v_self),
      pg_temp.vau_call(v_c_adm2, 'is_admin', null, null, 'authenticated', v_self),
      pg_temp.vau_call(v_c_adm2, 'set_role', v_usr, 'user', 'authenticated', v_self),
      pg_temp.vau_call('', 'set_role', v_usr, 'user', 'anon', v_self)];
    select p.updated_at into v_ts from public.profiles as p where p.id = v_usr and p.role = 'admin';
    v_ok := (select p.role from public.profiles as p where p.id = v_adm) = 'admin'
      and (select p.role from public.profiles as p where p.id = v_adm2) = 'user';
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'V9 set_user_role: forbidden/self/invalid/not_found in order; ok sets role + updated_at; demotion '
        || 'is immediate; anon 42501',
      'ok', coalesce(v_r = array['forbidden', 'forbidden', 'self', 'self', 'invalid', 'invalid', 'not_found',
        'not_found', 'ok', 'true', 'ok', 'false', 'forbidden', '42501'] and v_ts > v_t0 and v_ok, false),
      'detail', pg_catalog.array_to_string(v_r, ' | ') || ' usr_updated_at=' || coalesce(v_ts::text, 'unchanged')));

    -- V10. Unknown sort key or direction (or a direction without a key) -> default order (created_at, id) ascending.
    select pg_catalog.array_agg(p.id::text order by p.created_at, p.id) into v_exp
    from public.profiles as p where p.id = any (v_all);
    v_r := array[]::text[];
    for v_rec in select * from (values ('bogus', 'desc'), ('sent', 'sideways'), ('sent', null), (null, 'asc'),
                                       ('SENT', 'desc'), ('', 'desc')) as t(sort_key, dir)
    loop
      if pg_temp.vau_ids(pg_temp.vau_scoped(v_c_adm, v_rec.sort_key, v_rec.dir, 5000, 0, v_self)) is distinct from v_exp then
        v_r := v_r || (coalesce(v_rec.sort_key, 'null') || '/' || coalesce(v_rec.dir, 'null'));
      end if;
    end loop;
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'V10 unknown sort / dir -> default order created_at, id ascending',
      'ok', pg_catalog.cardinality(v_r) = 0 and pg_catalog.cardinality(v_exp) = pg_catalog.cardinality(v_all),
      'detail', 'wrong=' || coalesce(pg_catalog.array_to_string(v_r, ','), '')));

    raise exception 'verify-admin-users-rollback';
  exception when others then
    if sqlerrm <> 'verify-admin-users-rollback' then
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

select * from pg_temp.verify_admin_users();
