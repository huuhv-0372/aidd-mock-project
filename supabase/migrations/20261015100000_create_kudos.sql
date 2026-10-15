-- Migration: Sun* Kudos schema (#11 Live board, #12 Write Kudo, #13 Like) + 5 read RPCs.
-- Purpose : catalogs (departments, hashtags, gifts; data from Figma), Kudos and their hashtags,
--           images, hearts, x2-heart days, secret boxes, gift awards. profiles.department (always
--           null so far) becomes an FK to departments(code). Transactional tables have NO grants
--           and NO policies: clients read them only through the security-definer RPCs below,
--           because an anonymous Kudo must hide sender_id and RLS cannot hide a column.
--           Design: plans/261015-1010-sun-kudos-live-board/database-design.md
-- Prereq  : supabase/migrations/20261012133000_create_profiles.sql (profiles, is_allowed_account).
-- How to run: paste this whole file into Supabase Dashboard > SQL Editor (role: postgres) and Run.
--           Idempotent; one transaction (all or nothing). Catalog rows use ON CONFLICT DO NOTHING,
--           so a re-run never rewrites names edited later.
-- CAUTION : re-adding the profiles FK takes a brief ACCESS EXCLUSIVE lock on public.profiles,
--           which every sign-in writes: run off-peak. The sign-in triggers never write
--           `department`, so the FK cannot block a login; check one real Google login afterwards.
-- Verify  : supabase/verify/20261015100000_create_kudos_verify.sql (every row must be PASS)
-- Rollback: supabase/rollbacks/20261015100000_create_kudos_down.sql
-- Demo data: supabase/seed/20261015_kudos_demo_seed.sql (demo environments only)

begin;

-- 1. Catalogs + data -----------------------------------------------------------
-- Departments: Figma frame WXK5AYB_rG ("Dropdown Phong ban"), list order kept as sort_order.
create table if not exists public.departments (
  code        text primary key,
  sort_order  smallint not null
);

insert into public.departments (code, sort_order) values
  ('CTO', 1), ('SPD', 2), ('FCOV', 3), ('CEVC1', 4), ('CEVC2', 5), ('STVC - R&D', 6),
  ('CEVC2 - CySS', 7), ('FCOV - LRM', 8), ('CEVC2 - System', 9), ('OPDC - HRF', 10),
  ('CEVC1 - DSV - UI/UX 1', 11), ('CEVC1 - DSV', 12), ('CEVEC', 13), ('OPDC - HRD - C&C', 14),
  ('STVC', 15), ('FCOV - F&A', 16), ('CEVC1 - DSV - UI/UX 2', 17), ('CEVC1 - AIE', 18),
  ('OPDC - HRF - C&B', 19), ('FCOV - GA', 20), ('FCOV - ISO', 21), ('STVC - EE', 22),
  ('GEU - HUST', 23), ('CEVEC - SAPD', 24), ('OPDC - HRF - OD', 25), ('CEVEC - GSD', 26),
  ('GEU - TM', 27), ('STVC - R&D - DTR', 28), ('STVC - R&D - DPS', 29), ('CEVC3', 30),
  ('STVC - R&D - AIR', 31), ('CEVC4', 32), ('PAO', 33), ('GEU', 34), ('GEU - DUT', 35),
  ('OPDC - HRD - L&D', 36), ('OPDC - HRD - TI', 37), ('OPDC - HRF - TA', 38), ('GEU - UET', 39),
  ('STVC - R&D - SDX', 40), ('OPDC - HRD - HRBP', 41), ('PAO - PEC', 42), ('IAV', 43),
  ('STVC - Infra', 44), ('CPV - CGP', 45), ('GEU - UIT', 46), ('OPDC - HRD', 47), ('BDV', 48),
  ('CPV', 49), ('PAO - PAO', 50)
on conflict (code) do nothing;

-- Hashtags: Figma frame JWpsISMAaM (13 tags). Figma has no EN localization for these names;
-- EN text is listed in plans/261015-1010-sun-kudos-live-board/reports/en-localizations.md.
create table if not exists public.hashtags (
  id          smallint generated always as identity primary key,
  slug        text not null unique constraint hashtags_slug_format
                check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name_vi     text not null,
  name_en     text not null,
  sort_order  smallint not null
);

insert into public.hashtags (slug, name_vi, name_en, sort_order) values
  ('well-rounded', 'Toàn diện', 'Well-rounded', 1),
  ('professional', 'Giỏi chuyên môn', 'Professional', 2),
  ('high-performing', 'Hiệu suất cao', 'High-performing', 3),
  ('inspiring', 'Truyền cảm hứng', 'Inspiring', 4),
  ('dedicated', 'Cống hiến', 'Dedicated', 5),
  ('aim-high', 'Aim High', 'Aim High', 6),
  ('be-agile', 'Be Agile', 'Be Agile', 7),
  ('wasshoi', 'Wasshoi', 'Wasshoi', 8),
  ('goal-oriented', 'Hướng mục tiêu', 'Goal-oriented', 9),
  ('customer-focused', 'Hướng khách hàng', 'Customer-focused', 10),
  ('process-compliant', 'Chuẩn quy trình', 'Process-compliant', 11),
  ('creative-solutions', 'Giải pháp sáng tạo', 'Creative solutions', 12),
  ('excellent-management', 'Quản lý xuất sắc', 'Excellent management', 13)
on conflict (slug) do nothing;

-- Gifts: Figma live board ("Nhận được 1 áo phông SAA" / "Received 1 SAA T-shirt").
create table if not exists public.gifts (
  id       smallint generated always as identity primary key,
  name_vi  text not null unique,
  name_en  text not null
);

insert into public.gifts (name_vi, name_en) values ('1 áo phông SAA', '1 SAA T-shirt')
on conflict (name_vi) do nothing;

-- 2. profiles.department -> departments(code) ----------------------------------
-- Fails loudly if a profile ever got a department outside the catalog (none today: always null).
alter table public.profiles drop constraint if exists profiles_department_fkey;
alter table public.profiles
  add constraint profiles_department_fkey foreign key (department)
  references public.departments (code) on update cascade on delete set null;
create index if not exists profiles_department_idx on public.profiles (department);

-- 3. Transactional tables -----------------------------------------------------
create table if not exists public.kudos (
  id              uuid primary key default gen_random_uuid(),
  sender_id       uuid not null references public.profiles (id) on delete cascade,
  recipient_id    uuid not null references public.profiles (id) on delete cascade,
  title           text not null,
  content         text not null,
  is_anonymous    boolean not null default false,
  anonymous_name  text,
  heart_count     integer not null default 0,
  created_at      timestamptz not null default now(),
  constraint kudos_not_self check (sender_id <> recipient_id),
  constraint kudos_title_length check (char_length(btrim(title)) between 1 and 100),
  constraint kudos_content_length check (char_length(content) between 1 and 5000),
  constraint kudos_alias_only_when_anonymous check (is_anonymous or anonymous_name is null),
  constraint kudos_heart_count_non_negative check (heart_count >= 0)
);

-- Max 5 hashtags per Kudo is enforced by the future create_kudo RPC (#12).
create table if not exists public.kudo_hashtags (
  kudo_id     uuid not null references public.kudos (id) on delete cascade,
  hashtag_id  smallint not null references public.hashtags (id),
  primary key (kudo_id, hashtag_id)
);

create table if not exists public.kudo_images (
  id         uuid primary key default gen_random_uuid(),
  kudo_id    uuid not null references public.kudos (id) on delete cascade,
  image_url  text not null,
  position   smallint not null constraint kudo_images_position_range check (position between 1 and 5),
  constraint kudo_images_kudo_position_key unique (kudo_id, position)
);

-- One heart per user per Kudo (PK). hearts_awarded is set by the trigger in step 4, never trusted.
create table if not exists public.kudo_hearts (
  kudo_id         uuid not null references public.kudos (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  hearts_awarded  smallint not null default 1
                    constraint kudo_hearts_awarded_range check (hearts_awarded in (1, 2)),
  created_at      timestamptz not null default now(),
  primary key (kudo_id, user_id)
);

create table if not exists public.special_heart_days (
  id         bigint generated always as identity primary key,
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  constraint special_heart_days_range check (ends_at > starts_at)
);

create table if not exists public.secret_boxes (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  badge       text constraint secret_boxes_badge_known check (badge in ('stay_gold',
                'flow_to_horizon', 'beyond_the_boundary', 'root_further', 'touch_of_light', 'revival')),
  opened_at   timestamptz,
  created_at  timestamptz not null default now(),
  constraint secret_boxes_badge_iff_opened check ((opened_at is null) = (badge is null))
);

create table if not exists public.gift_awards (
  id            uuid primary key default gen_random_uuid(),
  recipient_id  uuid not null references public.profiles (id) on delete cascade,
  gift_id       smallint not null references public.gifts (id),
  awarded_at    timestamptz not null default now()
);

create index if not exists kudos_created_at_id_idx on public.kudos (created_at desc, id desc);
create index if not exists kudos_heart_count_created_at_idx on public.kudos (heart_count desc, created_at desc);
create index if not exists kudos_recipient_id_idx on public.kudos (recipient_id);
create index if not exists kudos_sender_id_idx on public.kudos (sender_id);
create index if not exists kudo_hashtags_hashtag_id_idx on public.kudo_hashtags (hashtag_id);
create index if not exists kudo_hearts_user_id_idx on public.kudo_hearts (user_id);
create index if not exists secret_boxes_owner_id_idx on public.secret_boxes (owner_id);
create index if not exists gift_awards_awarded_at_idx on public.gift_awards (awarded_at desc);
create index if not exists gift_awards_recipient_id_idx on public.gift_awards (recipient_id);

-- 4. Heart triggers -------------------------------------------------------------
-- BEFORE INSERT: no heart on your own Kudo; the server decides x1/x2 so an unheart (#13)
-- can take back exactly what was given.
create or replace function public.kudo_hearts_set_awarded()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.kudos as k where k.id = new.kudo_id and k.sender_id = new.user_id) then
    raise exception 'cannot heart own kudo' using errcode = 'check_violation';
  end if;
  new.hearts_awarded := case
    when exists (select 1 from public.special_heart_days as d
                 where d.starts_at <= pg_catalog.now() and pg_catalog.now() < d.ends_at) then 2
    else 1
  end;
  return new;
end;
$$;

-- AFTER INSERT/DELETE: kudos.heart_count = number of heart rows (denormalised for sorting).
create or replace function public.kudo_hearts_sync_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.kudos set heart_count = heart_count + 1 where id = new.kudo_id;
  else
    update public.kudos set heart_count = greatest(heart_count - 1, 0) where id = old.kudo_id;
  end if;
  return null;
end;
$$;

drop trigger if exists kudo_hearts_set_awarded on public.kudo_hearts;
create trigger kudo_hearts_set_awarded
  before insert on public.kudo_hearts
  for each row
  execute function public.kudo_hearts_set_awarded();

drop trigger if exists kudo_hearts_sync_count on public.kudo_hearts;
create trigger kudo_hearts_sync_count
  after insert or delete on public.kudo_hearts
  for each row
  execute function public.kudo_hearts_sync_count();

revoke execute on function public.kudo_hearts_set_awarded() from public, anon, authenticated;
revoke execute on function public.kudo_hearts_sync_count() from public, anon, authenticated;

-- 5. RLS + least-privilege grants ----------------------------------------------
-- Supabase default privileges give anon/authenticated ALL on new public tables; strip them.
alter table public.departments enable row level security;
alter table public.hashtags enable row level security;
alter table public.gifts enable row level security;
alter table public.kudos enable row level security;
alter table public.kudo_hashtags enable row level security;
alter table public.kudo_images enable row level security;
alter table public.kudo_hearts enable row level security;
alter table public.special_heart_days enable row level security;
alter table public.secret_boxes enable row level security;
alter table public.gift_awards enable row level security;

revoke all on table public.departments, public.hashtags, public.gifts, public.kudos,
  public.kudo_hashtags, public.kudo_images, public.kudo_hearts, public.special_heart_days,
  public.secret_boxes, public.gift_awards
  from anon, authenticated;
revoke all on sequence public.hashtags_id_seq, public.gifts_id_seq, public.special_heart_days_id_seq
  from anon, authenticated;

-- Catalogs: readable by allowed accounts only (same rule as profiles). No write policies.
grant select on table public.departments, public.hashtags, public.gifts to authenticated;

drop policy if exists "departments_select_allowed_account" on public.departments;
create policy "departments_select_allowed_account"
  on public.departments for select to authenticated
  using ((select public.is_allowed_account(
    (select auth.jwt()) ->> 'email', (select auth.jwt()) -> 'app_metadata')));

drop policy if exists "hashtags_select_allowed_account" on public.hashtags;
create policy "hashtags_select_allowed_account"
  on public.hashtags for select to authenticated
  using ((select public.is_allowed_account(
    (select auth.jwt()) ->> 'email', (select auth.jwt()) -> 'app_metadata')));

drop policy if exists "gifts_select_allowed_account" on public.gifts;
create policy "gifts_select_allowed_account"
  on public.gifts for select to authenticated
  using ((select public.is_allowed_account(
    (select auth.jwt()) ->> 'email', (select auth.jwt()) -> 'app_metadata')));

-- 6. Row type + internal helpers (no EXECUTE for clients; called only by the RPCs) -------
-- Created once; never dropped here, so a re-run cannot cascade into functions of later plans.
do $$
begin
  if pg_catalog.to_regtype('public.kudo_row') is null then
    create type public.kudo_row as (
      id              uuid,
      created_at      timestamptz,
      title           text,
      content         text,
      is_anonymous    boolean,
      anonymous_name  text,
      heart_count     integer,
      liked_by_me     boolean,
      is_mine         boolean,
      sender          jsonb,  -- null when is_anonymous
      recipient       jsonb,
      hashtags        jsonb,  -- [{slug, name_vi, name_en}] in catalog order
      images          jsonb   -- [url] by position
    );
  end if;
end;
$$;

-- Person: {id, full_name, avatar_url, department, kudos_received, distinct_senders}.
-- distinct_senders counts NON-anonymous senders only: if an anonymous Kudo counted, comparing the
-- number before/after it appears (or across recipients) would reveal who sent it. Trade-off: the
-- Hero tier (New/Rising/Super/Legend, derived from distinct_senders) ignores anonymous Kudos.
-- kudos_received counts every Kudo: it says nothing about senders.
create or replace function public.kudos_person_json(p_profile_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'id', p.id,
    'full_name', p.full_name,
    'avatar_url', p.avatar_url,
    'department', p.department,
    'kudos_received', (select pg_catalog.count(*) from public.kudos as k where k.recipient_id = p.id),
    'distinct_senders', (select pg_catalog.count(distinct k.sender_id) filter (where not k.is_anonymous)
                         from public.kudos as k
                         where k.recipient_id = p.id))
  from public.profiles as p
  where p.id = p_profile_id;
$$;

-- The filters used to live in a helper, kudo_matches_filters(). A scalar SQL function whose body
-- has sub-selects (EXISTS) is never inlined by the planner, so it ran once per Kudo row and the
-- filters could not use an index. They are now written inline in kudos_feed/kudos_highlight;
-- drop the helper left by an earlier run of this file.
drop function if exists public.kudo_matches_filters(uuid, uuid, text, text);

-- Kudo rows for the given ids, in the given order, as seen by p_viewer.
create or replace function public.kudos_rows(p_ids uuid[], p_viewer uuid)
returns setof public.kudo_row
language sql
stable
set search_path = ''
as $$
  select
    k.id, k.created_at, k.title, k.content, k.is_anonymous, k.anonymous_name, k.heart_count,
    exists (select 1 from public.kudo_hearts as h where h.kudo_id = k.id and h.user_id = p_viewer),
    k.sender_id is not distinct from p_viewer,
    case when k.is_anonymous then null else public.kudos_person_json(k.sender_id) end,
    public.kudos_person_json(k.recipient_id),
    coalesce((select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
                       'slug', h.slug, 'name_vi', h.name_vi, 'name_en', h.name_en)
                     order by h.sort_order, h.id)
              from public.kudo_hashtags as kh
              join public.hashtags as h on h.id = kh.hashtag_id
              where kh.kudo_id = k.id), '[]'::jsonb),
    coalesce((select pg_catalog.jsonb_agg(i.image_url order by i.position)
              from public.kudo_images as i
              where i.kudo_id = k.id), '[]'::jsonb)
  from pg_catalog.unnest(p_ids) with ordinality as t(id, ord)
  join public.kudos as k on k.id = t.id
  order by t.ord;
$$;

revoke execute on function public.kudos_person_json(uuid) from public, anon, authenticated;
revoke execute on function public.kudos_rows(uuid[], uuid) from public, anon, authenticated;

-- 7. Read RPCs ----------------------------------------------------------------------
-- Each: security definer + empty search_path + stable; the account rule is checked FIRST and a
-- failing caller gets nothing (empty set / null), never an error that reveals data exists.

-- All Kudos feed: newest first, keyset cursor (created_at, id) of the last row seen, 1..20 rows.
create or replace function public.kudos_feed(
  p_hashtag text default null,
  p_department text default null,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null,
  p_limit integer default 10
)
returns setof public.kudo_row
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_jwt jsonb := auth.jwt();
  v_hashtag text := nullif(pg_catalog.btrim(p_hashtag), '');
  v_department text := nullif(pg_catalog.btrim(p_department), '');
  v_ids uuid[];
begin
  if not coalesce(public.is_allowed_account(v_jwt ->> 'email', v_jwt -> 'app_metadata'), false) then
    return;
  end if;

  select pg_catalog.array_agg(x.id order by x.created_at desc, x.id desc) into v_ids
  from (
    select k.id, k.created_at
    from public.kudos as k
    -- Filters: hashtag slug and RECIPIENT department, AND-ed; null = no filter. Same as highlight.
    where (v_hashtag is null or exists (
             select 1 from public.kudo_hashtags as kh
             join public.hashtags as h on h.id = kh.hashtag_id
             where kh.kudo_id = k.id and h.slug = v_hashtag))
      and (v_department is null or exists (
             select 1 from public.profiles as r
             where r.id = k.recipient_id and r.department = v_department))
      and (p_cursor_created_at is null or p_cursor_id is null
           or (k.created_at, k.id) < (p_cursor_created_at, p_cursor_id))
    order by k.created_at desc, k.id desc
    limit least(greatest(coalesce(p_limit, 10), 1), 20)
  ) as x;

  return query select * from public.kudos_rows(v_ids, auth.uid());
end;
$$;

-- Highlight: top 5 by hearts (ties: newest), same filters as the feed.
create or replace function public.kudos_highlight(
  p_hashtag text default null,
  p_department text default null
)
returns setof public.kudo_row
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_jwt jsonb := auth.jwt();
  v_hashtag text := nullif(pg_catalog.btrim(p_hashtag), '');
  v_department text := nullif(pg_catalog.btrim(p_department), '');
  v_ids uuid[];
begin
  if not coalesce(public.is_allowed_account(v_jwt ->> 'email', v_jwt -> 'app_metadata'), false) then
    return;
  end if;

  select pg_catalog.array_agg(x.id order by x.heart_count desc, x.created_at desc, x.id desc) into v_ids
  from (
    select k.id, k.heart_count, k.created_at
    from public.kudos as k
    -- Same filters as kudos_feed.
    where (v_hashtag is null or exists (
             select 1 from public.kudo_hashtags as kh
             join public.hashtags as h on h.id = kh.hashtag_id
             where kh.kudo_id = k.id and h.slug = v_hashtag))
      and (v_department is null or exists (
             select 1 from public.profiles as r
             where r.id = k.recipient_id and r.department = v_department))
    order by k.heart_count desc, k.created_at desc, k.id desc
    limit 5
  ) as x;

  return query select * from public.kudos_rows(v_ids, auth.uid());
end;
$$;

-- Spotlight: {total, recipients[], recent[5]} over ALL Kudos (not filtered).
create or replace function public.kudos_spotlight()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_jwt jsonb := auth.jwt();
begin
  if not coalesce(public.is_allowed_account(v_jwt ->> 'email', v_jwt -> 'app_metadata'), false) then
    return null;
  end if;

  return pg_catalog.jsonb_build_object(
    'total', (select pg_catalog.count(*) from public.kudos),
    'recipients', coalesce((
      select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
               'id', r.recipient_id, 'full_name', p.full_name, 'kudos_count', r.kudos_count,
               'last_received_at', r.last_received_at, 'last_kudo_id', r.last_kudo_id)
             order by r.kudos_count desc, r.last_received_at desc, r.recipient_id)
      from (
        select k.recipient_id,
               pg_catalog.count(*) as kudos_count,
               pg_catalog.max(k.created_at) as last_received_at,
               (pg_catalog.array_agg(k.id order by k.created_at desc, k.id desc))[1] as last_kudo_id
        from public.kudos as k
        group by k.recipient_id
      ) as r
      join public.profiles as p on p.id = r.recipient_id), '[]'::jsonb),
    'recent', coalesce((
      select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
               'recipient_name', x.full_name, 'created_at', x.created_at)
             order by x.created_at desc, x.id desc)
      from (
        select k.id, k.created_at, p.full_name
        from public.kudos as k
        join public.profiles as p on p.id = k.recipient_id
        order by k.created_at desc, k.id desc
        limit 5
      ) as x), '[]'::jsonb));
