-- Rollback for: supabase/migrations/20261024100000_create_admin_users.sql
-- Purpose : remove admin_set_user_role, admin_list_users, is_admin and the profiles.role column (with its check).
-- CAUTION : DATA LOSS: every admin role assigned so far is gone (everybody is a plain user again). Re-running the
--           migration later does NOT restore them; assign them again by hand:
--             update public.profiles set role = 'admin' where email = '<owner>@sun-asterisk.com';
--           With the functions gone, /admin answers 403 to everyone (is_admin fails -> false) and the account menu hides
--           Dashboard; the rest of the app is not affected. Dropping the column takes a brief ACCESS EXCLUSIVE lock on
--           public.profiles (written by every sign-in): run it off-peak.
-- How to run: paste this whole file into Supabase Dashboard > SQL Editor (role: postgres) and Run.
--           Safe to re-run. One transaction (all or nothing).

begin;

drop function if exists public.admin_set_user_role(uuid, text);
drop function if exists public.admin_list_users(text, smallint, text, text, text, text, integer, integer);
drop function if exists public.is_admin();

alter table public.profiles drop constraint if exists profiles_role_known;
alter table public.profiles drop column if exists role;

commit;
