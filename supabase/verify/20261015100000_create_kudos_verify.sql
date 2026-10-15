-- Verification for: supabase/migrations/20261015100000_create_kudos.sql
-- How to run: Supabase Dashboard > SQL Editor (role: postgres). Paste this WHOLE file and Run.
--           The last statement prints one row per check. Expected: every row result = PASS.
--           Safe to re-run any time, before or after the demo seed: behaviour checks create
--           throw-away users/kudos and then raise inside a sub-block, so EVERY write is rolled
--           back (only a session-local pg_temp function remains, gone when the session ends).
--           Behaviour checks impersonate `authenticated` / `anon` with `set local role` and fake
--           JWT claims in `request.jwt.claims` (what PostgREST does per request).
-- If a row FAILs: read `detail`; to undo the migration use
--           supabase/rollbacks/20261015100000_create_kudos_down.sql
-- If the behaviour block reports "permission denied" on auth.users: the static checks still
--           stand; test the RPCs after running the demo seed instead.

create or replace function pg_temp.verify_kudos_migration()
returns table (no integer, check_name text, result text, detail text)
language plpgsql
as $$
#variable_conflict use_column
declare
  v_out      jsonb := '[]'::jsonb;
  v_tables   text[] := array['departments', 'hashtags', 'gifts', 'kudos', 'kudo_hashtags',
                             'kudo_images', 'kudo_hearts', 'special_heart_days', 'secret_boxes',
                             'gift_awards'];
  v_catalogs text[] := array['departments', 'hashtags', 'gifts'];
  v_privs    text[] := array['select', 'insert', 'update', 'delete', 'truncate', 'references', 'trigger'];
  v_rpcs     text[] := array['public.kudos_feed(text, text, timestamptz, uuid, integer)',
                             'public.kudos_highlight(text, text)', 'public.kudos_spotlight()',
                             'public.kudos_my_stats()', 'public.kudos_latest_gift_recipients(integer)'];
  v_internal text[] := array['public.kudos_person_json(uuid)', 'public.kudos_rows(uuid[], uuid)',
                             'public.kudo_hearts_set_awarded()', 'public.kudo_hearts_sync_count()'];
  v_calls    text[] := array['public.kudos_feed()', 'public.kudos_highlight()', 'public.kudos_spotlight()',
                             'public.kudos_my_stats()', 'public.kudos_latest_gift_recipients()'];
  v_n bigint; v_m bigint; v_off bigint; v_ok boolean; v_txt text; v_t text;
  v_a uuid := pg_catalog.gen_random_uuid();
  v_b uuid := pg_catalog.gen_random_uuid();
  v_c uuid := pg_catalog.gen_random_uuid();
  v_k1 uuid := pg_catalog.gen_random_uuid();
  v_k2 uuid := pg_catalog.gen_random_uuid();
  v_k3 uuid := pg_catalog.gen_random_uuid();
  v_k4 uuid := pg_catalog.gen_random_uuid();
  v_before jsonb; v_after jsonb; v_gift jsonb;
  v_at timestamptz := pg_catalog.now() + interval '1 day';  -- fixtures sort above real data
  v_dept text; v_slug text; v_total bigint; v_depts bigint;
  v_ids uuid[]; v_ids2 uuid[]; v_row public.kudo_row; v_spot jsonb;
  v_meta constant jsonb := '{"provider":"google","providers":["google"]}';
  v_self constant text := current_user;  -- role to switch back to after impersonating
