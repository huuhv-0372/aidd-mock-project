-- Verification for: supabase/migrations/20261012133000_create_profiles.sql
-- How to run: Supabase Dashboard > SQL Editor (role: postgres). Select ONE numbered block at a
--           time and Run (the editor shows only the last result of a multi-statement run).
--           Checks 1-8 are read-only. Check 9 (optional) writes inside begin ... rollback.
-- If anything is wrong: supabase/rollbacks/20261012133000_create_profiles_down.sql
-- "Account rule" = public.is_allowed_account: @sun-asterisk.com email AND app_metadata.provider = google.

-- 1. RLS enabled. Expected: one row, rls_enabled = true
select c.relrowsecurity as rls_enabled
from pg_catalog.pg_class as c
where c.oid = 'public.profiles'::regclass;

-- 2. Policies. Expected: exactly one row:
--   profiles_select_allowed_domain | PERMISSIVE | {authenticated} | SELECT
--   | qual calls is_allowed_account(auth.jwt() ->> 'email', auth.jwt() -> 'app_metadata')
--   | uses_account_rule = true
select policyname, permissive, roles, cmd, qual,
       qual like '%is_allowed_account%' and qual like '%auth.jwt()%'
         and qual like '%''email''%' and qual like '%''app_metadata''%' as uses_account_rule
from pg_catalog.pg_policies
where schemaname = 'public' and tablename = 'profiles';

-- 3. Triggers. Expected: exactly three rows, enabled = 'O' each (function names may print
--    with or without a `public.` prefix depending on search_path):
--   on_auth_identity_upsert_profile   | AFTER INSERT OR UPDATE OF identity_data ON auth.identities
--     FOR EACH ROW WHEN ((new.provider = 'google'::text)) EXECUTE FUNCTION [public.]handle_auth_identity_profile()
--   on_auth_user_enforce_email_domain | BEFORE INSERT ON auth.users FOR EACH ROW
--     EXECUTE FUNCTION [public.]enforce_allowed_email_domain()
--   on_auth_user_upsert_profile       | AFTER INSERT OR UPDATE OF email ON auth.users FOR EACH ROW
--     EXECUTE FUNCTION [public.]handle_auth_user_profile()
select t.tgname, t.tgenabled as enabled, pg_catalog.pg_get_triggerdef(t.oid) as definition
from pg_catalog.pg_trigger as t
where t.tgrelid in ('auth.users'::regclass, 'auth.identities'::regclass)
  and not t.tgisinternal
  and t.tgname in ('on_auth_user_enforce_email_domain', 'on_auth_user_upsert_profile',
                   'on_auth_identity_upsert_profile')
order by t.tgname;

-- 4. Functions. Expected: five rows, config = {"search_path=\"\""} on all.
--    security_definer: true on the 3 trigger functions, false on is_allowed_email/_account.
--    domain_in_rule: true ONLY on is_allowed_email. provider_in_rule: true ONLY on is_allowed_account.
--    uses_account_rule: true on enforce_allowed_email_domain + both handle_* (gate and sync use it).
select p.proname, p.prosecdef as security_definer, p.proconfig as config,
       pg_catalog.pg_get_functiondef(p.oid) like '%@sun-asterisk.com%' as domain_in_rule,
       pg_catalog.pg_get_functiondef(p.oid) like '%''provider''%' as provider_in_rule,
       pg_catalog.pg_get_functiondef(p.oid) like '%is_allowed_account(new.email, new.raw_app_meta_data)%'
         or pg_catalog.pg_get_functiondef(p.oid) like '%is_allowed_account(u.email, u.raw_app_meta_data)%'
         as uses_account_rule
from pg_catalog.pg_proc as p
where p.oid in ('public.is_allowed_email(text)'::regprocedure,
                'public.is_allowed_account(text, jsonb)'::regprocedure,
                'public.enforce_allowed_email_domain()'::regprocedure,
                'public.handle_auth_user_profile()'::regprocedure,
                'public.handle_auth_identity_profile()'::regprocedure)
order by p.proname;

