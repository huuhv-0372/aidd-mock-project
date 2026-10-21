-- Verification for: supabase/migrations/20261021120000_create_kudo_detail_rpc.sql
-- How to run: Supabase Dashboard > SQL Editor (role: postgres). Paste this WHOLE file and Run.
--           The last statement prints one row per check. Expected: every row result = PASS.
--           Safe to re-run any time: behaviour checks create throw-away users and Kudos, then raise inside a
--           sub-block, so EVERY write is rolled back (only session-local pg_temp functions remain, gone when
--           the session ends).
--           Behaviour checks impersonate `authenticated` / `anon` with `set local role` and fake JWT
--           claims in `request.jwt.claims` (what PostgREST does per request).
-- If a row FAILs: read `detail`; to undo the migration use
--           supabase/rollbacks/20261021120000_create_kudo_detail_rpc_down.sql

-- One kudo_detail call as `authenticated` with the given claims: the rows as a jsonb array, or 'sqlstate:message'.
create or replace function pg_temp.verify_kudo_detail_call(p_claims text, p_id uuid, p_self text)
returns jsonb
language plpgsql
as $$
declare
  v_res jsonb;
begin
  perform pg_catalog.set_config('request.jwt.claims', p_claims, true);
  set local role authenticated;
  begin
    select coalesce(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(d)), '[]'::jsonb) into v_res
    from public.kudo_detail(p_id) as d;
  exception when others then v_res := pg_catalog.to_jsonb(sqlstate || ':' || sqlerrm);
  end;
  execute pg_catalog.format('set local role %I', p_self);
  return v_res;
end;
$$;

create or replace function pg_temp.verify_kudo_detail_rpc()
returns table (no integer, check_name text, result text, detail text)
language plpgsql
as $$
#variable_conflict use_column
declare
  v_out   jsonb := '[]'::jsonb;
  v_fn    constant text := 'public.kudo_detail(uuid)';
  v_meta  constant jsonb := '{"provider":"google","providers":["google"]}';
  v_self  constant text := current_user;  -- role to switch back to after impersonating
  v_a uuid := pg_catalog.gen_random_uuid();  -- sender of both Kudos
  v_b uuid := pg_catalog.gen_random_uuid();  -- viewer
  v_c uuid := pg_catalog.gen_random_uuid();  -- recipient of both Kudos
  v_ca text; v_cb text;
  v_k1 uuid; v_k2 uuid;
  v_rows jsonb; v_rows_a jsonb; v_r text[]; v_txt text; v_ok boolean; v_n bigint;
