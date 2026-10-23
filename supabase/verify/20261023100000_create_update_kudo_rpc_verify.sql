-- Verification for: supabase/migrations/20261023100000_create_update_kudo_rpc.sql
-- How to run: Supabase Dashboard > SQL Editor (role: postgres). Paste this WHOLE file and Run.
--           The last statement prints one row per check. Expected: every row result = PASS.
--           Safe to re-run any time: behaviour checks create throw-away users, Storage object rows and Kudos, then
--           raise inside a sub-block, so EVERY write is rolled back (only session-local pg_temp functions remain, gone
--           when the session ends). No file is uploaded: object rows are inserted straight into storage.objects.
--           Behaviour checks impersonate `authenticated` / `anon` with `set local role` and fake JWT claims in
--           `request.jwt.claims` (what PostgREST does per request).
-- If a row FAILs: read `detail`; to undo the migration use
--           supabase/rollbacks/20261023100000_create_update_kudo_rpc_down.sql
-- If U0 FAILs (cannot insert into storage.objects): the checks that need an owned object fail too; test one real
--           upload + edit by hand then.

-- One update_kudo call as `authenticated`: 'ok:' || the returned text[] (e.g. 'ok:{}'), or 'sqlstate:message'.
create or replace function pg_temp.verify_update_kudo_call(
  p_claims text, p_id uuid, p_title text, p_content text, p_slugs text[], p_urls text[], p_alias text, p_self text)
returns text
language plpgsql
as $$
declare
  v_res text;
begin
  perform pg_catalog.set_config('request.jwt.claims', p_claims, true);
  set local role authenticated;
  begin
    v_res := 'ok:' || public.update_kudo(p_id, p_title, p_content, p_slugs, p_urls, p_alias)::text;
  exception when others then v_res := sqlstate || ':' || sqlerrm;
  end;
  execute pg_catalog.format('set local role %I', p_self);
  return v_res;
end;
$$;

-- A Kudo as the checks read it (as postgres): its columns, hashtag slugs (sorted) and image URLs by position.
-- Volatile on purpose: a stable function would read the snapshot of the calling statement and miss an earlier edit.
create or replace function pg_temp.verify_update_kudo_state(p_id uuid)
returns jsonb
language sql
volatile
as $$
  select pg_catalog.jsonb_build_object(
    'sender', k.sender_id, 'recipient', k.recipient_id, 'title', k.title, 'content', k.content,
    'anon', k.is_anonymous, 'alias', k.anonymous_name, 'created_at', k.created_at, 'hearts', k.heart_count,
    'tags', (select coalesce(pg_catalog.jsonb_agg(h.slug order by h.slug), '[]'::jsonb)
             from public.kudo_hashtags as kh join public.hashtags as h on h.id = kh.hashtag_id where kh.kudo_id = k.id),
    'images', (select coalesce(pg_catalog.jsonb_agg(i.image_url order by i.position), '[]'::jsonb)
               from public.kudo_images as i where i.kudo_id = k.id),
    'positions', (select coalesce(pg_catalog.jsonb_agg(i.position order by i.position), '[]'::jsonb)
                  from public.kudo_images as i where i.kudo_id = k.id))
  from public.kudos as k where k.id = p_id;
$$;