end;
$$;

-- Personal stats of auth.uid(). hearts_received = hearts on Kudos the caller SENT (spec C.4.1,
-- open question in clarifications.md).
create or replace function public.kudos_my_stats()
returns table (received integer, sent integer, hearts_received integer,
               boxes_opened integer, boxes_unopened integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_jwt jsonb := auth.jwt();
  v_uid uuid := auth.uid();
begin
  if v_uid is null
     or not coalesce(public.is_allowed_account(v_jwt ->> 'email', v_jwt -> 'app_metadata'), false) then
    return;
  end if;

  return query select
    (select pg_catalog.count(*)::integer from public.kudos as k where k.recipient_id = v_uid),
    (select pg_catalog.count(*)::integer from public.kudos as k where k.sender_id = v_uid),
    (select coalesce(pg_catalog.sum(h.hearts_awarded), 0)::integer
       from public.kudo_hearts as h
       join public.kudos as k on k.id = h.kudo_id
       where k.sender_id = v_uid),
    (select pg_catalog.count(*)::integer from public.secret_boxes as b
       where b.owner_id = v_uid and b.opened_at is not null),
    (select pg_catalog.count(*)::integer from public.secret_boxes as b
       where b.owner_id = v_uid and b.opened_at is null);
end;
$$;

-- Latest gift recipients, newest award first, 1..20 rows.
create or replace function public.kudos_latest_gift_recipients(p_limit integer default 10)
returns table (recipient jsonb, gift_name_vi text, gift_name_en text, awarded_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_jwt jsonb := auth.jwt();
begin
  if not coalesce(public.is_allowed_account(v_jwt ->> 'email', v_jwt -> 'app_metadata'), false) then
    return;
  end if;

  return query
    select public.kudos_person_json(ga.recipient_id), g.name_vi, g.name_en, ga.awarded_at
    from public.gift_awards as ga
    join public.gifts as g on g.id = ga.gift_id
    order by ga.awarded_at desc, ga.id desc
    limit least(greatest(coalesce(p_limit, 10), 1), 20);
end;
$$;

revoke execute on function public.kudos_feed(text, text, timestamptz, uuid, integer) from public, anon;
revoke execute on function public.kudos_highlight(text, text) from public, anon;
revoke execute on function public.kudos_spotlight() from public, anon;
revoke execute on function public.kudos_my_stats() from public, anon;
revoke execute on function public.kudos_latest_gift_recipients(integer) from public, anon;
grant execute on function public.kudos_feed(text, text, timestamptz, uuid, integer) to authenticated;
grant execute on function public.kudos_highlight(text, text) to authenticated;
grant execute on function public.kudos_spotlight() to authenticated;
grant execute on function public.kudos_my_stats() to authenticated;
grant execute on function public.kudos_latest_gift_recipients(integer) to authenticated;

commit;
