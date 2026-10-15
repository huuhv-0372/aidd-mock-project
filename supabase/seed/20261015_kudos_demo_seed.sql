-- Seed: Sun* Kudos demo data. DEMO / STAGING ENVIRONMENTS ONLY — NEVER RUN ON PRODUCTION.
-- Purpose : fill the live board: 20 demo Sunners (demo.sunner01..20@sun-asterisk.com), 60 Kudos
--           over the last ~28 days with hashtags, photos and hearts, secret boxes, 12 gift awards;
--           plus 2 received + 1 sent Kudo, hearts and 2 secret boxes for EVERY real profile, so
--           personal stats are not all zero.
-- Demo users are auth.users rows with app_metadata {"provider":"google","seed":"kudos-demo"}, no
--           password and no identity: nobody can sign in as them. The sign-in gate admits them
--           (domain + google) and the profile trigger creates their profiles.
-- Prereq  : supabase/migrations/20261015100000_create_kudos.sql; images under
--           public/images/kudos/demo/ (avatar-01..04.png, kudo-photo-01..05.jpg).
-- How to run: paste this whole file into Supabase Dashboard > SQL Editor (role: postgres) and Run.
--           Idempotent (fixed ids from md5(label), ON CONFLICT DO NOTHING): a re-run adds only what
--           is missing, e.g. rows for real profiles created since the last run. One transaction.
--           The last statement prints a summary row.
-- Undo    : supabase/seed/kudos_demo_seed_cleanup.sql (removes every row added here).

begin;

-- 1. Demo users ------------------------------------------------------------------
create temp table kudos_demo_users on commit drop as
select v.idx,
       md5('kudos-demo-user-' || v.idx)::uuid as id,
       'demo.sunner' || lpad(v.idx::text, 2, '0') || '@sun-asterisk.com' as email,
       v.full_name,
       '/images/kudos/demo/avatar-0' || ((v.idx - 1) % 4 + 1) || '.png' as avatar_url,
       (array['CEVC1', 'CEVC2', 'CEVC3', 'CEVC4', 'STVC - R&D', 'OPDC - HRF', 'FCOV', 'GEU', 'PAO',
              'BDV'])[(v.idx - 1) % 10 + 1] as department
from (values
  (1, 'Nguyễn Hoàng Anh'), (2, 'Trần Minh Châu'), (3, 'Lê Thu Hà'), (4, 'Phạm Quốc Bảo'),
  (5, 'Huỳnh Dương Xuân'), (6, 'Vũ Ngọc Lan'), (7, 'Đặng Tuấn Kiệt'), (8, 'Bùi Thanh Tâm'),
  (9, 'Đỗ Khánh Linh'), (10, 'Hồ Đức Thịnh'), (11, 'Ngô Mai Phương'), (12, 'Dương Gia Huy'),
  (13, 'Lý Bảo Ngọc'), (14, 'Phan Văn Toàn'), (15, 'Trịnh Hải Yến'), (16, 'Mai Quang Vinh'),
  (17, 'Cao Thùy Dung'), (18, 'Tô Nhật Minh'), (19, 'Lâm Diệu Linh'), (20, 'Châu Thành Đạt')
) as v(idx, full_name);

insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, created_at, updated_at)
select u.id, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', u.email,
       '{"provider":"google","providers":["google"],"seed":"kudos-demo"}'::jsonb, now(), now()
from kudos_demo_users as u
on conflict (id) do nothing;

-- The profile trigger already created these; this only covers a missing trigger.
insert into public.profiles (id, email)
select u.id, u.email from kudos_demo_users as u
on conflict (id) do nothing;

update public.profiles as p
set full_name = u.full_name, avatar_url = u.avatar_url, department = u.department, updated_at = now()
from kudos_demo_users as u
where p.id = u.id
  and (p.full_name, p.avatar_url, p.department) is distinct from (u.full_name, u.avatar_url, u.department);

