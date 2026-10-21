-- Rollback for: supabase/migrations/20261021120000_create_kudo_detail_rpc.sql
-- Purpose : remove kudo_detail. Read-only RPC: no data changes. With it gone the View Kudo page
--           (/sun-kudos/{id}) shows its generic load error for every Kudo; the board is not affected.
-- How to run: paste this whole file into Supabase Dashboard > SQL Editor (role: postgres) and Run.
--           Safe to re-run. One transaction (all or nothing).

begin;

drop function if exists public.kudo_detail(uuid);

commit;