begin
  -- D1. Definer, empty search_path, stable, account rule, owner bypasses RLS (reads closed tables);
  --     exactly (p_id uuid) -> SETOF public.kudo_row; EXECUTE for authenticated only (no PUBLIC, no anon).
  select pg_catalog.count(*) into v_n
  from pg_catalog.pg_proc as pr
  join pg_catalog.pg_roles as r on r.oid = pr.proowner
  where pr.oid = pg_catalog.to_regprocedure(v_fn)
    and pr.prosecdef and pr.proconfig = array['search_path=""'] and pr.provolatile = 's'
    and pg_catalog.pg_get_functiondef(pr.oid) like '%public.is_allowed_account(%'
    and (r.rolbypassrls or r.rolsuper)
    and pg_catalog.pg_get_function_identity_arguments(pr.oid) = 'p_id uuid'
    and pr.proretset and pr.prorettype = pg_catalog.to_regtype('public.kudo_row')
    and not exists (select 1 from pg_catalog.aclexplode(pr.proacl) as a
                    where a.grantee = 0 and a.privilege_type = 'EXECUTE');
  v_ok := false;
  if v_n = 1 then  -- has_function_privilege raises when the function does not exist
    v_ok := pg_catalog.has_function_privilege('authenticated', v_fn, 'execute')
      and not pg_catalog.has_function_privilege('anon', v_fn, 'execute');
  end if;
  v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
    'name', 'D1 kudo_detail: definer + search_path + stable + account rule + signature; execute authenticated only',
    'ok', coalesce(v_ok, false), 'detail', 'match=' || v_n));

  -- Behaviour: fixtures + impersonation; everything is rolled back at the end of the block.
  begin
    insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, created_at, updated_at)
    select x.id, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated',
           x.email, v_meta, pg_catalog.now(), pg_catalog.now()
    from (values (v_a, 'verify-kudo-detail-a@sun-asterisk.com'), (v_b, 'verify-kudo-detail-b@sun-asterisk.com'),
                 (v_c, 'verify-kudo-detail-c@sun-asterisk.com')) as x(id, email);
    insert into public.profiles (id, email)
    values (v_a, 'verify-kudo-detail-a@sun-asterisk.com'), (v_b, 'verify-kudo-detail-b@sun-asterisk.com'),
           (v_c, 'verify-kudo-detail-c@sun-asterisk.com')
    on conflict (id) do nothing;
    insert into public.kudos (sender_id, recipient_id, title, content)
    values (v_a, v_c, 'VERIFY DETAIL', 'verify detail **k1**') returning id into v_k1;
    insert into public.kudos (sender_id, recipient_id, title, content, is_anonymous, anonymous_name)
    values (v_a, v_c, 'VERIFY DETAIL', 'verify detail k2', true, 'Verify alias') returning id into v_k2;
    v_ca := pg_catalog.jsonb_build_object('sub', v_a, 'role', 'authenticated',
      'email', 'verify-kudo-detail-a@sun-asterisk.com', 'app_metadata', v_meta)::text;
    v_cb := pg_catalog.jsonb_build_object('sub', v_b, 'role', 'authenticated',
      'email', 'verify-kudo-detail-b@sun-asterisk.com', 'app_metadata', v_meta)::text;

    -- D2. B reads A's named Kudo: exactly one row with the content, sender A, recipient C, not B's own.
    v_rows := pg_temp.verify_kudo_detail_call(v_cb, v_k1, v_self);
    v_ok := pg_catalog.jsonb_typeof(v_rows) = 'array' and pg_catalog.jsonb_array_length(v_rows) = 1
      and v_rows -> 0 ->> 'id' = v_k1::text and v_rows -> 0 ->> 'content' = 'verify detail **k1**'
      and v_rows -> 0 -> 'sender' ->> 'id' = v_a::text and v_rows -> 0 -> 'recipient' ->> 'id' = v_c::text
      and not (v_rows -> 0 ->> 'is_mine')::boolean;
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'D2 named Kudo: 1 row, content, sender, recipient, is_mine = false',
      'ok', coalesce(v_ok, false), 'detail', pg_catalog.left(v_rows::text, 300)));

    -- D3. Anonymous Kudo: sender null for any viewer (B, and A the real sender), alias kept, and A's id
    --     appears NOWHERE in the row; is_mine is true only for A.
    v_rows := pg_temp.verify_kudo_detail_call(v_cb, v_k2, v_self);
    v_rows_a := pg_temp.verify_kudo_detail_call(v_ca, v_k2, v_self);
    v_ok := pg_catalog.jsonb_typeof(v_rows) = 'array' and pg_catalog.jsonb_array_length(v_rows) = 1
      and pg_catalog.jsonb_typeof(v_rows_a) = 'array' and pg_catalog.jsonb_array_length(v_rows_a) = 1
      and v_rows -> 0 -> 'sender' = 'null'::jsonb and v_rows_a -> 0 -> 'sender' = 'null'::jsonb
      and (v_rows -> 0 ->> 'is_anonymous')::boolean and v_rows -> 0 ->> 'anonymous_name' = 'Verify alias'
      and pg_catalog.strpos(v_rows::text, v_a::text) = 0
      and not (v_rows -> 0 ->> 'is_mine')::boolean and (v_rows_a -> 0 ->> 'is_mine')::boolean;
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'D3 anonymous Kudo: sender null (viewer and sender), sender id nowhere in the row, alias kept',
      'ok', coalesce(v_ok, false), 'detail', pg_catalog.left(v_rows::text, 300)));

    -- D4. Unknown id, null id -> 0 rows (not an error).
    v_r := array[pg_temp.verify_kudo_detail_call(v_cb, pg_catalog.gen_random_uuid(), v_self)::text,
                 pg_temp.verify_kudo_detail_call(v_cb, null, v_self)::text];
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'D4 unknown id / null id -> 0 rows',
      'ok', v_r = array['[]', '[]'], 'detail', pg_catalog.array_to_string(v_r, ' | ')));

    -- D5. Refused callers (wrong domain, non-Google, no claims) -> 0 rows, never an error or the row.
    v_r := array[
      pg_temp.verify_kudo_detail_call(pg_catalog.jsonb_build_object('sub', v_b, 'role', 'authenticated',
        'email', 'verify-kudo-detail-b@gmail.com', 'app_metadata', v_meta)::text, v_k1, v_self)::text,
      pg_temp.verify_kudo_detail_call(pg_catalog.jsonb_build_object('sub', v_b, 'role', 'authenticated',
        'email', 'verify-kudo-detail-b@sun-asterisk.com', 'app_metadata', '{"provider":"email"}'::jsonb)::text,
        v_k1, v_self)::text,
      pg_temp.verify_kudo_detail_call('', v_k1, v_self)::text];
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'D5 wrong domain / non-Google / no claims -> 0 rows',
      'ok', v_r = array['[]', '[]', '[]'], 'detail', pg_catalog.array_to_string(v_r, ' | ')));

    -- D1b. anon cannot execute the RPC.
    perform pg_catalog.set_config('request.jwt.claims', '', true);
    set local role anon;
    begin
      perform public.kudo_detail(v_k1);
      v_txt := 'executed';
    exception when others then v_txt := sqlstate;
    end;
    execute pg_catalog.format('set local role %I', v_self);
    v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', 'D1b anon denied on kudo_detail (42501)', 'ok', v_txt = '42501', 'detail', v_txt));

    raise exception 'verify-kudo-detail-rollback';
  exception when others then
    if sqlerrm <> 'verify-kudo-detail-rollback' then
      v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
        'name', 'D* behaviour block aborted', 'ok', false, 'detail', sqlstate || ' ' || sqlerrm));
    end if;
  end;

  return query
    select e.ord::integer, e.value ->> 'name',
           case when coalesce((e.value ->> 'ok')::boolean, false) then 'PASS' else 'FAIL' end,
           e.value ->> 'detail'
    from pg_catalog.jsonb_array_elements(v_out) with ordinality as e(value, ord);
end;
$$;

select * from pg_temp.verify_kudo_detail_rpc();
