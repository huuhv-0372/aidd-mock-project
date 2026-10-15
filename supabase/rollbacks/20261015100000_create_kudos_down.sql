-- Rollback for: supabase/migrations/20261015100000_create_kudos.sql
-- Purpose : remove the Kudos RPCs, helpers, row type, heart triggers and the 10 Kudos tables
--           (their policies, indexes and triggers go with them), and the FK + index the migration
--           put on public.profiles. DELETES ALL Kudos data (kudos, hearts, boxes, gift awards).
--           profiles.department (the column and any values in it) and the sign-in triggers/functions
--           of 20261012133000_create_profiles.sql are left untouched, so sign-in keeps working.
-- How to run: paste this whole file into Supabase Dashboard > SQL Editor (role: postgres) and Run.
--           Safe to re-run. One transaction (all or nothing). No CASCADE: if a later migration
--           built on these objects, this fails loudly instead of dropping that work too — roll
--           that migration back first. Takes a brief ACCESS EXCLUSIVE lock on public.profiles.
-- Demo data: running this also removes demo Kudos; demo auth users stay until
--           supabase/seed/kudos_demo_seed_cleanup.sql is run (run the cleanup BEFORE this file).

begin;

-- RPCs first (they use the row type and the helpers).
drop function if exists public.kudos_feed(text, text, timestamptz, uuid, integer);
drop function if exists public.kudos_highlight(text, text);
drop function if exists public.kudos_spotlight();
drop function if exists public.kudos_my_stats();
drop function if exists public.kudos_latest_gift_recipients(integer);

drop function if exists public.kudos_rows(uuid[], uuid);
drop function if exists public.kudo_matches_filters(uuid, uuid, text, text);
drop function if exists public.kudos_person_json(uuid);
drop type if exists public.kudo_row;

-- profiles keeps its column; only the FK to departments and its index go.
alter table public.profiles drop constraint if exists profiles_department_fkey;
drop index if exists public.profiles_department_idx;

-- Children before parents. Dropping a table also drops its triggers, policies and indexes.
drop table if exists public.gift_awards;
drop table if exists public.gifts;
drop table if exists public.secret_boxes;
drop table if exists public.special_heart_days;
drop table if exists public.kudo_hearts;
drop table if exists public.kudo_images;
drop table if exists public.kudo_hashtags;
drop table if exists public.kudos;
drop table if exists public.hashtags;
drop table if exists public.departments;

-- Last: the kudo_hearts triggers used them (gone with the table above).
drop function if exists public.kudo_hearts_set_awarded();
drop function if exists public.kudo_hearts_sync_count();

commit;
