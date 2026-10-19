-- Migration: write side of Sun* Kudos (#12 Write Kudo): Sunner search, create_kudo, image bucket.
-- Purpose : kudos_search_sunners (accent-insensitive name search + email substring search, name-only mode, blank = first Sunners; never
--           returns email, never the caller), create_kudo (the ONLY write path: sender is always auth.uid(), one transaction
--           kudos + kudo_hashtags + kudo_images), Storage bucket `kudo-images` (public read) with
--           owner-only policies (flat object names, no sender in the URL). Errors: SQLSTATE 22023 + short message code (invalid_recipient,
--           invalid_title, invalid_content, invalid_hashtags, invalid_images, invalid_alias,
--           forbidden) — mirrored by tests/e2e/support/write-kudo-fixtures.mjs, same check order.
--           Plan: plans/261019-1022-write-kudos/phase-02-track-b-database-write-rpc-and-storage.md
-- Prereq  : 20261012133000_create_profiles.sql, 20261015100000_create_kudos.sql.
-- How to run: paste this whole file into Supabase Dashboard > SQL Editor (role: postgres) and Run.
--           Idempotent; one transaction (all or nothing). The bucket row uses ON CONFLICT DO NOTHING,
--           so a re-run never resets limits edited later in the Dashboard.
-- Note    : create_kudo reads storage.objects as the function owner (postgres, BYPASSRLS on
--           Supabase); storage.objects.owner_id (text) is used, `owner` is deprecated upstream.
--           Object names are flat `{uuid}.{ext}` and never carry the sender: the public URL of an
--           anonymous Kudo's image must not identify who wrote it. Ownership lives in owner_id only.
--           Safe over the first version of this file: its `*_own_folder` policies are dropped below.
-- Verify  : supabase/verify/20261019110000_create_kudo_write_verify.sql (every row must be PASS)
-- Rollback: supabase/rollbacks/20261019110000_create_kudo_write_down.sql

begin;

-- 1. unaccent + immutable wrapper -------------------------------------------------
create extension if not exists unaccent with schema extensions;

-- `if not exists` is a no-op when unaccent already lives elsewhere (e.g. public); the wrapper
-- below hard-codes `extensions`, so fail loudly here instead of at the first search.
do $$
begin
  if not exists (select 1
                 from pg_catalog.pg_extension as e
                 join pg_catalog.pg_namespace as n on n.oid = e.extnamespace
                 where e.extname = 'unaccent' and n.nspname = 'extensions') then
    raise exception 'extension unaccent is installed outside schema "extensions"; move it first (alter extension unaccent set schema extensions)';
  end if;
end;
$$;

-- unaccent(regdictionary, text) is only STABLE; with the dictionary pinned the result is fixed,
-- so the wrapper may be IMMUTABLE (needed if a functional index is ever built on it).
create or replace function public.kudos_unaccent(p_text text)
returns text
language sql
immutable
strict
parallel safe
set search_path = ''
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, p_text);
$$;

-- 2. Sunner search ------------------------------------------------------------------
-- Caller must pass the account rule. Blank (or null) query -> the first Sunners that have a name, by
-- full_name then id ("@" alone in the app). Otherwise matches anywhere in the name, case- and
-- accent-insensitive ("nguyen" finds "Nguyễn"), OR anywhere in the email, case-insensitive
-- ("vu.thi.ngoc" and "vu.thi.ngoc@sun-asterisk.com" both find that Sunner). p_name_only ("@ + tên")
-- drops the email branch. The email is only a way to search: it is never in the result.
-- Order: exact email (not under p_name_only), then full_name, then id. % _ \ in the query are literal.
-- The first versions had no p_name_only: drop that signature so the two never coexist as overloads
-- (PostgREST could not choose between them). Re-running over this version drops nothing.
drop function if exists public.kudos_search_sunners(text, integer);

create or replace function public.kudos_search_sunners(
  p_query text,
  p_limit integer default 10,
  p_name_only boolean default false
)
returns table (id uuid, full_name text, avatar_url text, department text)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_jwt jsonb := auth.jwt();
  v_uid uuid := auth.uid();
  -- unaccent before lower: lower() on non-ASCII depends on the database ctype; ASCII never does.
  v_q text := pg_catalog.lower(public.kudos_unaccent(pg_catalog.btrim(p_query, E' \t\r\n')));
  v_name_only boolean := coalesce(p_name_only, false);
  v_limit integer := least(greatest(coalesce(p_limit, 10), 1), 10);
  v_like text; -- v_q with LIKE wildcards escaped