create or replace function pg_temp.verify_update_kudo_rpc()
returns table (no integer, check_name text, result text, detail text)
language plpgsql
as $$
#variable_conflict use_column
declare
  v_out   jsonb := '[]'::jsonb;
  v_fn    constant text := 'public.update_kudo(uuid, text, text, text[], text[], text)';
  v_meta  constant jsonb := '{"provider":"google","providers":["google"]}';
  v_self  constant text := current_user;  -- role to switch back to after impersonating
  v_base  constant text := 'https://verify-update.supabase.co/storage/v1/object/public/kudo-images/';
  v_t0    constant timestamptz := pg_catalog.now() - interval '2 days';
  v_a uuid := pg_catalog.gen_random_uuid();  -- sender of every Kudo under test
  v_b uuid := pg_catalog.gen_random_uuid();  -- recipient; the "other user"
  v_c uuid := pg_catalog.gen_random_uuid();
  -- Flat object names, as the app uploads them. n1, n2, n5 are on A's Kudos; n4 is a fresh upload of A; nb is B's;
  -- the orphan is an image of kanon with no object row (e.g. uploaded with the service key: owner_id null).
  v_n1 text := pg_catalog.gen_random_uuid()::text || '.jpg';
  v_n2 text := pg_catalog.gen_random_uuid()::text || '.jpg';
  v_n4 text := pg_catalog.gen_random_uuid()::text || '.png';
  v_n5 text := pg_catalog.gen_random_uuid()::text || '.webp';
  v_nb text := pg_catalog.gen_random_uuid()::text || '.jpg';
  v_u1 text; v_u2 text; v_u4 text; v_u5 text; v_ub text; v_uo text;
  v_ka uuid; v_ka2 uuid; v_kanon uuid; v_kb uuid;
  v_ca text; v_cb text; v_slugs text[];
  v_storage_ok boolean := false; v_ok boolean; v_n bigint; v_def text; v_txt text; v_res text; v_r text[];
  v_case jsonb; v_ok_case jsonb; v_s jsonb; v_s0 jsonb;