-- 2. Demo Kudos (n = 1..60). Recipients: everyone for n <= 36, then users 1-2 (Hero tiers/stars).
create temp table kudos_demo_text on commit drop as
select array['IDOL GIỚI TRẺ', 'NGƯỜI TRUYỀN LỬA', 'CHIẾN THẦN DEADLINE', 'NGÔI SAO ĐỒNG ĐỘI',
             'BẬC THẦY GIẢI PHÁP'] as titles,
       array['Cảm ơn bạn đã luôn hỗ trợ team hết mình trong suốt dự án vừa rồi. Nhờ có bạn mà mọi việc đều suôn sẻ!',
             'Bạn đã ở lại cùng team đến tận khuya để kịp release. Sự tận tâm của bạn là nguồn cảm hứng cho cả nhóm.',
             'Cảm ơn bạn đã kiên nhẫn hướng dẫn mình từng bước khi mình mới vào dự án. Mình học được rất nhiều từ bạn.',
             'Giải pháp bạn đề xuất đã giúp hệ thống chạy nhanh gấp đôi. Thật sự rất ấn tượng! Cảm ơn bạn đã luôn chủ động tìm cách làm tốt hơn, không ngại thử cái mới và chia sẻ kiến thức cho mọi người xung quanh.',
             'Khách hàng khen ngợi buổi demo hôm qua rất nhiều. Cảm ơn bạn đã chuẩn bị chu đáo đến từng chi tiết.',
             'Năng lượng tích cực của bạn làm cả văn phòng vui hơn mỗi ngày. Wasshoi!'] as contents;

insert into public.kudos (id, sender_id, recipient_id, title, content, is_anonymous, anonymous_name, created_at)
select md5('kudos-demo-kudo-' || g.n)::uuid, s.id, r.id,
       t.titles[g.n % 5 + 1], t.contents[g.n % 6 + 1],
       g.n % 9 = 0, case when g.n % 9 = 0 then 'Sunner ẩn danh' end,
       now() - make_interval(hours => g.n * 11, mins => g.n * 7)
from generate_series(1, 60) as g(n)
cross join kudos_demo_text as t
cross join lateral (
  select case when g.n <= 36 then g.n % 20 + 1 else g.n % 2 + 1 end as ridx,
         (g.n * 7 + 3) % 20 + 1 as sraw
) as c
join kudos_demo_users as r on r.idx = c.ridx
join kudos_demo_users as s on s.idx = case when c.sraw = c.ridx then c.sraw % 20 + 1 else c.sraw end
on conflict (id) do nothing;

-- 1-5 hashtags each (catalog order).
insert into public.kudo_hashtags (kudo_id, hashtag_id)
select x.kudo_id, x.hashtag_id
from (
  select md5('kudos-demo-kudo-' || g.n)::uuid as kudo_id, h.id as hashtag_id,
         row_number() over (partition by g.n order by h.sort_order) as rn
  from generate_series(1, 60) as g(n)
  cross join public.hashtags as h
  where (h.sort_order + g.n) % (case when g.n % 10 = 0 then 2 else 4 end) = 0
) as x
where x.rn <= 5
on conflict do nothing;

-- Photos on every 4th Kudo, 1-5 each.
insert into public.kudo_images (kudo_id, image_url, position)
select md5('kudos-demo-kudo-' || g.n)::uuid, '/images/kudos/demo/kudo-photo-0' || p.pos || '.jpg', p.pos
from generate_series(1, 60) as g(n)
cross join generate_series(1, 5) as p(pos)
where g.n % 4 = 0 and p.pos <= (g.n / 4) % 5 + 1
on conflict (kudo_id, position) do nothing;

-- Hearts from demo users (never the sender; x1/x2 decided by the trigger).
insert into public.kudo_hearts (kudo_id, user_id, created_at)
select k.id, u.id, k.created_at + make_interval(mins => u.idx * 13)
from generate_series(1, 60) as g(n)
join public.kudos as k on k.id = md5('kudos-demo-kudo-' || g.n)::uuid
join kudos_demo_users as u on u.id <> k.sender_id and (u.idx + g.n) % 7 < g.n % 5
on conflict (kudo_id, user_id) do nothing;