begin
  if v_uid is null
     or not coalesce(public.is_allowed_account(v_jwt ->> 'email', v_jwt -> 'app_metadata'), false) then
    return;
  end if;
  if v_q is null or v_q = '' then
    return query
      select p.id, p.full_name, p.avatar_url, p.department
      from public.profiles as p
      where p.id <> v_uid
        and pg_catalog.btrim(p.full_name) <> ''
      order by p.full_name, p.id
      limit v_limit;
    return;
  end if;
  v_like := pg_catalog.replace(pg_catalog.replace(pg_catalog.replace(v_q, '\', '\\'), '%', '\%'), '_', '\_');

  return query
    select p.id, p.full_name, p.avatar_url, p.department
    from public.profiles as p
    where p.id <> v_uid
      and (pg_catalog.lower(public.kudos_unaccent(p.full_name)) like '%' || v_like || '%' escape '\'
           or (not v_name_only and pg_catalog.lower(p.email) like '%' || v_like || '%' escape '\'))
    order by coalesce(not v_name_only and pg_catalog.lower(p.email) = v_q, false) desc, p.full_name, p.id
    limit v_limit;
end;
$$;

-- 3. create_kudo ----------------------------------------------------------------------
-- Checks run in this order; the first failure raises 22023 with its code. Text is trimmed of
-- space/tab/CR/LF (same as the app's trim for normal input).
create or replace function public.create_kudo(
  p_recipient_id uuid,
  p_title text,
  p_content text,
  p_hashtag_slugs text[],
  p_image_urls text[] default '{}',
  p_is_anonymous boolean default false,
  p_anonymous_name text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_ws constant text := E' \t\r\n';
  v_jwt jsonb := auth.jwt();
  v_uid uuid := auth.uid();
  v_title text := pg_catalog.btrim(p_title, v_ws);
  v_slugs text[] := coalesce(p_hashtag_slugs, '{}');
  v_urls text[] := coalesce(p_image_urls, '{}');
  v_anon boolean := coalesce(p_is_anonymous, false);
  v_alias text;
  v_url_re text;
  v_id uuid;
begin
  if v_uid is null
     or not coalesce(public.is_allowed_account(v_jwt ->> 'email', v_jwt -> 'app_metadata'), false) then
    raise exception 'forbidden' using errcode = '22023';
  end if;

  if p_recipient_id is null or p_recipient_id = v_uid
     or not exists (select 1 from public.profiles as p where p.id = p_recipient_id) then
    raise exception 'invalid_recipient' using errcode = '22023';
  end if;

  if v_title is null or pg_catalog.char_length(v_title) not between 1 and 100 then
    raise exception 'invalid_title' using errcode = '22023';
  end if;

  if p_content is null or pg_catalog.char_length(p_content) not between 1 and 5000
     or p_content !~ '[^[:space:]]' then
    raise exception 'invalid_content' using errcode = '22023';
  end if;

  -- 1..5 slugs, no duplicate (count(distinct) also drops nulls), all in the catalog (slug is unique).
  if pg_catalog.cardinality(v_slugs) not between 1 and 5
     or (select pg_catalog.count(distinct s) from pg_catalog.unnest(v_slugs) as s) <> pg_catalog.cardinality(v_slugs)
     or (select pg_catalog.count(*) from public.hashtags as h where h.slug = any (v_slugs))
        <> pg_catalog.cardinality(v_slugs) then
    raise exception 'invalid_hashtags' using errcode = '22023';
  end if;

  -- 0..5 distinct public URLs of objects the caller uploaded: flat name {uuid}.{jpg|png|webp}. There is
  -- deliberately NO uid in the name: for an anonymous Kudo the public image URL must not reveal the
  -- sender. Ownership is storage.objects.owner_id (Storage sets it from the JWT sub on upload), so
  -- another user's object, or a path with a folder segment, is refused. The scheme://host prefix is
  -- required (blocks javascript: etc.) but the host is not pinned: the database does not know the
  -- project URL. count(distinct) skips nulls, so a null element is refused here too.
  v_url_re := '^https?://[^/?#@[:space:]]+/storage/v1/object/public/kudo-images/[0-9a-f-]{36}\.(jpg|png|webp)$';
  if pg_catalog.cardinality(v_urls) > 5
     or (select pg_catalog.count(distinct u) from pg_catalog.unnest(v_urls) as u) <> pg_catalog.cardinality(v_urls)
     or exists (
       select 1
       from pg_catalog.unnest(v_urls) as u(url)
       where u.url is null
          or u.url !~ v_url_re
          or not exists (
               select 1 from storage.objects as o
               where o.bucket_id = 'kudo-images'
                 and o.name = pg_catalog.substring(u.url, '[0-9a-f-]{36}\.(?:jpg|png|webp)$')
                 and o.owner_id = v_uid::text)) then
    raise exception 'invalid_images' using errcode = '22023';
  end if;

  -- Alias only when anonymous (optional there; blank -> null, max 50).
  if not v_anon then
    if p_anonymous_name is not null then
      raise exception 'invalid_alias' using errcode = '22023';
    end if;
  else
    v_alias := nullif(pg_catalog.btrim(p_anonymous_name, v_ws), '');
    if pg_catalog.char_length(v_alias) > 50 then
      raise exception 'invalid_alias' using errcode = '22023';
    end if;
  end if;

  insert into public.kudos (sender_id, recipient_id, title, content, is_anonymous, anonymous_name)
  values (v_uid, p_recipient_id, v_title, p_content, v_anon, v_alias)
  returning id into v_id;

  insert into public.kudo_hashtags (kudo_id, hashtag_id)
  select v_id, h.id from public.hashtags as h where h.slug = any (v_slugs);

  insert into public.kudo_images (kudo_id, image_url, position)
  select v_id, u.url, u.ord::smallint
  from pg_catalog.unnest(v_urls) with ordinality as u(url, ord);

  return v_id;
end;
$$;

-- 4. Storage: bucket + owner-only policies ---------------------------------------------
-- Public read (board renders the URL directly); names are {random uuid}.{ext}: not guessable, flat and
-- free of the sender.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('kudo-images', 'kudo-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Ownership = storage.objects.owner_id (text). Storage writes it in the same INSERT as the row, taken
-- from the verified JWT sub, so an INSERT ... WITH CHECK can see it (storage-api createObject sets
-- owner_id with the row; Supabase docs, Storage > Security > Ownership, compare it as text:
-- owner_id = (select auth.uid()::text)). Uploads with the service key or from the Dashboard have a NULL
-- owner_id, so they match none of these policies; they bypass RLS and need none.
-- INSERT: upload as yourself only. DELETE: remove your own files (rollback of a failed create_kudo).
-- SELECT: your own files only — the Storage API deletes with `DELETE ... RETURNING *`, which under RLS
-- only sees rows a SELECT policy allows; without it remove() silently deletes nothing. Public URLs do
-- not go through RLS. No UPDATE policy (no upsert).

-- Names used by the first version of this migration (own-folder rules): replaced, not kept beside.
drop policy if exists "kudo_images_insert_own_folder" on storage.objects;
drop policy if exists "kudo_images_delete_own_folder" on storage.objects;
drop policy if exists "kudo_images_select_own_folder" on storage.objects;

drop policy if exists "kudo_images_insert_own" on storage.objects;
create policy "kudo_images_insert_own"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'kudo-images'
    and owner_id = (select auth.uid()::text)
    and (select public.is_allowed_account(
      (select auth.jwt()) ->> 'email', (select auth.jwt()) -> 'app_metadata')));

drop policy if exists "kudo_images_delete_own" on storage.objects;
create policy "kudo_images_delete_own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'kudo-images'
    and owner_id = (select auth.uid()::text)
    and (select public.is_allowed_account(
      (select auth.jwt()) ->> 'email', (select auth.jwt()) -> 'app_metadata')));

drop policy if exists "kudo_images_select_own" on storage.objects;
create policy "kudo_images_select_own"
  on storage.objects for select to authenticated
  using (bucket_id = 'kudo-images'
    and owner_id = (select auth.uid()::text)
    and (select public.is_allowed_account(
      (select auth.jwt()) ->> 'email', (select auth.jwt()) -> 'app_metadata')));

-- 5. Grants -------------------------------------------------------------------------------
-- The wrapper is only called inside the definer RPC (as its owner): nobody else needs it.
revoke execute on function public.kudos_unaccent(text) from public, anon, authenticated;
revoke execute on function public.kudos_search_sunners(text, integer, boolean) from public, anon;
revoke execute on function public.create_kudo(uuid, text, text, text[], text[], boolean, text) from public, anon;
grant execute on function public.kudos_search_sunners(text, integer, boolean) to authenticated;
grant execute on function public.create_kudo(uuid, text, text, text[], text[], boolean, text) to authenticated;

commit;