begin
  -- S1. Every new table exists with RLS on (later checks need the tables).
  select pg_catalog.count(*) filter (where c.relrowsecurity),
         pg_catalog.string_agg(c.relname, ', ') filter (where not c.relrowsecurity)
    into v_n, v_txt
  from pg_catalog.pg_class as c
  join pg_catalog.pg_namespace as ns on ns.oid = c.relnamespace
  where ns.nspname = 'public' and c.relkind = 'r' and c.relname = any (v_tables);
  v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
    'name', 'S1 10 tables exist, RLS enabled on all', 'ok', v_n = 10,
    'detail', 'rls_on=' || v_n || coalesce(' rls_off=' || v_txt, '')));
  if v_n <> 10 then
    return query select e.ord::integer, e.value ->> 'name', 'FAIL', e.value ->> 'detail'
                 from pg_catalog.jsonb_array_elements(v_out) with ordinality as e(value, ord);
    return;
  end if;

  -- S2. anon holds no table privilege at all.
  select pg_catalog.string_agg(t || ':' || p, ', ') into v_txt
  from pg_catalog.unnest(v_tables) as t, pg_catalog.unnest(v_privs) as p
  where pg_catalog.has_table_privilege('anon', 'public.' || t, p);
  v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
    'name', 'S2 anon has no table privileges', 'ok', v_txt is null, 'detail', coalesce(v_txt, 'none')));

  -- S3. authenticated: SELECT on the 3 catalogs only; nothing on transactional tables.
  select pg_catalog.string_agg(t || ':' || p, ', ') into v_txt
  from pg_catalog.unnest(v_tables) as t, pg_catalog.unnest(v_privs) as p
  where pg_catalog.has_table_privilege('authenticated', 'public.' || t, p)
        <> (p = 'select' and t = any (v_catalogs));
  v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
    'name', 'S3 authenticated: select on catalogs only', 'ok', v_txt is null,
    'detail', coalesce('unexpected: ' || v_txt, 'ok')));

  -- S4. One SELECT policy per catalog (account rule on the JWT); none on transactional tables.
  select pg_catalog.count(*) filter (where pol.tablename = any (v_catalogs) and pol.cmd = 'SELECT'
           and pol.roles = '{authenticated}'::name[] and pol.qual like '%is_allowed_account%'
           and pol.qual like '%auth.jwt()%' and pol.qual like '%''app_metadata''%'),
         pg_catalog.count(*)
    into v_n, v_m
  from pg_catalog.pg_policies as pol
  where pol.schemaname = 'public' and pol.tablename = any (v_tables);
  v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
    'name', 'S4 catalog policies use is_allowed_account; no other policies', 'ok', v_n = 3 and v_m = 3,
    'detail', 'catalog_policies=' || v_n || ' all_policies=' || v_m));

  -- S5. EXECUTE: RPCs for authenticated only; internal helpers/trigger functions for nobody.
  select pg_catalog.string_agg(f, ', ') into v_txt
  from pg_catalog.unnest(v_rpcs) as f
  where pg_catalog.has_function_privilege('anon', f, 'execute')
     or not pg_catalog.has_function_privilege('authenticated', f, 'execute');
  select pg_catalog.string_agg(f, ', ') into v_t
  from pg_catalog.unnest(v_internal) as f
  where pg_catalog.has_function_privilege('anon', f, 'execute')
     or pg_catalog.has_function_privilege('authenticated', f, 'execute');
  v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
    'name', 'S5 RPC execute: authenticated only; helpers: nobody', 'ok', v_txt is null and v_t is null,
    'detail', 'bad_rpcs=' || coalesce(v_txt, 'none') || ' bad_helpers=' || coalesce(v_t, 'none')));

  -- S6. RPCs: security definer, stable, empty search_path, account rule checked.
  select pg_catalog.string_agg(f, ', ') into v_txt
  from pg_catalog.unnest(v_rpcs) as f
  join pg_catalog.pg_proc as pr on pr.oid = f::regprocedure
  where not (pr.prosecdef and pr.provolatile = 's' and pr.proconfig = array['search_path=""']
             and pg_catalog.pg_get_functiondef(pr.oid) like '%public.is_allowed_account(%');
  v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
    'name', 'S6 RPCs definer + stable + search_path + account rule', 'ok', v_txt is null,
    'detail', coalesce('bad: ' || v_txt, 'ok')));

  -- S7. Catalog data from Figma.
  select (select pg_catalog.count(*) from public.departments),
         (select pg_catalog.count(*) from public.hashtags
            where pg_catalog.btrim(name_vi) <> '' and pg_catalog.btrim(name_en) <> '')
    into v_n, v_m;
  select pg_catalog.count(*) into v_total from public.gifts;
  v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
    'name', 'S7 catalogs: 50 departments, 13 hashtags (VI+EN), >=1 gift',
    'ok', v_n = 50 and v_m = 13 and v_total >= 1,
    'detail', 'departments=' || v_n || ' hashtags=' || v_m || ' gifts=' || v_total));

  -- S8. profiles.department -> departments(code), on update cascade, on delete set null.
  select pg_catalog.count(*) into v_n
  from pg_catalog.pg_constraint as con
  where con.conrelid = 'public.profiles'::regclass and con.contype = 'f'
    and con.confrelid = 'public.departments'::regclass
    and con.confupdtype = 'c' and con.confdeltype = 'n';
  v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
    'name', 'S8 FK profiles.department -> departments', 'ok', v_n = 1, 'detail', 'fk_count=' || v_n));

  -- S9. Sign-in triggers untouched (3 enabled) and both kudo_hearts triggers present.
  select pg_catalog.count(*) filter (where t.tgrelid in ('auth.users'::regclass, 'auth.identities'::regclass)
           and t.tgenabled = 'O' and t.tgname in ('on_auth_user_enforce_email_domain',
             'on_auth_user_upsert_profile', 'on_auth_identity_upsert_profile')),
         pg_catalog.count(*) filter (where t.tgrelid = 'public.kudo_hearts'::regclass
           and t.tgenabled = 'O' and t.tgname in ('kudo_hearts_set_awarded', 'kudo_hearts_sync_count'))
    into v_n, v_m
  from pg_catalog.pg_trigger as t
  where not t.tgisinternal;
  v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
    'name', 'S9 sign-in triggers intact; kudo_hearts triggers present', 'ok', v_n = 3 and v_m = 2,
    'detail', 'sign_in=' || v_n || ' kudo_hearts=' || v_m));

  -- B. Behaviour: fixtures + impersonation; everything is rolled back at the end of the block.
  begin
    insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, created_at, updated_at)
    select x.id, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated',
           x.email, v_meta, pg_catalog.now(), pg_catalog.now()
    from (values (v_a, 'verify-kudos-a@sun-asterisk.com'), (v_b, 'verify-kudos-b@sun-asterisk.com'),
                 (v_c, 'verify-kudos-c@sun-asterisk.com')) as x(id, email);
    insert into public.profiles (id, email)
    values (v_a, 'verify-kudos-a@sun-asterisk.com'), (v_b, 'verify-kudos-b@sun-asterisk.com'),
           (v_c, 'verify-kudos-c@sun-asterisk.com')
    on conflict (id) do nothing;
    select d.code into v_dept from public.departments as d order by d.sort_order limit 1;
    select h.slug into v_slug from public.hashtags as h order by h.sort_order limit 1;
    update public.profiles set full_name = 'Verify A' where id = v_a;
    update public.profiles set full_name = 'Verify B', department = v_dept where id = v_b;
    update public.profiles set full_name = 'Verify C' where id = v_c;

    insert into public.kudos (id, sender_id, recipient_id, title, content, is_anonymous, anonymous_name, created_at)
    values (v_k1, v_a, v_b, 'VERIFY TITLE', 'verify content 1', false, null, v_at + interval '1 second'),
           (v_k2, v_a, v_b, 'VERIFY TITLE', 'verify content 2', true, 'Verify Alias', v_at + interval '2 seconds'),
           (v_k3, v_c, v_a, 'VERIFY TITLE', 'verify content 3', false, null, v_at + interval '3 seconds');
    insert into public.kudo_hashtags (kudo_id, hashtag_id)
    select k.id, h.id from public.hashtags as h, (values (v_k1), (v_k3)) as k(id) where h.slug = v_slug;
    insert into public.kudo_images (kudo_id, image_url, position)
    values (v_k1, '/verify-2.jpg', 2), (v_k1, '/verify-1.jpg', 1);
    insert into public.secret_boxes (owner_id, badge, opened_at)
    values (v_a, 'stay_gold', pg_catalog.now()), (v_a, null, null);
    insert into public.gift_awards (recipient_id, gift_id, awarded_at)
    select v_b, g.id, v_at from public.gifts as g order by g.id limit 1;

    -- B1. Table checks reject bad rows.
    v_n := 0;
    begin insert into public.kudos (sender_id, recipient_id, title, content) values (v_a, v_a, 't', 'c');
    exception when check_violation then v_n := v_n + 1; end;
    begin insert into public.kudos (sender_id, recipient_id, title, content) values (v_a, v_b, '  ', 'c');
    exception when check_violation then v_n := v_n + 1; end;
    begin insert into public.kudos (sender_id, recipient_id, title, content, anonymous_name)
          values (v_a, v_b, 't', 'c', 'alias');
    exception when check_violation then v_n := v_n + 1; end;
    begin insert into public.secret_boxes (owner_id, badge) values (v_a, 'stay_gold');
    exception when check_violation then v_n := v_n + 1; end;
    begin update public.profiles set department = 'verify-no-such-dept' where id = v_a;
    exception when foreign_key_violation then v_n := v_n + 1; end;
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'B1 checks reject self-kudo, blank title, stray alias, half-open box, unknown dept',
      'ok', v_n = 5, 'detail', 'rejected=' || v_n || '/5'));

    -- B2. Hearts: own Kudo rejected; 1 heart normally; 2 inside a special day (client value ignored).
    delete from public.special_heart_days;
    insert into public.kudo_hearts (kudo_id, user_id) values (v_k1, v_c);
    insert into public.special_heart_days (starts_at, ends_at)
    values (pg_catalog.now() - interval '1 hour', pg_catalog.now() + interval '1 hour');
    insert into public.kudo_hearts (kudo_id, user_id, hearts_awarded) values (v_k1, v_b, 1);
    insert into public.kudo_hearts (kudo_id, user_id) values (v_k3, v_a);
    begin
      insert into public.kudo_hearts (kudo_id, user_id) values (v_k1, v_a);
      v_txt := 'own heart accepted';
    exception when others then v_txt := sqlerrm;
    end;
    select pg_catalog.string_agg(h.user_id::text || '=' || h.hearts_awarded, ',') into v_t
    from public.kudo_hearts as h where h.kudo_id = v_k1;
    v_ok := v_txt = 'cannot heart own kudo'
      and (select h.hearts_awarded from public.kudo_hearts as h where h.kudo_id = v_k1 and h.user_id = v_c) = 1
      and (select h.hearts_awarded from public.kudo_hearts as h where h.kudo_id = v_k1 and h.user_id = v_b) = 2
      and (select k.heart_count from public.kudos as k where k.id = v_k1) = 2;
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'B2 own heart rejected; x1 normal day; x2 special day; heart_count +1 per heart',
      'ok', v_ok, 'detail', 'own=' || coalesce(v_txt, '?') || ' k1_hearts=' || coalesce(v_t, 'none')));

    select pg_catalog.count(*) into v_total from public.kudos;
    select pg_catalog.count(*) into v_depts from public.departments;

    -- B3. Allowed user A: feed order, keyset, anonymity, row shape, limit clamp.
    perform pg_catalog.set_config('request.jwt.claims', pg_catalog.jsonb_build_object('sub', v_a,
      'role', 'authenticated', 'email', 'verify-kudos-a@sun-asterisk.com', 'app_metadata', v_meta)::text, true);
    set local role authenticated;
    select pg_catalog.array_agg(f.id order by f.ordinality) into v_ids
    from public.kudos_feed(p_limit => 2) with ordinality as f;
    select pg_catalog.array_agg(f.id order by f.ordinality) into v_ids2
    from public.kudos_feed(p_cursor_created_at => v_at + interval '2 seconds', p_cursor_id => v_k2,
                           p_limit => 2) with ordinality as f;
    v_ok := v_ids = array[v_k3, v_k2] and v_ids2[1] = v_k1;
    select f.* into v_row from public.kudos_feed(p_limit => 3) as f where f.id = v_k2;
    v_ok := v_ok and v_row.sender is null and v_row.anonymous_name = 'Verify Alias'
      and v_row.is_mine and v_row.is_anonymous;
    select f.* into v_row from public.kudos_feed(p_limit => 3) as f where f.id = v_k1;
    v_ok := v_ok and v_row.sender ->> 'id' = v_a::text and v_row.recipient ->> 'id' = v_b::text
      and v_row.recipient ->> 'department' = v_dept and (v_row.recipient ->> 'kudos_received')::int = 2
      and (v_row.recipient ->> 'distinct_senders')::int = 1 and v_row.heart_count = 2
      and not v_row.liked_by_me and v_row.is_mine and v_row.title = 'VERIFY TITLE'
      and v_row.hashtags -> 0 ->> 'slug' = v_slug and v_row.hashtags -> 0 ? 'name_en'
      and v_row.images = '["/verify-1.jpg", "/verify-2.jpg"]'::jsonb;
    select pg_catalog.count(*) into v_n from public.kudos_feed(p_limit => 100);
    select pg_catalog.count(*) into v_m from public.kudos_feed(p_limit => 0);
    v_ok := v_ok and v_n <= 20 and v_m = 1;
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'B3 kudos_feed: order, keyset, anonymous sender hidden, row shape, limit 1..20',
      'ok', v_ok, 'detail', 'page1=' || coalesce(v_ids::text, 'null') || ' page2=' ||
        coalesce(v_ids2::text, 'null') || ' limit100=' || v_n || ' limit0=' || v_m));

    -- B4. Filters: hashtag, recipient department, both (AND), unknown slug.
    select pg_catalog.array_agg(f.id), pg_catalog.bool_and(f.hashtags @> pg_catalog.jsonb_build_array(
             pg_catalog.jsonb_build_object('slug', v_slug)))
      into v_ids, v_ok
    from public.kudos_feed(p_hashtag => v_slug, p_limit => 20) as f;
    v_ok := v_ok and v_k1 = any (v_ids) and v_k3 = any (v_ids) and not v_k2 = any (v_ids);
    select pg_catalog.array_agg(f.id), v_ok and pg_catalog.bool_and(f.recipient ->> 'department' = v_dept)
      into v_ids, v_ok
    from public.kudos_feed(p_department => v_dept, p_limit => 20) as f;
    v_ok := v_ok and v_k1 = any (v_ids) and v_k2 = any (v_ids) and not v_k3 = any (v_ids);
    select pg_catalog.array_agg(f.id) into v_ids
    from public.kudos_feed(p_hashtag => v_slug, p_department => v_dept, p_limit => 20) as f;
    v_ok := v_ok and v_k1 = any (v_ids) and not v_k2 = any (v_ids) and not v_k3 = any (v_ids);
    select pg_catalog.count(*) into v_n from public.kudos_feed(p_hashtag => 'verify-no-such-tag');
    select pg_catalog.count(*), pg_catalog.count(*) filter (where not (f.hashtags @> pg_catalog.jsonb_build_array(
             pg_catalog.jsonb_build_object('slug', v_slug)) and f.recipient ->> 'department' = v_dept))
      into v_m, v_off
    from public.kudos_highlight(p_hashtag => v_slug, p_department => v_dept) as f;
    v_ok := v_ok and v_n = 0 and v_m between 1 and 5 and v_off = 0;
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'B4 filters: hashtag / department / both / unknown slug (feed + highlight)',
      'ok', v_ok, 'detail', 'unknown_slug_rows=' || v_n || ' highlight_rows=' || v_m ||
        ' highlight_off_filter=' || v_off));

    -- B5. Highlight order, spotlight, stats, gift recipients, catalogs via RLS.
    select pg_catalog.count(*), pg_catalog.count(*) filter (where x.prev < x.heart_count) into v_n, v_m
    from (select f.heart_count, pg_catalog.lag(f.heart_count) over (order by f.ordinality) as prev
          from public.kudos_highlight() with ordinality as f) as x;
    v_ok := v_n between 1 and 5 and v_m = 0;
    v_spot := public.kudos_spotlight();
    v_ok := v_ok and (v_spot ->> 'total')::bigint = v_total
      and pg_catalog.jsonb_array_length(v_spot -> 'recent') = least(5, v_total)
      and v_spot -> 'recent' -> 0 ->> 'recipient_name' = 'Verify A'
      and exists (select 1 from pg_catalog.jsonb_array_elements(v_spot -> 'recipients') as r(e)
                  where r.e ->> 'id' = v_b::text and (r.e ->> 'kudos_count')::int = 2
                    and r.e ->> 'last_kudo_id' = v_k2::text and r.e ->> 'full_name' = 'Verify B');
    select pg_catalog.count(*), pg_catalog.max(pg_catalog.format('%s,%s,%s,%s,%s', s.received, s.sent,
             s.hearts_received, s.boxes_opened, s.boxes_unopened))
      into v_n, v_txt
    from public.kudos_my_stats() as s;
    v_ok := v_ok and v_n = 1 and v_txt = '1,2,3,1,1';
    select g.recipient ->> 'id' into v_t from public.kudos_latest_gift_recipients(1) as g
    where g.gift_name_vi <> '' and g.gift_name_en <> '';
    select pg_catalog.count(*) into v_n from public.kudos_latest_gift_recipients(100);
    v_ok := v_ok and v_t = v_b::text and v_n <= 20
      and (select pg_catalog.count(*) from public.departments) = v_depts
      and (select pg_catalog.count(*) from public.hashtags) = 13;
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'B5 highlight order, spotlight, my_stats, latest gifts, catalogs readable',
      'ok', v_ok, 'detail', 'my_stats=' || coalesce(v_txt, 'none') || ' latest_gift=' || coalesce(v_t, 'none')));

    -- B6. Direct table access as an allowed user is denied (data only via RPCs).
    v_n := 0;
    foreach v_t in array v_tables loop
      continue when v_t = any (v_catalogs);
      begin execute pg_catalog.format('select 1 from public.%I limit 1', v_t);
      exception when insufficient_privilege then v_n := v_n + 1; end;
    end loop;
    begin insert into public.kudo_hearts (kudo_id, user_id) values (v_k3, v_b);
    exception when insufficient_privilege then v_n := v_n + 1; end;
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'B6 authenticated cannot select/insert transactional tables directly',
      'ok', v_n = 8, 'detail', 'denied=' || v_n || '/8'));
    execute pg_catalog.format('set local role %I', v_self);

    -- B7. liked_by_me for the user who hearted (C), is_mine false for the recipient (B).
    perform pg_catalog.set_config('request.jwt.claims', pg_catalog.jsonb_build_object('sub', v_c,
      'role', 'authenticated', 'email', 'verify-kudos-c@sun-asterisk.com', 'app_metadata', v_meta)::text, true);
    set local role authenticated;
    select f.* into v_row from public.kudos_feed(p_limit => 3) as f where f.id = v_k1;
    v_ok := v_row.liked_by_me and not v_row.is_mine;
    execute pg_catalog.format('set local role %I', v_self);
    perform pg_catalog.set_config('request.jwt.claims', pg_catalog.jsonb_build_object('sub', v_b,
      'role', 'authenticated', 'email', 'verify-kudos-b@sun-asterisk.com', 'app_metadata', v_meta)::text, true);
    set local role authenticated;
    select f.* into v_row from public.kudos_feed(p_limit => 3) as f where f.id = v_k2;
    v_ok := v_ok and not v_row.is_mine and v_row.sender is null;
    execute pg_catalog.format('set local role %I', v_self);
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'B7 liked_by_me / is_mine per viewer; anonymous sender hidden from recipient',
      'ok', v_ok, 'detail', ''));

    -- B8. Wrong domain / non-Google / no claims: every RPC and catalog returns nothing.
    v_txt := null;
    foreach v_t in array array[
        pg_catalog.jsonb_build_object('sub', v_a, 'role', 'authenticated',
          'email', 'verify-kudos-a@gmail.com', 'app_metadata', v_meta)::text,
        pg_catalog.jsonb_build_object('sub', v_a, 'role', 'authenticated',
          'email', 'verify-kudos-a@sun-asterisk.com', 'app_metadata', '{"provider":"email"}'::jsonb)::text,
        ''] loop
      perform pg_catalog.set_config('request.jwt.claims', v_t, true);
      set local role authenticated;
      select (select pg_catalog.count(*) from public.kudos_feed())
           + (select pg_catalog.count(*) from public.kudos_highlight())
           + (select pg_catalog.count(*) from public.kudos_my_stats())
           + (select pg_catalog.count(*) from public.kudos_latest_gift_recipients())
           + (select pg_catalog.count(*) from public.departments)
           + (select pg_catalog.count(*) from public.hashtags)
           + (select pg_catalog.count(*) from public.gifts)
           + (case when public.kudos_spotlight() is null then 0 else 1 end)
        into v_n;
      execute pg_catalog.format('set local role %I', v_self);
      if v_n <> 0 then v_txt := coalesce(v_txt || '; ', '') || 'rows=' || v_n || ' for claims ' || v_t; end if;
    end loop;
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'B8 wrong domain / non-Google / no claims see nothing', 'ok', v_txt is null,
      'detail', coalesce(v_txt, 'ok')));

    -- B9. anon: every RPC and catalog read is denied.
    perform pg_catalog.set_config('request.jwt.claims', '', true);
    set local role anon;
    v_n := 0;
    foreach v_t in array v_calls || array['public.departments', 'public.hashtags', 'public.gifts'] loop
      begin execute 'select 1 from ' || v_t;
      exception when insufficient_privilege then v_n := v_n + 1; end;
    end loop;
    execute pg_catalog.format('set local role %I', v_self);
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'B9 anon denied on 5 RPCs + 3 catalogs', 'ok', v_n = 8, 'detail', 'denied=' || v_n || '/8'));

    -- B10. Unheart and Kudo delete keep heart_count = count(hearts); dept delete nulls profiles.
    delete from public.kudo_hearts where kudo_id = v_k1 and user_id = v_c;
    delete from public.kudos where id = v_k3;
    delete from public.departments where code = v_dept;
    select pg_catalog.count(*) into v_n
    from public.kudos as k
    where k.heart_count <> (select pg_catalog.count(*) from public.kudo_hearts as h where h.kudo_id = k.id);
    v_ok := v_n = 0 and (select k.heart_count from public.kudos as k where k.id = v_k1) = 1
      and (select p.department from public.profiles as p where p.id = v_b) is null;
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'B10 heart_count = count(*) after unheart/delete; dept delete sets null',
      'ok', v_ok, 'detail', 'mismatched_kudos=' || v_n));

    -- B11. An anonymous Kudo (C -> B) leaves B's distinct_senders unchanged, else comparing the
    --      count before/after would reveal C as the sender. kudos_received still counts it.
    --      Read through the feed (recipient of k1) and the gift list (B holds the newest award).
    perform pg_catalog.set_config('request.jwt.claims', pg_catalog.jsonb_build_object('sub', v_a,
      'role', 'authenticated', 'email', 'verify-kudos-a@sun-asterisk.com', 'app_metadata', v_meta)::text, true);
    set local role authenticated;
    select f.recipient into v_before from public.kudos_feed(p_limit => 5) as f where f.id = v_k1;
    execute pg_catalog.format('set local role %I', v_self);
    insert into public.kudos (id, sender_id, recipient_id, title, content, is_anonymous, created_at)
    values (v_k4, v_c, v_b, 'VERIFY TITLE', 'verify content 4', true, v_at + interval '4 seconds');
    set local role authenticated;
    select f.recipient into v_after from public.kudos_feed(p_limit => 5) as f where f.id = v_k1;
    select g.recipient into v_gift from public.kudos_latest_gift_recipients(1) as g;
    execute pg_catalog.format('set local role %I', v_self);
    v_ok := (v_after ->> 'distinct_senders')::int = (v_before ->> 'distinct_senders')::int
      and (v_gift ->> 'distinct_senders')::int = (v_before ->> 'distinct_senders')::int
      and (v_after ->> 'kudos_received')::int = (v_before ->> 'kudos_received')::int + 1;
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'B11 anonymous Kudo does not change recipient distinct_senders (sender not inferable)',
      'ok', coalesce(v_ok, false), 'detail', 'distinct_senders before=' ||
        coalesce(v_before ->> 'distinct_senders', 'null') || ' after=' ||
        coalesce(v_after ->> 'distinct_senders', 'null') || ' gift_list=' ||
        coalesce(v_gift ->> 'distinct_senders', 'null') || ' kudos_received before=' ||
        coalesce(v_before ->> 'kudos_received', 'null') || ' after=' ||
        coalesce(v_after ->> 'kudos_received', 'null')));

    raise exception 'verify-kudos-rollback';
  exception when others then
    if sqlerrm <> 'verify-kudos-rollback' then
      v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
        'name', 'B* behaviour block aborted', 'ok', false, 'detail', sqlstate || ' ' || sqlerrm));
    end if;
  end;

  return query
    select e.ord::integer, e.value ->> 'name',
           case when (e.value ->> 'ok')::boolean then 'PASS' else 'FAIL' end, e.value ->> 'detail'
    from pg_catalog.jsonb_array_elements(v_out) with ordinality as e(value, ord);
end;
$$;

select * from pg_temp.verify_kudos_migration();
