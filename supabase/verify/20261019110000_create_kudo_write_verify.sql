-- Verification for: supabase/migrations/20261019110000_create_kudo_write.sql
-- How to run: Supabase Dashboard > SQL Editor (role: postgres). Paste this WHOLE file and Run.
--           The last statement prints one row per check. Expected: every row result = PASS. A row may say
--           SKIP (never PASS) only for a B7 Storage check that a Storage trigger or grant stopped; its
--           detail gives the reason, and that case must then be tested by hand with a real upload.
--           Safe to re-run any time: behaviour checks create throw-away users, Storage object rows
--           and Kudos, then raise inside a sub-block, so EVERY write is rolled back (only a
--           session-local pg_temp function remains, gone when the session ends). No file is
--           uploaded: object rows are inserted straight into storage.objects and rolled back.
--           Behaviour checks impersonate `authenticated` / `anon` with `set local role` and fake
--           JWT claims in `request.jwt.claims` (what PostgREST does per request).
-- If a row FAILs: read `detail`; to undo the migration use
--           supabase/rollbacks/20261019110000_create_kudo_write_down.sql
-- If B0 FAILs (cannot insert into storage.objects): the image-success checks are skipped and
--           reported as FAIL, B7 is reported as SKIP; image-rejection checks still run. Test one real
--           upload by hand then.

create or replace function pg_temp.verify_kudo_write_migration()
returns table (no integer, check_name text, result text, detail text)
language plpgsql
as $$
#variable_conflict use_column
declare
  v_out     jsonb := '[]'::jsonb;
  v_create  constant text := 'public.create_kudo(uuid, text, text, text[], text[], boolean, text)';
  v_search  constant text := 'public.kudos_search_sunners(text, integer, boolean)';
  v_meta    constant jsonb := '{"provider":"google","providers":["google"]}';
  v_self    constant text := current_user;  -- role to switch back to after impersonating
  v_base    constant text := 'https://verify-kudo.supabase.co/storage/v1/object/public/kudo-images/';
  v_a uuid := pg_catalog.gen_random_uuid();
  v_b uuid := pg_catalog.gen_random_uuid();
  v_c uuid := pg_catalog.gen_random_uuid();
  -- Flat object names, exactly what the app uploads: {uuid}.{ext}, no sender in the name.
  v_img1 text := pg_catalog.gen_random_uuid()::text || '.jpg';  -- owner A
  v_img2 text := pg_catalog.gen_random_uuid()::text || '.png';  -- owner A
  v_imgb text := pg_catalog.gen_random_uuid()::text || '.webp'; -- owner B
  v_imgd text := pg_catalog.gen_random_uuid()::text || '.png';  -- owner A, deleted by B7b
  v_url1 text; v_url2 text;
  v_ins text[]; v_skip text; v_still bigint;
  v_k1 uuid; v_k2 uuid; v_k3 uuid; v_k4 uuid;
  v_slugs text[]; v_case jsonb; v_ok_case jsonb; v_res text;
  v_n bigint; v_m bigint; v_named bigint; v_blank bigint; v_blank_bad bigint; v_ok boolean; v_leak boolean; v_txt text; v_t text; v_storage_ok boolean := false;
  v_row public.kudo_row; v_row2 public.kudo_row;
