-- Migration: edit a Kudo the caller sent (#19 Sửa Kudo): update_kudo.
-- Purpose : the ONLY edit path. Sender-only: the Kudo must exist AND be the caller's (sender_id = auth.uid()); a
--           missing Kudo and another user's Kudo get the same 'not_found' (never reveals that a Kudo exists). Changes
--           title, content and the alias (anonymous Kudo only), and REPLACES the hashtags and the images (positions
--           1..n in the given order). Never touches sender_id, recipient_id, is_anonymous, created_at, heart_count.
--           Returns the image URLs the Kudo dropped and no Kudo holds any more: the app deletes those from Storage
--           after this transaction committed (owner-only policies of 20261019110000_create_kudo_write.sql).
--           Errors: SQLSTATE 22023 + short message code, checked in this order: forbidden, not_found, invalid_title,
--           invalid_content, invalid_hashtags, invalid_images, invalid_alias. Title/content/hashtag/image rules are
--           create_kudo's; an image is also valid when it is already one of this Kudo's images. Mirrored by
--           tests/e2e/support/write-kudo-fixtures.mjs (updateKudo).
--           Plan: plans/261022-edit-kudo/plan.md (phase 02b)
-- Prereq  : 20261012133000_create_profiles.sql (is_allowed_account), 20261015100000_create_kudos.sql,
--           20261019110000_create_kudo_write.sql (kudo-images bucket, create_kudo).
-- How to run: paste this whole file into Supabase Dashboard > SQL Editor (role: postgres) and Run.
--           Idempotent; one transaction (all or nothing).
-- Note    : the Kudo row is locked (`for update`) before any check, so two edits of one Kudo run one after the
--           other and a heart added meanwhile waits for the edit (heart_count is never written here).
-- Verify  : supabase/verify/20261023100000_create_update_kudo_rpc_verify.sql (every row must be PASS)
-- Rollback: supabase/rollbacks/20261023100000_create_update_kudo_rpc_down.sql

begin;

create or replace function public.update_kudo(
  p_id uuid,
  p_title text,
  p_content text,
  p_hashtag_slugs text[],
  p_image_urls text[] default '{}',
  p_anonymous_name text default null
)
returns text[]
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_ws constant text := E' \t\r\n';
  -- Same public URL shape as create_kudo: flat {uuid}.{ext} in kudo-images, no uid in the name.
  v_url_re constant text := '^https?://[^/?#@[:space:]]+/storage/v1/object/public/kudo-images/[0-9a-f-]{36}\.(jpg|png|webp)$';
  v_jwt jsonb := auth.jwt();
  v_uid uuid := auth.uid();
  v_title text := pg_catalog.btrim(p_title, v_ws);
  v_slugs text[] := coalesce(p_hashtag_slugs, '{}');
  v_urls text[] := coalesce(p_image_urls, '{}');
  v_anon boolean;
  v_alias text;
  v_old text[];
begin
  if v_uid is null
     or not coalesce(public.is_allowed_account(v_jwt ->> 'email', v_jwt -> 'app_metadata'), false) then
    raise exception 'forbidden' using errcode = '22023';
  end if;

  -- Ownership before any field check: another user's Kudo answers exactly like a missing one, whatever the input.
  select k.is_anonymous into v_anon
  from public.kudos as k
  where k.id = p_id and k.sender_id = v_uid
  for update;
  if not found then
    raise exception 'not_found' using errcode = '22023';
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

  select coalesce(pg_catalog.array_agg(i.image_url order by i.position), '{}') into v_old
  from public.kudo_images as i
  where i.kudo_id = p_id;

  -- 0..5 distinct URLs of the create_kudo shape; each one is already an image of THIS Kudo (kept) or an object the
  -- caller uploaded (storage.objects.owner_id, as create_kudo). Another user's object, or an image of another Kudo
  -- that the caller does not own, is refused. count(distinct) skips nulls, so a null element is refused too.
  if pg_catalog.cardinality(v_urls) > 5
     or (select pg_catalog.count(distinct u) from pg_catalog.unnest(v_urls) as u) <> pg_catalog.cardinality(v_urls)
     or exists (
       select 1
       from pg_catalog.unnest(v_urls) as u(url)
       where u.url is null
          or u.url !~ v_url_re
          or (not (u.url = any (v_old))
              and not exists (
                select 1 from storage.objects as o
                where o.bucket_id = 'kudo-images'
                  and o.name = pg_catalog.substring(u.url, '[0-9a-f-]{36}\.(?:jpg|png|webp)$')
                  and o.owner_id = v_uid::text))) then
    raise exception 'invalid_images' using errcode = '22023';
  end if;

  -- Alias only on an anonymous Kudo (optional there; blank -> null, max 50). The anonymous state itself never changes.
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

  update public.kudos as k
  set title = v_title, content = p_content, anonymous_name = v_alias
  where k.id = p_id;

  delete from public.kudo_hashtags as kh where kh.kudo_id = p_id;
  insert into public.kudo_hashtags (kudo_id, hashtag_id)
  select p_id, h.id from public.hashtags as h where h.slug = any (v_slugs);

  delete from public.kudo_images as i where i.kudo_id = p_id;
  insert into public.kudo_images (kudo_id, image_url, position)
  select p_id, u.url, u.ord::smallint
  from pg_catalog.unnest(v_urls) with ordinality as u(url, ord);

  -- Dropped images in their old order. One another Kudo still shows (create_kudo accepts any object the caller owns)
  -- is left out, so the app never deletes an image that is still on the board.
  return array(
    select o.url
    from pg_catalog.unnest(v_old) with ordinality as o(url, ord)
    where not (o.url = any (v_urls))
      and not exists (select 1 from public.kudo_images as i where i.image_url = o.url)
    order by o.ord);
end;
$$;

revoke execute on function public.update_kudo(uuid, text, text, text[], text[], text) from public, anon;
grant execute on function public.update_kudo(uuid, text, text, text[], text[], text) to authenticated;

commit;
