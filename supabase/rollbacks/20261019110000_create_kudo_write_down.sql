-- Rollback for: supabase/migrations/20261019110000_create_kudo_write.sql
-- Purpose : remove create_kudo, kudos_search_sunners, the kudos_unaccent wrapper and the three
--           kudo-images policies on storage.objects (either generation of names); remove the kudo-images bucket ONLY when it
--           holds no object. Kudos already written stay (their tables belong to 20261015100000).
--           The unaccent extension stays (other code may use it).
-- How to run: paste this whole file into Supabase Dashboard > SQL Editor (role: postgres) and Run.
--           Safe to re-run. One transaction (all or nothing).
-- Bucket  : if images were uploaded, the bucket is kept (a NOTICE says so). Empty it first through
--           the Storage API or Dashboard (that also deletes the files, not just the rows), then
--           re-run this file. Storage blocks direct SQL deletes on its tables unless
--           storage.allow_delete_query is set, so it is set for this transaction only.

begin;

drop function if exists public.create_kudo(uuid, text, text, text[], text[], boolean, text);
-- Current signature (with p_name_only), then the one of the first versions of the migration.
drop function if exists public.kudos_search_sunners(text, integer, boolean);
drop function if exists public.kudos_search_sunners(text, integer);
drop function if exists public.kudos_unaccent(text);

-- Current owner-only names, then the names of the first version of the migration (own-folder rules).
drop policy if exists "kudo_images_insert_own" on storage.objects;
drop policy if exists "kudo_images_delete_own" on storage.objects;
drop policy if exists "kudo_images_select_own" on storage.objects;
drop policy if exists "kudo_images_insert_own_folder" on storage.objects;
drop policy if exists "kudo_images_delete_own_folder" on storage.objects;
drop policy if exists "kudo_images_select_own_folder" on storage.objects;

do $$
begin
  if exists (select 1 from storage.objects as o where o.bucket_id = 'kudo-images') then
    raise notice 'bucket kudo-images is not empty: kept. Empty it via the Storage API, then re-run.';
  else
    perform pg_catalog.set_config('storage.allow_delete_query', 'true', true);
    delete from storage.buckets where id = 'kudo-images';
  end if;
end;
$$;

commit;