-- 5. Backfill + rule-only. Expected: allowed_users = profiles, missing = 0, non_rule_profiles = 0.
--    domain_non_google_users is informational: domain emails NOT created via Google (email/phone/
--    invite). Should be 0; if not, phase-03 step 2 says how to inspect and remove them.
select
  (select count(*) from auth.users as u
     where public.is_allowed_account(u.email, u.raw_app_meta_data)) as allowed_users,
  (select count(*) from public.profiles) as profiles,
  (select count(*) from auth.users as u
     where public.is_allowed_account(u.email, u.raw_app_meta_data)
       and not exists (select 1 from public.profiles as p where p.id = u.id)) as missing,
  (select count(*) from public.profiles as p join auth.users as u on u.id = p.id
     where not public.is_allowed_account(u.email, u.raw_app_meta_data)
        or not public.is_allowed_email(p.email)) as non_rule_profiles,
  (select count(*) from auth.users as u
     where public.is_allowed_email(u.email)
       and not public.is_allowed_account(u.email, u.raw_app_meta_data)) as domain_non_google_users;

-- 6. Table grants. Expected: anon_* all false; auth_select = true; other auth_* all false
select
  has_table_privilege('anon', 'public.profiles', 'select')            as anon_select,
  has_table_privilege('anon', 'public.profiles', 'insert')            as anon_insert,
  has_table_privilege('anon', 'public.profiles', 'update')            as anon_update,
  has_table_privilege('anon', 'public.profiles', 'delete')            as anon_delete,
  has_table_privilege('authenticated', 'public.profiles', 'select')   as auth_select,
  has_table_privilege('authenticated', 'public.profiles', 'insert')   as auth_insert,
  has_table_privilege('authenticated', 'public.profiles', 'update')   as auth_update,
  has_table_privilege('authenticated', 'public.profiles', 'delete')   as auth_delete,
  has_table_privilege('authenticated', 'public.profiles', 'truncate') as auth_truncate;

-- 7. Function EXECUTE for client roles. Expected: every column false except
--    domain_rule_auth = true and account_rule_auth = true (the RLS policy runs them as the user).
select
  has_function_privilege('anon', 'public.is_allowed_email(text)', 'execute')                      as domain_rule_anon,
  has_function_privilege('authenticated', 'public.is_allowed_email(text)', 'execute')             as domain_rule_auth,
  has_function_privilege('anon', 'public.is_allowed_account(text, jsonb)', 'execute')             as account_rule_anon,
  has_function_privilege('authenticated', 'public.is_allowed_account(text, jsonb)', 'execute')    as account_rule_auth,
  has_function_privilege('anon', 'public.enforce_allowed_email_domain()', 'execute')              as gate_anon,
  has_function_privilege('authenticated', 'public.enforce_allowed_email_domain()', 'execute')     as gate_auth,
  has_function_privilege('anon', 'public.handle_auth_user_profile()', 'execute')                  as user_sync_anon,
  has_function_privilege('authenticated', 'public.handle_auth_user_profile()', 'execute')         as user_sync_auth,
  has_function_privilege('anon', 'public.handle_auth_identity_profile()', 'execute')              as identity_sync_anon,
  has_function_privilege('authenticated', 'public.handle_auth_identity_profile()', 'execute')     as identity_sync_auth;

-- 8. Rule spot-check. Expected: allowed, upper, google_account = true; all others false
select
  public.is_allowed_email('an@sun-asterisk.com')         as allowed,
  public.is_allowed_email('AN@SUN-ASTERISK.COM')         as upper,
  public.is_allowed_email('an@evil-sun-asterisk.com')    as prefix_lookalike,
  public.is_allowed_email('an@sun-asterisk.com.evil.io') as suffix_lookalike,
  public.is_allowed_email('an@mail.sun-asterisk.com')    as subdomain,
  public.is_allowed_email('@sun-asterisk.com')           as empty_local,
  public.is_allowed_email(null)                          as missing,
  public.is_allowed_account('an@sun-asterisk.com', '{"provider":"google"}')   as google_account,
  public.is_allowed_account('an@sun-asterisk.com', '{"provider":"email"}')    as email_account,
  public.is_allowed_account('an@sun-asterisk.com', '{"providers":["google"]}') as providers_only,
  public.is_allowed_account('an@sun-asterisk.com', null)                      as no_metadata,
  public.is_allowed_account('an@gmail.com', '{"provider":"google"}')          as gmail_google;

