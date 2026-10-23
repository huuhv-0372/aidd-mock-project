-- Rollback for: supabase/migrations/20261023100000_create_update_kudo_rpc.sql
-- Purpose : remove update_kudo. No data changes: edits already saved stay as they are. With it gone the Edit Kudo modal
--           shows its generic save error on every save; the board, View Kudo, Write Kudo and the profile are not affected.
-- How to run: paste this whole file into Supabase Dashboard > SQL Editor (role: postgres) and Run.
--           Safe to re-run. One transaction (all or nothing).

begin;

drop function if exists public.update_kudo(uuid, text, text, text[], text[], text);

commit;
