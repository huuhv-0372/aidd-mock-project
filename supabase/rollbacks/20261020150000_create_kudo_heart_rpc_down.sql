-- Rollback for: supabase/migrations/20261020150000_create_kudo_heart_rpc.sql
-- Purpose : remove set_kudo_heart. Hearts already given stay (kudo_hearts, its triggers and
--           kudos.heart_count belong to 20261015100000); with the RPC gone nobody can add or remove one.
-- How to run: paste this whole file into Supabase Dashboard > SQL Editor (role: postgres) and Run.
--           Safe to re-run. One transaction (all or nothing).

begin;

drop function if exists public.set_kudo_heart(uuid, boolean);

commit;