begin
  -- S1. unaccent lives in `extensions`; wrapper immutable and folds Vietnamese (incl. đ).
  select pg_catalog.count(*) into v_n
  from pg_catalog.pg_extension as e join pg_catalog.pg_namespace as ns on ns.oid = e.extnamespace
  where e.extname = 'unaccent' and ns.nspname = 'extensions';
  v_txt := pg_catalog.lower(public.kudos_unaccent('Nguyễn Đặng Ánh'));
  v_ok := v_n = 1 and v_txt = 'nguyen dang anh'
    and (select pr.provolatile = 'i' from pg_catalog.pg_proc as pr where pr.oid = 'public.kudos_unaccent(text)'::regprocedure);
  v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
    'name', 'S1 unaccent in extensions; kudos_unaccent immutable, folds accents', 'ok', v_ok,
    'detail', 'ext=' || v_n || ' fold=' || coalesce(v_txt, 'null')));

  -- S2. RPCs: security definer, empty search_path, account rule; create volatile, search stable;
  --     owner bypasses RLS (create_kudo must see storage.objects rows of the caller).
  select pg_catalog.string_agg(f, ', ') into v_txt
  from pg_catalog.unnest(array[v_create, v_search]) as f
  join pg_catalog.pg_proc as pr on pr.oid = f::regprocedure
  join pg_catalog.pg_roles as r on r.oid = pr.proowner
  where not (pr.prosecdef and pr.proconfig = array['search_path=""']
             and pr.provolatile::text = case when f = v_create then 'v' else 's' end
             and pg_catalog.pg_get_functiondef(pr.oid) like '%public.is_allowed_account(%'
             and (r.rolbypassrls or r.rolsuper));
  v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
    'name', 'S2 RPCs definer + search_path + volatility + account rule; owner bypasses RLS',
    'ok', v_txt is null, 'detail', coalesce('bad: ' || v_txt, 'ok')));

  -- S3. EXECUTE: both RPCs for authenticated only; the unaccent wrapper for nobody. The search exists ONLY with
  --     p_name_only: the 2-argument version of the first migration runs must be gone (no overload).
  v_n := (select pg_catalog.count(*) from pg_catalog.pg_proc as pr
          join pg_catalog.pg_namespace as ns on ns.oid = pr.pronamespace
          where ns.nspname = 'public' and pr.proname = 'kudos_search_sunners');
  v_ok := v_n = 1 and pg_catalog.to_regprocedure('public.kudos_search_sunners(text, integer)') is null
    and pg_catalog.has_function_privilege('authenticated', v_create, 'execute')
    and pg_catalog.has_function_privilege('authenticated', v_search, 'execute')
    and not pg_catalog.has_function_privilege('anon', v_create, 'execute')
    and not pg_catalog.has_function_privilege('anon', v_search, 'execute')
    and not pg_catalog.has_function_privilege('anon', 'public.kudos_unaccent(text)', 'execute')
    and not pg_catalog.has_function_privilege('authenticated', 'public.kudos_unaccent(text)', 'execute');
  v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
    'name', 'S3 execute: RPCs authenticated only; kudos_unaccent nobody; one kudos_search_sunners (text, integer, boolean)',
    'ok', v_ok, 'detail', 'search_overloads=' || v_n));

  -- S4. Bucket: public, 5 MiB, jpeg/png/webp only.
  select pg_catalog.count(*) into v_n from storage.buckets as b
  where b.id = 'kudo-images' and b.public and b.file_size_limit = 5242880
    and b.allowed_mime_types @> array['image/jpeg', 'image/png', 'image/webp']
    and b.allowed_mime_types <@ array['image/jpeg', 'image/png', 'image/webp'];
  v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
    'name', 'S4 bucket kudo-images: public, 5242880 bytes, jpeg/png/webp', 'ok', v_n = 1, 'detail', 'match=' || v_n));

  -- S5. Policies: INSERT / DELETE / SELECT for authenticated, owner_id = caller + account rule; no UPDATE;
  --     none may still match on the object path (the first version's folder rule would block flat names).
  select pg_catalog.count(*) filter (where pol.roles = '{authenticated}'::name[]
           and coalesce(pol.qual, pol.with_check) like '%kudo-images%'
           and coalesce(pol.qual, pol.with_check) like '%owner_id%'
           and coalesce(pol.qual, pol.with_check) not like '%foldername%'
           and coalesce(pol.qual, pol.with_check) like '%auth.uid()%'
           and coalesce(pol.qual, pol.with_check) like '%is_allowed_account%'),
         pg_catalog.string_agg(pol.cmd, ',' order by pol.cmd)
    into v_n, v_txt
  from pg_catalog.pg_policies as pol
  where pol.schemaname = 'storage' and pol.tablename = 'objects' and pol.policyname like 'kudo\_images\_%';
  v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
    'name', 'S5 storage.objects policies: insert/delete/select by owner_id (no path rule), no update',
    'ok', v_n = 3 and v_txt = 'DELETE,INSERT,SELECT', 'detail', 'good=' || v_n || ' cmds=' || coalesce(v_txt, 'none')));

  -- B. Behaviour: fixtures + impersonation; everything is rolled back at the end of the block.
  begin
    insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, created_at, updated_at)
    select x.id, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated',
           x.email, v_meta, pg_catalog.now(), pg_catalog.now()
    from (values (v_a, 'verify-kudo-write-a@sun-asterisk.com'), (v_b, 'verify-kudo-write-b@sun-asterisk.com'),
                 (v_c, 'verify-kudo-write-c@sun-asterisk.com')) as x(id, email);
    insert into public.profiles (id, email)
    values (v_a, 'verify-kudo-write-a@sun-asterisk.com'), (v_b, 'verify-kudo-write-b@sun-asterisk.com'),
           (v_c, 'verify-kudo-write-c@sun-asterisk.com')
    on conflict (id) do nothing;
    update public.profiles set full_name = 'Verifyzq Self' where id = v_a;
    update public.profiles set full_name = 'Đặng Verifyzq' where id = v_b;
    update public.profiles set full_name = 'Nguyễn Văn Verifyzq' where id = v_c;
    select pg_catalog.array_agg(x.slug order by x.sort_order) into v_slugs
    from (select h.slug, h.sort_order from public.hashtags as h order by h.sort_order limit 6) as x;
    v_url1 := v_base || v_img1;
    v_url2 := v_base || v_img2;

    -- B0. Storage object rows (what an upload with the user's JWT writes: flat name, owner_id = sub).
    begin
      insert into storage.objects (bucket_id, name, owner_id)
      values ('kudo-images', v_img1, v_a::text), ('kudo-images', v_img2, v_a::text),
             ('kudo-images', v_imgb, v_b::text), ('kudo-images', v_imgd, v_a::text);
      v_storage_ok := true;
      v_txt := 'ok';
    exception when others then v_txt := sqlstate || ' ' || sqlerrm;
    end;
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'B0 storage.objects fixture rows inserted', 'ok', v_storage_ok, 'detail', v_txt));

    -- B1. Allowed user A creates 4 valid Kudos (as authenticated).
    perform pg_catalog.set_config('request.jwt.claims', pg_catalog.jsonb_build_object('sub', v_a,
      'role', 'authenticated', 'email', 'verify-kudo-write-a@sun-asterisk.com', 'app_metadata', v_meta)::text, true);
    set local role authenticated;
    v_k1 := public.create_kudo(v_b, '  VERIFY TITLE  ', 'verify content 1', v_slugs[1:2], '{}', false, null);
    v_k2 := public.create_kudo(v_c, 'VERIFY TITLE', 'verify content 2', v_slugs[3:3],
              case when v_storage_ok then array[v_url2, v_url1] else '{}'::text[] end, true, '  Verify Alias  ');
    v_k3 := public.create_kudo(v_b, 'VERIFY TITLE', 'verify content 3', v_slugs[1:1], null, true, '   ');
    v_k4 := public.create_kudo(v_b, pg_catalog.repeat('t', 100), pg_catalog.repeat('c', 5000), v_slugs[1:5]);
    execute pg_catalog.format('set local role %I', v_self);
    v_ok := v_storage_ok
      and (select k.sender_id = v_a and k.recipient_id = v_b and k.title = 'VERIFY TITLE' and not k.is_anonymous
                  and k.anonymous_name is null from public.kudos as k where k.id = v_k1)
      and (select pg_catalog.count(*) from public.kudo_hashtags as kh where kh.kudo_id = v_k1) = 2
      and (select k.is_anonymous and k.anonymous_name = 'Verify Alias' from public.kudos as k where k.id = v_k2)
      and (select pg_catalog.array_agg(i.image_url order by i.position) from public.kudo_images as i
           where i.kudo_id = v_k2) = array[v_url2, v_url1]
      and (select k.is_anonymous and k.anonymous_name is null from public.kudos as k where k.id = v_k3)
      and (select pg_catalog.count(*) from public.kudo_images as i where i.kudo_id in (v_k1, v_k3, v_k4)) = 0
      and (select pg_catalog.count(*) from public.kudo_hashtags as kh where kh.kudo_id = v_k4) = 5;
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'B1 valid: plain, 2 images + alias (trimmed), anonymous w/o alias, 100/5000 chars + 5 tags + defaults',
      'ok', coalesce(v_ok, false), 'detail', 'k1=' || coalesce(v_k1::text, 'null') || ' storage_ok=' || v_storage_ok));

    -- B2. Each invalid input raises 22023 with its code; nothing is written.
    v_ok_case := pg_catalog.jsonb_build_object('r', v_b, 't', 'T', 'c', 'C', 'h', pg_catalog.to_jsonb(v_slugs[1:1]),
                                               'i', '[]'::jsonb, 'a', false, 'n', null);
    v_txt := null;
    perform pg_catalog.set_config('request.jwt.claims', pg_catalog.jsonb_build_object('sub', v_a,
      'role', 'authenticated', 'email', 'verify-kudo-write-a@sun-asterisk.com', 'app_metadata', v_meta)::text, true);
    set local role authenticated;
    foreach v_case in array array[
        pg_catalog.jsonb_build_object('label', 'self', 'exp', 'invalid_recipient', 'r', v_a),
        pg_catalog.jsonb_build_object('label', 'unknown_recipient', 'exp', 'invalid_recipient', 'r', pg_catalog.gen_random_uuid()),
        pg_catalog.jsonb_build_object('label', 'null_recipient', 'exp', 'invalid_recipient', 'r', null),
        pg_catalog.jsonb_build_object('label', 'order', 'exp', 'invalid_recipient', 'r', v_a, 't', '', 'c', ''),
        pg_catalog.jsonb_build_object('label', 'blank_title', 'exp', 'invalid_title', 't', '   '),
        pg_catalog.jsonb_build_object('label', 'title_101', 'exp', 'invalid_title', 't', pg_catalog.repeat('t', 101)),
        pg_catalog.jsonb_build_object('label', 'blank_content', 'exp', 'invalid_content', 'c', E' \n\t '),
        pg_catalog.jsonb_build_object('label', 'null_content', 'exp', 'invalid_content', 'c', null),
        pg_catalog.jsonb_build_object('label', 'content_5001', 'exp', 'invalid_content', 'c', pg_catalog.repeat('c', 5001)),
        pg_catalog.jsonb_build_object('label', 'no_tags', 'exp', 'invalid_hashtags', 'h', '[]'::jsonb),
        pg_catalog.jsonb_build_object('label', 'null_tags', 'exp', 'invalid_hashtags', 'h', null),
        pg_catalog.jsonb_build_object('label', '6_tags', 'exp', 'invalid_hashtags', 'h', pg_catalog.to_jsonb(v_slugs[1:6])),
        pg_catalog.jsonb_build_object('label', 'dup_tag', 'exp', 'invalid_hashtags', 'h', pg_catalog.to_jsonb(array[v_slugs[1], v_slugs[1]])),
        pg_catalog.jsonb_build_object('label', 'unknown_tag', 'exp', 'invalid_hashtags', 'h', pg_catalog.to_jsonb(array[v_slugs[1], 'verify-no-such-tag'])),
        pg_catalog.jsonb_build_object('label', '6_images', 'exp', 'invalid_images', 'i', pg_catalog.to_jsonb(array_fill(v_url1, array[6]))),
        -- Correct URL shape, but the object exists and belongs to B: owner mismatch.
        pg_catalog.jsonb_build_object('label', 'other_users_object', 'exp', 'invalid_images', 'i', pg_catalog.to_jsonb(array[v_base || v_imgb])),
        -- Correct URL shape, but no such object in storage.objects.
        pg_catalog.jsonb_build_object('label', 'no_object', 'exp', 'invalid_images', 'i', pg_catalog.to_jsonb(array[v_base || pg_catalog.gen_random_uuid() || '.jpg'])),
        -- The earlier {uid}/{uuid}.ext shape is refused (a folder segment, and a uid, are not allowed).
        pg_catalog.jsonb_build_object('label', 'uid_folder_path', 'exp', 'invalid_images', 'i', pg_catalog.to_jsonb(array[v_base || v_a || '/' || v_img1])),
        -- The same valid, owned URL twice.
        pg_catalog.jsonb_build_object('label', 'dup_url', 'exp', 'invalid_images', 'i', pg_catalog.to_jsonb(array[v_url1, v_url1])),
        pg_catalog.jsonb_build_object('label', 'gif_ext', 'exp', 'invalid_images', 'i', pg_catalog.to_jsonb(array[pg_catalog.replace(v_url1, '.jpg', '.gif')])),
        pg_catalog.jsonb_build_object('label', 'js_prefix', 'exp', 'invalid_images', 'i', pg_catalog.to_jsonb(array['javascript:' || pg_catalog.substr(v_url1, 32)])),
        pg_catalog.jsonb_build_object('label', 'no_host', 'exp', 'invalid_images', 'i', pg_catalog.to_jsonb(array[pg_catalog.substr(v_url1, 32)])),
        pg_catalog.jsonb_build_object('label', 'null_image', 'exp', 'invalid_images', 'i', pg_catalog.to_jsonb(array[null::text])),
        pg_catalog.jsonb_build_object('label', 'alias_not_anon', 'exp', 'invalid_alias', 'a', false, 'n', ''),
        pg_catalog.jsonb_build_object('label', 'alias_51', 'exp', 'invalid_alias', 'a', true, 'n', pg_catalog.repeat('n', 51))] loop
      v_case := v_ok_case || v_case;
      begin
        perform public.create_kudo((v_case ->> 'r')::uuid, v_case ->> 't', v_case ->> 'c',
          case when pg_catalog.jsonb_typeof(v_case -> 'h') = 'array'
               then array(select pg_catalog.jsonb_array_elements_text(v_case -> 'h')) end,
          case when pg_catalog.jsonb_typeof(v_case -> 'i') = 'array'
               then array(select pg_catalog.jsonb_array_elements_text(v_case -> 'i')) end,
          (v_case ->> 'a')::boolean, v_case ->> 'n');
        v_res := 'created';
      exception when others then v_res := sqlstate || ':' || sqlerrm;
      end;
      if v_res <> '22023:' || (v_case ->> 'exp') then
        v_txt := coalesce(v_txt || '; ', '') || (v_case ->> 'label') || '=' || v_res;
      end if;
    end loop;
    execute pg_catalog.format('set local role %I', v_self);
    select pg_catalog.count(*) into v_n from public.kudos as k where k.sender_id = v_a;
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'B2 25 invalid inputs -> 22023 + exact code, in check order; no partial write',
      'ok', v_txt is null and v_n = 4, 'detail', 'kudos_by_a=' || v_n || coalesce(' bad: ' || v_txt, '')));

    -- B3. Wrong domain / non-Google / no claims: create -> forbidden; search -> nothing.
    v_txt := null;
    foreach v_t in array array[
        pg_catalog.jsonb_build_object('sub', v_a, 'role', 'authenticated',
          'email', 'verify-kudo-write-a@gmail.com', 'app_metadata', v_meta)::text,
        pg_catalog.jsonb_build_object('sub', v_a, 'role', 'authenticated',
          'email', 'verify-kudo-write-a@sun-asterisk.com', 'app_metadata', '{"provider":"email"}'::jsonb)::text,
        ''] loop
      perform pg_catalog.set_config('request.jwt.claims', v_t, true);
      set local role authenticated;
      begin
        perform public.create_kudo(v_b, 'T', 'C', v_slugs[1:1], '{}', false, null);
        v_res := 'created';
      exception when others then v_res := sqlstate || ':' || sqlerrm;
      end;
      -- the account rule runs before the blank-query branch: '' must not list anyone either
      v_n := (select pg_catalog.count(*) from public.kudos_search_sunners('verifyzq'))
           + (select pg_catalog.count(*) from public.kudos_search_sunners(''))
           + (select pg_catalog.count(*) from public.kudos_search_sunners('', 10, true));
      execute pg_catalog.format('set local role %I', v_self);
      if v_res <> '22023:forbidden' or v_n <> 0 then
        v_txt := coalesce(v_txt || '; ', '') || v_res || ' search_rows=' || v_n || ' for claims ' || v_t;
      end if;
    end loop;
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'B3 wrong domain / non-Google / no claims: forbidden, empty search', 'ok', v_txt is null,
      'detail', coalesce(v_txt, 'ok')));

    -- B4. anon cannot execute either RPC.
    perform pg_catalog.set_config('request.jwt.claims', '', true);
    set local role anon;
    v_n := 0;
    foreach v_t in array array['select public.kudos_search_sunners(''verifyzq'')',
        pg_catalog.format('select public.create_kudo(%L, ''T'', ''C'', %L, ''{}'', false, null)', v_b, v_slugs[1:1])] loop
      begin execute v_t;
      exception when others then
        if sqlstate = '42501' then v_n := v_n + 1; end if;
      end;
    end loop;
    execute pg_catalog.format('set local role %I', v_self);
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'B4 anon denied on create_kudo + kudos_search_sunners', 'ok', v_n = 2, 'detail', 'denied=' || v_n || '/2'));

    -- B5. Search as A: no email column, never self, accent/case-insensitive, finds by email (local part and full
    --     address, any case) without returning it, % literal, limit. p_name_only ("@ + tên"): names only, never email.
    --     Blank / null query ("@" alone): exactly min(limit, named Sunners other than A), never A, never a nameless row.
    select pg_catalog.count(*) into v_named  -- as the owner (no RLS): every named profile except A
    from public.profiles as p where p.id <> v_a and pg_catalog.btrim(p.full_name) <> '';
    perform pg_catalog.set_config('request.jwt.claims', pg_catalog.jsonb_build_object('sub', v_a,
      'role', 'authenticated', 'email', 'verify-kudo-write-a@sun-asterisk.com', 'app_metadata', v_meta)::text, true);
    set local role authenticated;
    select pg_catalog.count(*) filter (where s.id = v_a), pg_catalog.count(*) filter (where s.id in (v_b, v_c))
      into v_n, v_m
    from public.kudos_search_sunners('verifyzq') as s;
    select pg_catalog.string_agg(k, ',' order by k) into v_txt
    from (select s.* from public.kudos_search_sunners('verifyzq') as s limit 1) as x,
         pg_catalog.jsonb_object_keys(pg_catalog.to_jsonb(x)) as k;
    v_ok := v_n = 0 and v_m = 2 and v_txt = 'avatar_url,department,full_name,id'
      and exists (select 1 from public.kudos_search_sunners('  NGUYEN van verifyzq ') as s where s.id = v_c)
      and exists (select 1 from public.kudos_search_sunners('dang verifyzq') as s where s.id = v_b)
      and exists (select 1 from public.kudos_search_sunners('verify-kudo-write-c') as s where s.id = v_c)
      and (select pg_catalog.count(*) from public.kudos_search_sunners('verify-kudo-write-c') as s where s.id in (v_a, v_b)) = 0
      and exists (select 1 from public.kudos_search_sunners(' VERIFY-kudo-write-b@sun-asterisk.com ') as s where s.id = v_b)
      and (select pg_catalog.count(*) from public.kudos_search_sunners('verify-kudo-write-b@sun-asterisk.com') as s) = 1
      and (select pg_catalog.count(*) from public.kudos_search_sunners('verify-kudo-write-a')) = 0
      and (select pg_catalog.count(*) from public.kudos_search_sunners('verify-kudo-write-')) = 2
      and not exists (select 1 from public.kudos_search_sunners('%verifyzq'))
      and not exists (select 1 from public.kudos_search_sunners('verify%write'))
      and (select pg_catalog.count(*) from public.kudos_search_sunners('a', 100)) <= 10
      -- p_name_only: the name branch still works (accents folded), the email branch is gone
      and (select pg_catalog.count(*) from public.kudos_search_sunners('verifyzq', 10, true) as s where s.id in (v_b, v_c)) = 2
      and exists (select 1 from public.kudos_search_sunners('  NGUYEN van verifyzq ', 10, true) as s where s.id = v_c)
      and not exists (select 1 from public.kudos_search_sunners('verifyzq', 10, true) as s where s.id = v_a)
      and not exists (select 1 from public.kudos_search_sunners('verify-kudo-write-c', 10, true))
      and not exists (select 1 from public.kudos_search_sunners('verify-kudo-write-b@sun-asterisk.com', 10, true))
      and (select pg_catalog.count(*) from public.kudos_search_sunners('verify-kudo-write-', 10, false)) = 2;
    select pg_catalog.count(*),
           pg_catalog.count(*) filter (where s.id = v_a or coalesce(pg_catalog.btrim(s.full_name), '') = '')
      into v_blank, v_blank_bad
    from public.kudos_search_sunners('   ') as s;
    v_ok := v_ok and v_blank = least(v_named, 10) and v_blank_bad = 0
      and (select pg_catalog.count(*) from public.kudos_search_sunners(null)) = v_blank
      and (select pg_catalog.count(*) from public.kudos_search_sunners('', 10, true) as s where s.id <> v_a) = v_blank
      and (select pg_catalog.count(*) from public.kudos_search_sunners('', 3)) = least(v_named, 3);
    execute pg_catalog.format('set local role %I', v_self);
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'B5 search: id/name/avatar/department only (no email), not self, by name or email (name only with p_name_only), "nguyen" ~ "Nguyễn", "dang" ~ "Đặng", escaped, <=10, blank = first named Sunners',
      'ok', coalesce(v_ok, false), 'detail', 'self_rows=' || v_n || ' others=' || v_m || ' keys=' || coalesce(v_txt, 'none')
        || ' blank=' || coalesce(v_blank, -1) || '/' || least(v_named, 10) || ' blank_bad=' || coalesce(v_blank_bad, -1)));

    -- B6. kudos_feed shows the new anonymous Kudo with sender = null (cursor just after now()
    --     puts this transaction's Kudos first, whatever real data exists).
    set local role authenticated;
    select f.* into v_row from public.kudos_feed(p_cursor_created_at => pg_catalog.now() + interval '1 millisecond',
      p_cursor_id => v_a, p_limit => 20) as f where f.id = v_k2;
    select f.* into v_row2 from public.kudos_feed(p_cursor_created_at => pg_catalog.now() + interval '1 millisecond',
      p_cursor_id => v_a, p_limit => 20) as f where f.id = v_k1;
    execute pg_catalog.format('set local role %I', v_self);
    -- Privacy: the sender's uid must appear NOWHERE in the anonymous Kudo's row, in particular not in an
    -- image URL (the old {uid}/{uuid} object path leaked it: uid -> name through the Sunner lookups).
    v_leak := pg_catalog.strpos(pg_catalog.to_jsonb(v_row)::text, v_a::text) > 0
              or pg_catalog.strpos(coalesce(v_row.images::text, ''), v_a::text) > 0;
    v_ok := v_row.id = v_k2 and v_row.sender is null and v_row.is_anonymous and v_row.anonymous_name = 'Verify Alias'
      and v_row.images = pg_catalog.to_jsonb(array[v_url2, v_url1]) and v_row.is_mine
      and not v_leak
      and v_row2.sender ->> 'id' = v_a::text and v_row2.sender ->> 'email' is null;
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'B6 kudos_feed: new anonymous Kudo has sender = null, alias + images kept, no sender uid anywhere in the row',
      'ok', coalesce(v_ok, false), 'detail', 'k2_found=' || (v_row.id is not null) || ' k1_found=' || (v_row2.id is not null)
        || ' sender_uid_in_anonymous_row=' || coalesce(v_leak::text, 'null')));

    -- B7. Storage policies, exercised the way Storage runs them: role authenticated + user A's JWT claims, direct
    --     statements on storage.objects (RLS applies to that role). Ownership is owner_id, so A must not see, delete
    --     or create B's objects, nor an ownerless object. Each row is PASS / FAIL, or SKIP with the reason when a
    --     Storage trigger or grant stops the direct statement (a SKIP proves nothing: re-check it by hand with a real
    --     upload as two users). Every row written here is rolled back with the rest.
    if not v_storage_ok then
      v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
        'name', 'B7 storage.objects policies as user A (select / delete / insert)', 'ok', false, 'skip', true,
        'detail', 'B0 could not insert the storage.objects fixture rows'));
    else
      perform pg_catalog.set_config('request.jwt.claims', pg_catalog.jsonb_build_object('sub', v_a,
        'role', 'authenticated', 'email', 'verify-kudo-write-a@sun-asterisk.com', 'app_metadata', v_meta)::text, true);
      -- Storage refuses a direct DELETE unless this is set; it only lasts for this transaction.
      perform pg_catalog.set_config('storage.allow_delete_query', 'true', true);
      set local role authenticated;

      -- B7a. SELECT: A sees its own three objects and none of B's.
      v_skip := null; v_n := null; v_m := null;
      begin
        select pg_catalog.count(*) filter (where o.name = v_imgb),
               pg_catalog.count(*) filter (where o.name in (v_img1, v_img2, v_imgd))
          into v_n, v_m
        from storage.objects as o where o.bucket_id = 'kudo-images';
      exception when others then v_skip := sqlstate || ' ' || sqlerrm;
      end;
      v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
        'name', 'B7a select on storage.objects: A sees own objects, not B''s',
        'ok', coalesce(v_skip is null and v_n = 0 and v_m = 3, false), 'skip', v_skip is not null,
        'detail', coalesce('skipped: ' || v_skip, 'b_object_visible=' || v_n || ' own_visible=' || v_m)));

      -- B7b. DELETE: B's object is untouched (0 rows), A's own object is deleted (1 row, so 0 above is not vacuous).
      v_skip := null; v_n := null; v_m := null;
      begin
        delete from storage.objects as o where o.bucket_id = 'kudo-images' and o.name = v_imgb;
        get diagnostics v_n = row_count;
      exception when others then v_skip := 'delete of B''s object: ' || sqlstate || ' ' || sqlerrm;
      end;
      begin
        delete from storage.objects as o where o.bucket_id = 'kudo-images' and o.name = v_imgd;
        get diagnostics v_m = row_count;
      exception when others then
        v_skip := coalesce(v_skip || '; ', '') || 'delete of own object: ' || sqlstate || ' ' || sqlerrm;
      end;

      -- B7c / B7d. INSERT: owner_id = B and owner_id = null are refused by RLS (42501 on "objects"); owner_id = A works.
      v_ins := '{}';
      foreach v_t in array array[v_b::text, null::text, v_a::text] loop
        begin
          insert into storage.objects (bucket_id, name, owner_id)
          values ('kudo-images', pg_catalog.gen_random_uuid()::text || '.jpg', v_t);
          v_ins := v_ins || 'inserted'::text;
        exception when others then
          v_ins := v_ins || case when sqlstate = '42501' and sqlerrm like '%row-level security%' and sqlerrm like '%"objects"%'
                                 then 'rls' else sqlstate || ' ' || sqlerrm end;
        end;
      end loop;

      execute pg_catalog.format('set local role %I', v_self);
      select pg_catalog.count(*) into v_still from storage.objects as o where o.bucket_id = 'kudo-images' and o.name = v_imgb;

      -- B7b result: needs both deletes to have run.
      v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
        'name', 'B7b delete on storage.objects: A cannot delete B''s object (0 rows), can delete its own (1 row)',
        'ok', coalesce(v_skip is null and v_n = 0 and v_m = 1 and v_still = 1, false), 'skip', v_skip is not null,
        'detail', coalesce('skipped: ' || v_skip, 'b_rows_deleted=' || v_n || ' b_object_left=' || v_still || ' own_rows_deleted=' || v_m)));

      -- B7c result: an 'inserted' outcome is a leak (FAIL) whatever the other one says.
      v_skip := case when 'inserted' = any (v_ins[1:2]) then null
                     else (select pg_catalog.string_agg(x, '; ') from pg_catalog.unnest(v_ins[1:2]) as x where x <> 'rls') end;
      v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
        'name', 'B7c insert into storage.objects with owner_id = B or null: refused by RLS (42501)',
        'ok', v_ins[1:2] = array['rls', 'rls'], 'skip', v_skip is not null,
        'detail', coalesce('skipped: ' || v_skip, 'owner_b=' || v_ins[1] || ' owner_null=' || v_ins[2])));

      -- B7d result: a refusal by the policy itself would mean a real upload cannot work (FAIL).
      v_skip := case when v_ins[3] in ('inserted', 'rls') then null else v_ins[3] end;
      v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
        'name', 'B7d insert into storage.objects with owner_id = A: allowed', 'ok', v_ins[3] = 'inserted',
        'skip', v_skip is not null, 'detail', coalesce('skipped: ' || v_skip, 'owner_a=' || v_ins[3])));
    end if;

    raise exception 'verify-kudo-write-rollback';
  exception when others then
    if sqlerrm <> 'verify-kudo-write-rollback' then
      v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
        'name', 'B* behaviour block aborted', 'ok', false, 'detail', sqlstate || ' ' || sqlerrm));
    end if;
  end;

  return query
    select e.ord::integer, e.value ->> 'name',
           case when coalesce((e.value ->> 'skip')::boolean, false) then 'SKIP'
                when coalesce((e.value ->> 'ok')::boolean, false) then 'PASS' else 'FAIL' end,
           e.value ->> 'detail'
    from pg_catalog.jsonb_array_elements(v_out) with ordinality as e(value, ord);
end;
$$;

select * from pg_temp.verify_kudo_write_migration();
