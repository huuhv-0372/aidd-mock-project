-- Cleanup for: supabase/seed/20261015_kudos_demo_seed.sql
-- Purpose : remove every row the demo seed added, then the seed can be run again.
--           Deleting the demo auth users cascades to their profiles, and from there to every Kudo
--           they sent or received (including the seed Kudos with real profiles), their hashtags,
--           images and hearts, their secret boxes and gift awards. The heart trigger keeps
--           heart_count right on Kudos that survive. Secret boxes the seed gave REAL profiles are
--           not tied to a demo user, so they are deleted by their seed ids first.
--           Real users, their profiles, and anything they created themselves stay untouched.
-- How to run: paste this whole file into Supabase Dashboard > SQL Editor (role: postgres) and Run.
--           Safe to re-run. One transaction. The last statement prints what is left (all 0).

begin;

delete from public.secret_boxes as b
using public.profiles as p, generate_series(1, 2) as g(bn)
where b.id = md5('kudos-demo-real-box-' || p.id || '-' || g.bn)::uuid;

delete from auth.users
where raw_app_meta_data ->> 'seed' = 'kudos-demo';

commit;

-- Expected: every column = 0.
select
  (select count(*) from auth.users where raw_app_meta_data ->> 'seed' = 'kudos-demo') as demo_users_left,
  (select count(*) from public.profiles where email like 'demo.sunner__@sun-asterisk.com') as demo_profiles_left,
  (select count(*) from public.kudos as k
     where k.id in (select md5('kudos-demo-kudo-' || g.n)::uuid from generate_series(1, 60) as g(n))
        or k.id in (select md5('kudos-demo-real-' || p.id || '-' || j.jn)::uuid
                    from public.profiles as p cross join generate_series(1, 3) as j(jn))) as demo_kudos_left,
  (select count(*) from public.secret_boxes as b
     where b.id in (select md5('kudos-demo-real-box-' || p.id || '-' || g.bn)::uuid
                    from public.profiles as p cross join generate_series(1, 2) as g(bn))) as demo_real_boxes_left;