-- 9. OPTIONAL trigger behaviour (writes, then ROLLBACK: nothing persists). Run the whole block
--    (begin ... rollback) in one go. Expected: "Success. No rows returned"; any failure raises
--    an exception naming the step. If it fails with "permission denied" on auth.users/identities,
--    skip it: phase-03 step 3 (real-login tests) covers the same behaviour.
--    now() is fixed per transaction, so "row rewritten or not" is judged by the tuple's ctid.
begin;
do $$
declare
  v_id     uuid;
  v_ident  text;  -- auth.identities.id as text (type-agnostic)
  v_data   jsonb;
  v_before public.profiles%rowtype;
  v_after  public.profiles%rowtype;
  v_ctid   tid;
begin
  select u.id, gi.id::text, gi.identity_data into v_id, v_ident, v_data
  from auth.users as u
  join auth.identities as gi on gi.user_id = u.id and gi.provider = 'google'
  where public.is_allowed_account(u.email, u.raw_app_meta_data)
  order by u.created_at, gi.updated_at desc nulls last
  limit 1;
  if v_id is null then raise exception 'no allowed Google user to test with'; end if;

  select * into v_before from public.profiles where id = v_id;
  if not found then raise exception 'no profile before test for user % (see check 5)', v_id; end if;
  update public.profiles set department = 'verify-temp-dept' where id = v_id;
  select * into v_before from public.profiles where id = v_id;

  -- a) changed identity_data -> name updated, updated_at advances, department/email kept
  update auth.identities set identity_data = v_data || '{"full_name":"verify-temp-name"}'::jsonb
  where id::text = v_ident;
  select * into v_after from public.profiles where id = v_id;
  if v_after.full_name is distinct from 'verify-temp-name'
     or v_after.avatar_url is distinct from coalesce(v_data ->> 'avatar_url', v_data ->> 'picture')
     or v_after.email is distinct from v_before.email
     or v_after.department is distinct from 'verify-temp-dept'
     or v_after.created_at is distinct from v_before.created_at
     or not (v_after.updated_at > v_before.updated_at) then
    raise exception 'step a (identity change) failed for user %', v_id;
  end if;

  -- b) unchanged identity_data -> IS DISTINCT FROM guard: row not rewritten
  select ctid into v_ctid from public.profiles where id = v_id;
  update auth.identities set identity_data = identity_data where id::text = v_ident;
  if (select ctid from public.profiles where id = v_id) is distinct from v_ctid then
    raise exception 'step b (identity no-op rewrote the row) failed for user %', v_id;
  end if;

  -- c) unchanged email -> guard: row not rewritten
  update auth.users set email = email where id = v_id;
  if (select ctid from public.profiles where id = v_id) is distinct from v_ctid then
    raise exception 'step c (email no-op rewrote the row) failed for user %', v_id;
  end if;

  -- d) changed allowed email -> synced, department kept
  update auth.users set email = 'verify-temp-' || email where id = v_id;
  select * into v_after from public.profiles where id = v_id;
  if v_after.email is distinct from 'verify-temp-' || v_before.email
     or v_after.department is distinct from 'verify-temp-dept' then
    raise exception 'step d (email change) failed for user %', v_id;
  end if;

  -- e) non-domain email -> skipped (profile keeps the last allowed email)
  update auth.users set email = 'verify-temp@example.com' where id = v_id;
  if (select email from public.profiles where id = v_id) is distinct from v_after.email then
    raise exception 'step e (non-domain email synced) failed for user %', v_id;
  end if;

  -- f) gate: a domain email signing up via the Email provider is rejected
  begin
    insert into auth.users (id, email, raw_app_meta_data)
    values (pg_catalog.gen_random_uuid(), 'verify-temp-gate@sun-asterisk.com',
            '{"provider":"email","providers":["email"]}');
    raise exception 'step f (gate let a non-Google signup through)';
  exception when raise_exception then
    if sqlerrm <> 'sign-up not allowed' then raise; end if;
  end;
end;
$$;
rollback;

-- 10. Re-run check (manual): run the migration file again in full.
-- Expected: "Success", no errors; then check 5 returns the same counts as before.