-- 3. Secret boxes (1-3 per demo user, the first one opened for even users) and gift awards.
insert into public.secret_boxes (id, owner_id, badge, opened_at, created_at)
select md5('kudos-demo-box-' || u.idx || '-' || b.bn)::uuid, u.id,
       case when b.bn = 1 and u.idx % 2 = 0 then (array['stay_gold', 'flow_to_horizon',
         'beyond_the_boundary', 'root_further', 'touch_of_light', 'revival'])[u.idx % 6 + 1] end,
       case when b.bn = 1 and u.idx % 2 = 0 then now() - make_interval(days => u.idx) end,
       now() - make_interval(days => u.idx + b.bn)
from kudos_demo_users as u
cross join generate_series(1, 3) as b(bn)
where b.bn <= u.idx % 3 + 1
on conflict (id) do nothing;

insert into public.gift_awards (id, recipient_id, gift_id, awarded_at)
select md5('kudos-demo-gift-' || u.idx)::uuid, u.id, gf.id, now() - make_interval(hours => u.idx * 9)
from kudos_demo_users as u
cross join public.gifts as gf
where u.idx <= 12 and gf.name_vi = '1 áo phông SAA'
on conflict (id) do nothing;

-- 4. Every real profile: 2 Kudos received + 1 sent (with a demo user), hearts, 2 boxes.
create temp table kudos_demo_real on commit drop as
select p.id, row_number() over (order by p.created_at, p.id) as rn
from public.profiles as p
join auth.users as au on au.id = p.id
where au.raw_app_meta_data ->> 'seed' is distinct from 'kudos-demo';

insert into public.kudos (id, sender_id, recipient_id, title, content, created_at)
select md5('kudos-demo-real-' || r.id || '-' || j.jn)::uuid,
       case when j.jn = 3 then r.id else s.id end,
       case when j.jn = 3 then s.id else r.id end,
       t.titles[j.jn], t.contents[j.jn + 2],
       now() - make_interval(hours => j.jn * 5, mins => r.rn::integer)
from kudos_demo_real as r
cross join generate_series(1, 3) as j(jn)
cross join kudos_demo_text as t
join kudos_demo_users as s on s.idx = case j.jn when 1 then (r.rn * 3) % 20 + 1
                                                when 2 then (r.rn * 3 + 7) % 20 + 1
                                                else (r.rn * 5 + 2) % 20 + 1 end
on conflict (id) do nothing;

insert into public.kudo_hashtags (kudo_id, hashtag_id)
select md5('kudos-demo-real-' || r.id || '-' || j.jn)::uuid, h.id
from kudos_demo_real as r
cross join generate_series(1, 3) as j(jn)
join public.hashtags as h on h.sort_order in (j.jn, j.jn + 5)
on conflict do nothing;

insert into public.kudo_hearts (kudo_id, user_id)
select md5('kudos-demo-real-' || r.id || '-3')::uuid, u.id
from kudos_demo_real as r
join kudos_demo_users as u on u.idx <= 4
on conflict (kudo_id, user_id) do nothing;

-- Not tied to a demo user, so the cleanup deletes these by their md5 ids.
insert into public.secret_boxes (id, owner_id, badge, opened_at)
select md5('kudos-demo-real-box-' || r.id || '-' || b.bn)::uuid, r.id,
       case when b.bn = 1 then 'stay_gold' end,
       case when b.bn = 1 then now() end
from kudos_demo_real as r
cross join generate_series(1, 2) as b(bn)
on conflict (id) do nothing;

commit;

-- Summary. Expected: demo_users = 20, kudos >= 60, recipients >= 20, heart_count_mismatch = 0.
select
  (select count(*) from auth.users where raw_app_meta_data ->> 'seed' = 'kudos-demo') as demo_users,
  (select count(*) from public.kudos) as kudos,
  (select count(distinct recipient_id) from public.kudos) as recipients,
  (select count(*) from public.kudo_hearts) as hearts,
  (select count(*) from public.gift_awards) as gift_awards,
  (select count(*) from public.kudos as k
     where k.heart_count <> (select count(*) from public.kudo_hearts as h where h.kudo_id = k.id))
    as heart_count_mismatch;