begin
  -- P1. definer, empty search_path, volatile, owner bypasses RLS, exact signature -> text[]; account rule BEFORE the
  --     ownership lookup; EXECUTE for authenticated only (no PUBLIC, no anon).
  select pg_catalog.count(*), pg_catalog.max(pg_catalog.pg_get_functiondef(pr.oid)) into v_n, v_def
  from pg_catalog.pg_proc as pr
  join pg_catalog.pg_roles as r on r.oid = pr.proowner
  where pr.oid = pg_catalog.to_regprocedure(v_fn)
    and pr.prosecdef and pr.proconfig = array['search_path=""'] and pr.provolatile = 'v'
    and (r.rolbypassrls or r.rolsuper)
    and pg_catalog.pg_get_function_identity_arguments(pr.oid) = 'p_id uuid, p_title text, p_content text, '
      || 'p_hashtag_slugs text[], p_image_urls text[], p_anonymous_name text'
    and not pr.proretset and pr.prorettype = 'text[]'::regtype
    and not exists (select 1 from pg_catalog.aclexplode(pr.proacl) as a
                    where a.grantee = 0 and a.privilege_type = 'EXECUTE');
  v_ok := false;
  if v_n = 1 then  -- has_function_privilege raises when the function does not exist
    v_ok := pg_catalog.strpos(v_def, 'public.is_allowed_account(') > 0
      and pg_catalog.strpos(v_def, 'public.is_allowed_account(') < pg_catalog.strpos(v_def, 'for update')
      and pg_catalog.has_function_privilege('authenticated', v_fn, 'execute')
      and not pg_catalog.has_function_privilege('anon', v_fn, 'execute');
  end if;
  v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
    'name', 'P1 update_kudo: definer + search_path + volatile + signature -> text[]; account rule first; execute authenticated only',
    'ok', coalesce(v_ok, false), 'detail', 'match=' || v_n));

  -- Behaviour: fixtures + impersonation; everything is rolled back at the end of the block.
  begin
    insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, created_at, updated_at)
    select x.id, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated',
           x.email, v_meta, pg_catalog.now(), pg_catalog.now()
    from (values (v_a, 'verify-update-a@sun-asterisk.com'), (v_b, 'verify-update-b@sun-asterisk.com'),
                 (v_c, 'verify-update-c@sun-asterisk.com')) as x(id, email);
    insert into public.profiles (id, email)
    values (v_a, 'verify-update-a@sun-asterisk.com'), (v_b, 'verify-update-b@sun-asterisk.com'),
           (v_c, 'verify-update-c@sun-asterisk.com')
    on conflict (id) do nothing;
    select pg_catalog.array_agg(x.slug order by x.sort_order) into v_slugs
    from (select h.slug, h.sort_order from public.hashtags as h order by h.sort_order limit 6) as x;
    v_u1 := v_base || v_n1; v_u2 := v_base || v_n2; v_u4 := v_base || v_n4; v_u5 := v_base || v_n5;
    v_ub := v_base || v_nb; v_uo := v_base || pg_catalog.gen_random_uuid()::text || '.jpg';
    v_ca := pg_catalog.jsonb_build_object('sub', v_a, 'role', 'authenticated',
      'email', 'verify-update-a@sun-asterisk.com', 'app_metadata', v_meta)::text;
    v_cb := pg_catalog.jsonb_build_object('sub', v_b, 'role', 'authenticated',
      'email', 'verify-update-b@sun-asterisk.com', 'app_metadata', v_meta)::text;

    -- U0. Storage object rows (what an upload with the user's JWT writes: flat name, owner_id = sub).
    begin
      insert into storage.objects (bucket_id, name, owner_id)
      values ('kudo-images', v_n1, v_a::text), ('kudo-images', v_n2, v_a::text), ('kudo-images', v_n4, v_a::text),
             ('kudo-images', v_n5, v_a::text), ('kudo-images', v_nb, v_b::text);
      v_storage_ok := true;
      v_txt := 'ok';
    exception when others then v_txt := sqlstate || ' ' || sqlerrm;
    end;
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'U0 storage.objects fixture rows inserted', 'ok', v_storage_ok, 'detail', v_txt));

    -- Kudos (as postgres): kA = A -> B named, 7 hearts, images [u1, u2, u5], tags 1-2; kA2 = A -> C holding u5 too;
    -- kanon = A -> B anonymous ('Old alias') holding the orphan image; kB = B -> A holding B's image.
    insert into public.kudos (sender_id, recipient_id, title, content, created_at, heart_count)
    values (v_a, v_b, 'VERIFY OLD', 'verify old content', v_t0, 7) returning id into v_ka;
    insert into public.kudos (sender_id, recipient_id, title, content, created_at)
    values (v_a, v_c, 'VERIFY OLD 2', 'verify old content 2', v_t0) returning id into v_ka2;
    insert into public.kudos (sender_id, recipient_id, title, content, is_anonymous, anonymous_name, created_at)
    values (v_a, v_b, 'VERIFY ANON', 'verify anon content', true, 'Old alias', v_t0) returning id into v_kanon;
    insert into public.kudos (sender_id, recipient_id, title, content, created_at)
    values (v_b, v_a, 'VERIFY B', 'verify b content', v_t0) returning id into v_kb;
    insert into public.kudo_images (kudo_id, image_url, position)
    values (v_ka, v_u1, 1), (v_ka, v_u2, 2), (v_ka, v_u5, 3), (v_ka2, v_u5, 1), (v_kanon, v_uo, 1), (v_kb, v_ub, 1);
    insert into public.kudo_hashtags (kudo_id, hashtag_id)
    select k.id, h.id from (values (v_ka), (v_ka2), (v_kanon), (v_kb)) as k(id)
    join public.hashtags as h on h.slug = any (v_slugs[1:2]);

    -- U1. The sender edits kA: title trimmed, new content, tags 3-4, keeps u2, adds the fresh upload u4, drops u1 and u5.
    v_res := pg_temp.verify_update_kudo_call(v_ca, v_ka, '  VERIFY NEW  ', 'verify new **content**', v_slugs[3:4],
      array[v_u2, v_u4], null, v_self);
    v_s := pg_temp.verify_update_kudo_state(v_ka);
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'U1 sender updates own Kudo: title (trimmed) and content saved',
      'ok', coalesce(v_res like 'ok:%' and v_s ->> 'title' = 'VERIFY NEW' and v_s ->> 'content' = 'verify new **content**', false),
      'detail', v_res));

    -- U2. What an edit never changes.
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'U2 sender, recipient, is_anonymous, alias (null), created_at and heart_count unchanged',
      'ok', coalesce((v_s ->> 'sender')::uuid = v_a and (v_s ->> 'recipient')::uuid = v_b and not (v_s ->> 'anon')::boolean
        and v_s -> 'alias' = 'null'::jsonb and (v_s ->> 'created_at')::timestamptz = v_t0 and (v_s ->> 'hearts')::integer = 7, false),
      'detail', pg_catalog.left(v_s::text, 300)));

    -- U3. Hashtags and images replaced, images at positions 1..n in the given order.
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'U3 hashtags replaced; images replaced in the given order at positions 1..n',
      'ok', coalesce(v_s -> 'tags' = (select pg_catalog.jsonb_agg(s order by s) from pg_catalog.unnest(v_slugs[3:4]) as s)
        and v_s -> 'images' = pg_catalog.jsonb_build_array(v_u2, v_u4) and v_s -> 'positions' = '[1, 2]'::jsonb, false),
      'detail', pg_catalog.left(v_s::text, 300)));

    -- U4. Returns the dropped URLs no Kudo holds: u1 only (u5 is still on kA2, u2 is kept). Once kA2 drops u5 too,
    --     it is returned there. That second edit also takes the limits: 100-char title, 5000-char content, 5 tags.
    v_txt := pg_temp.verify_update_kudo_call(v_ca, v_ka2, pg_catalog.repeat('t', 100), pg_catalog.repeat('c', 5000),
      v_slugs[1:5], '{}', null, v_self);
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'U4 returns dropped image URLs no Kudo still holds (kA -> {u1}; kA2 then -> {u5}); limits 100/5000/5 accepted',
      'ok', v_res = 'ok:' || array[v_u1]::text and v_txt = 'ok:' || array[v_u5]::text,
      'detail', v_res || ' | ' || v_txt));

    -- U5. Anonymous Kudo: alias trimmed, blank -> null, still anonymous; its own image is kept although no object row
    --     exists for it (kept = already this Kudo's image). Nothing dropped.
    -- One statement per step: each edit must be visible to the read that follows it.
    v_r := array[pg_temp.verify_update_kudo_call(v_ca, v_kanon, 'T', 'C', v_slugs[1:1], array[v_uo], '  New alias  ', v_self)];
    v_r := v_r || (pg_temp.verify_update_kudo_state(v_kanon) ->> 'alias');
    v_r := v_r || pg_temp.verify_update_kudo_call(v_ca, v_kanon, 'T', 'C', v_slugs[1:1], array[v_uo], '   ', v_self);
    v_s := pg_temp.verify_update_kudo_state(v_kanon);
    v_r := v_r || array[coalesce(v_s ->> 'alias', 'null'), v_s ->> 'anon', (v_s -> 'images')::text];
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'U5 anonymous Kudo: alias trimmed / blank -> null, stays anonymous, own image kept without an object row',
      'ok', v_r = array['ok:{}', 'New alias', 'ok:{}', 'null', 'true', pg_catalog.jsonb_build_array(v_uo)::text],
      'detail', pg_catalog.array_to_string(v_r, ' | ')));

    -- U6. Another user, or an unknown / null id: the same not_found, even with invalid fields (ownership is checked
    --     before them); kA is untouched.
    v_s0 := pg_temp.verify_update_kudo_state(v_ka);
    v_r := array[
      pg_temp.verify_update_kudo_call(v_cb, v_ka, 'B WAS HERE', 'C', v_slugs[1:1], '{}', null, v_self),
      pg_temp.verify_update_kudo_call(v_cb, v_ka, '', '', '{}', array['javascript:x'], 'x', v_self),
      pg_temp.verify_update_kudo_call(v_cb, pg_catalog.gen_random_uuid(), 'T', 'C', v_slugs[1:1], '{}', null, v_self),
      pg_temp.verify_update_kudo_call(v_ca, pg_catalog.gen_random_uuid(), 'T', 'C', v_slugs[1:1], '{}', null, v_self),
      pg_temp.verify_update_kudo_call(v_ca, null, 'T', 'C', v_slugs[1:1], '{}', null, v_self)];
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'U6 other user / unknown id / null id -> 22023 not_found (before field checks); Kudo untouched',
      'ok', v_r = array_fill('22023:not_found'::text, array[5]) and pg_temp.verify_update_kudo_state(v_ka) = v_s0,
      'detail', pg_catalog.array_to_string(v_r, ' | ')));

    -- U7. Each invalid input raises 22023 with its code, in check order; nothing is written.
    v_ok_case := pg_catalog.jsonb_build_object('id', v_ka, 't', 'T', 'c', 'C', 'h', pg_catalog.to_jsonb(v_slugs[1:1]),
                                               'i', pg_catalog.to_jsonb(array[v_u2]), 'n', null);
    v_txt := null;
    foreach v_case in array array[
        pg_catalog.jsonb_build_object('label', 'blank_title', 'exp', 'invalid_title', 't', '   '),
        pg_catalog.jsonb_build_object('label', 'null_title', 'exp', 'invalid_title', 't', null),
        pg_catalog.jsonb_build_object('label', 'title_101', 'exp', 'invalid_title', 't', pg_catalog.repeat('t', 101)),
        pg_catalog.jsonb_build_object('label', 'order', 'exp', 'invalid_title', 't', '', 'c', '', 'h', '[]'::jsonb),
        pg_catalog.jsonb_build_object('label', 'blank_content', 'exp', 'invalid_content', 'c', E' \n\t '),
        pg_catalog.jsonb_build_object('label', 'null_content', 'exp', 'invalid_content', 'c', null),
        pg_catalog.jsonb_build_object('label', 'content_5001', 'exp', 'invalid_content', 'c', pg_catalog.repeat('c', 5001)),
        pg_catalog.jsonb_build_object('label', 'no_tags', 'exp', 'invalid_hashtags', 'h', '[]'::jsonb),
        pg_catalog.jsonb_build_object('label', 'null_tags', 'exp', 'invalid_hashtags', 'h', null),
        pg_catalog.jsonb_build_object('label', '6_tags', 'exp', 'invalid_hashtags', 'h', pg_catalog.to_jsonb(v_slugs[1:6])),
        pg_catalog.jsonb_build_object('label', 'dup_tag', 'exp', 'invalid_hashtags', 'h', pg_catalog.to_jsonb(array[v_slugs[1], v_slugs[1]])),
        pg_catalog.jsonb_build_object('label', 'unknown_tag', 'exp', 'invalid_hashtags', 'h', pg_catalog.to_jsonb(array[v_slugs[1], 'verify-no-such-tag'])),
        pg_catalog.jsonb_build_object('label', '6_images', 'exp', 'invalid_images', 'i', pg_catalog.to_jsonb(array_fill(v_u2, array[6]))),
        pg_catalog.jsonb_build_object('label', 'other_users_object', 'exp', 'invalid_images', 'i', pg_catalog.to_jsonb(array[v_ub])),
        -- The orphan is kanon's own image, not kA's, and nobody owns its object: refused on kA.
        pg_catalog.jsonb_build_object('label', 'other_kudos_unowned_image', 'exp', 'invalid_images', 'i', pg_catalog.to_jsonb(array[v_uo])),
        pg_catalog.jsonb_build_object('label', 'no_object', 'exp', 'invalid_images', 'i', pg_catalog.to_jsonb(array[v_base || pg_catalog.gen_random_uuid() || '.jpg'])),
        pg_catalog.jsonb_build_object('label', 'uid_folder_path', 'exp', 'invalid_images', 'i', pg_catalog.to_jsonb(array[v_base || v_a || '/' || v_n2])),
        pg_catalog.jsonb_build_object('label', 'dup_url', 'exp', 'invalid_images', 'i', pg_catalog.to_jsonb(array[v_u2, v_u2])),
        pg_catalog.jsonb_build_object('label', 'gif_ext', 'exp', 'invalid_images', 'i', pg_catalog.to_jsonb(array[pg_catalog.replace(v_u2, '.jpg', '.gif')])),
        pg_catalog.jsonb_build_object('label', 'js_prefix', 'exp', 'invalid_images', 'i', pg_catalog.to_jsonb(array['javascript:' || pg_catalog.substr(v_u2, 34)])),
        pg_catalog.jsonb_build_object('label', 'no_host', 'exp', 'invalid_images', 'i', pg_catalog.to_jsonb(array[pg_catalog.substr(v_u2, 34)])),
        pg_catalog.jsonb_build_object('label', 'null_image', 'exp', 'invalid_images', 'i', pg_catalog.to_jsonb(array[null::text])),
        pg_catalog.jsonb_build_object('label', 'alias_on_named_blank', 'exp', 'invalid_alias', 'n', ''),
        pg_catalog.jsonb_build_object('label', 'alias_on_named', 'exp', 'invalid_alias', 'n', 'Ninja'),
        pg_catalog.jsonb_build_object('label', 'alias_51', 'exp', 'invalid_alias', 'id', v_kanon, 'i', pg_catalog.to_jsonb(array[v_uo]),
                                      'n', pg_catalog.repeat('n', 51))] loop
      v_case := v_ok_case || v_case;
      v_res := pg_temp.verify_update_kudo_call(v_ca, (v_case ->> 'id')::uuid, v_case ->> 't', v_case ->> 'c',
        case when pg_catalog.jsonb_typeof(v_case -> 'h') = 'array'
             then array(select pg_catalog.jsonb_array_elements_text(v_case -> 'h')) end,
        case when pg_catalog.jsonb_typeof(v_case -> 'i') = 'array'
             then array(select pg_catalog.jsonb_array_elements_text(v_case -> 'i')) end,
        v_case ->> 'n', v_self);
      if v_res <> '22023:' || (v_case ->> 'exp') then
        v_txt := coalesce(v_txt || '; ', '') || (v_case ->> 'label') || '=' || v_res;
      end if;
    end loop;
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'U7 25 invalid inputs -> 22023 + exact code, in check order; no partial write',
      'ok', v_txt is null and pg_temp.verify_update_kudo_state(v_ka) = v_s0,
      'detail', coalesce('bad: ' || v_txt, 'ok')));

    -- U8. Wrong domain / non-Google / no claims: forbidden, before the ownership lookup (also for the caller's own Kudo).
    v_r := array[]::text[];
    foreach v_txt in array array[
        pg_catalog.jsonb_build_object('sub', v_a, 'role', 'authenticated',
          'email', 'verify-update-a@gmail.com', 'app_metadata', v_meta)::text,
        pg_catalog.jsonb_build_object('sub', v_a, 'role', 'authenticated',
          'email', 'verify-update-a@sun-asterisk.com', 'app_metadata', '{"provider":"email"}'::jsonb)::text,
        ''] loop
      v_r := v_r || pg_temp.verify_update_kudo_call(v_txt, v_ka, 'T', 'C', v_slugs[1:1], '{}', null, v_self);
    end loop;
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'U8 wrong domain / non-Google / no claims -> 22023 forbidden; Kudo untouched',
      'ok', v_r = array_fill('22023:forbidden'::text, array[3]) and pg_temp.verify_update_kudo_state(v_ka) = v_s0,
      'detail', pg_catalog.array_to_string(v_r, ' | ')));

    -- U9. anon cannot execute update_kudo.
    perform pg_catalog.set_config('request.jwt.claims', '', true);
    set local role anon;
    begin
      perform public.update_kudo(v_ka, 'T', 'C', v_slugs[1:1], '{}', null);
      v_res := 'executed';
    exception when others then v_res := sqlstate;
    end;
    execute pg_catalog.format('set local role %I', v_self);
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'U9 anon denied on update_kudo (42501)', 'ok', v_res = '42501', 'detail', v_res));

    raise exception 'verify-update-kudo-rollback';
  exception when others then
    if sqlerrm <> 'verify-update-kudo-rollback' then
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

select * from pg_temp.verify_update_kudo_rpc();
