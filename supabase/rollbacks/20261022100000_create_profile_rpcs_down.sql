-- Rollback for: supabase/migrations/20261022100000_create_profile_rpcs.sql
-- Purpose : remove profile_card and kudos_profile_feed. Read-only RPCs: no data changes. With them gone the Profile
--           pages (/profile, /profile/{id}) show their generic load error (the feed alone fails as its own block);
--           the board and the View Kudo page are not affected.
-- How to run: paste this whole file into Supabase Dashboard > SQL Editor (role: postgres) and Run.
--           Safe to re-run. One transaction (all or nothing).

begin;

drop function if exists public.kudos_profile_feed(uuid, text, timestamptz, uuid, integer);
drop function if exists public.profile_card(uuid);

commit;
