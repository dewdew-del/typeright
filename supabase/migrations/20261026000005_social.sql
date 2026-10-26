-- Stage 7: live races, daily challenge, groups, badges and streaks.
-- Helper functions used inside RLS policies and triggers live in a private schema (not exposed by the API).

create schema if not exists private;
grant usage on schema private to anon, authenticated;

-- ---------------------------------------------------------------- daily challenge
alter table public.test_issues add column daily_date date;
alter table public.results add column daily_date date;
create index results_daily_idx on public.results (daily_date, wpm desc) where kind = 'daily' and accuracy >= 95;

-- ---------------------------------------------------------------- streaks
alter table public.profiles
  add column streak_current integer not null default 0,
  add column streak_best integer not null default 0,
  add column last_practice_date date;

-- ---------------------------------------------------------------- badges
create table public.user_badges (
  user_id uuid not null references public.profiles (id) on delete cascade,
  badge_id text not null check (badge_id ~ '^[a-z0-9-]{2,40}$'),
  awarded_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);
alter table public.user_badges enable row level security;
create policy "Badges are readable by everyone" on public.user_badges for select to anon, authenticated using (true);
revoke insert, update, delete on public.user_badges from anon, authenticated;

-- Speed and accuracy badges come only from server-validated results.
create or replace function private.award_result_badges()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.accuracy >= 95 then
    insert into public.user_badges (user_id, badge_id)
    select new.user_id, 'wpm-' || m from unnest(array[30, 50, 70, 100]) as m where new.wpm >= m
    on conflict do nothing;
  end if;
  if new.accuracy >= 98 and new.wpm >= 30 then
    insert into public.user_badges (user_id, badge_id) values (new.user_id, 'accuracy-98') on conflict do nothing;
  end if;
  if new.accuracy = 100 and new.wpm >= 20 then
    insert into public.user_badges (user_id, badge_id) values (new.user_id, 'accuracy-100') on conflict do nothing;
  end if;
  if new.kind = 'daily' then
    insert into public.user_badges (user_id, badge_id) values (new.user_id, 'daily-player') on conflict do nothing;
  end if;
  return new;
end;
$$;
create trigger results_award_badges after insert on public.results for each row execute function private.award_result_badges();

-- Daily practice streak in Philippine time. Called by the app after any finished practice.
create or replace function public.touch_streak()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  today date := (now() at time zone 'Asia/Manila')::date;
  current_streak integer;
begin
  if uid is null then
    return 0;
  end if;
  update public.profiles
  set streak_current = case
        when last_practice_date = today then streak_current
        when last_practice_date = today - 1 then streak_current + 1
        else 1
      end,
      last_practice_date = today
  where id = uid
  returning streak_current into current_streak;
  update public.profiles set streak_best = greatest(streak_best, current_streak) where id = uid;
  insert into public.user_badges (user_id, badge_id)
  select uid, 'streak-' || d from unnest(array[3, 7, 30]) as d where current_streak >= d
  on conflict do nothing;
  return coalesce(current_streak, 0);
end;
$$;
revoke execute on function public.touch_streak() from public, anon;
grant execute on function public.touch_streak() to authenticated;

-- ---------------------------------------------------------------- groups
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 40),
  join_code text not null unique check (join_code ~ '^[A-Z0-9]{6}$'),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index group_members_user_idx on public.group_members (user_id);

create or replace function private.is_group_member(gid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.group_members m where m.group_id = gid and m.user_id = (select auth.uid()));
$$;
grant execute on function private.is_group_member(uuid) to authenticated;

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
create policy "Members can see their groups" on public.groups for select to authenticated using (private.is_group_member(id));
create policy "Owners can delete their groups" on public.groups for delete to authenticated using ((select auth.uid()) = owner_id);
create policy "Members can see fellow members" on public.group_members for select to authenticated using (private.is_group_member(group_id));
create policy "Members can leave" on public.group_members for delete to authenticated using ((select auth.uid()) = user_id);
revoke insert, update on public.groups, public.group_members from anon, authenticated;
revoke all on public.groups, public.group_members from anon;

create or replace function private.random_code(len integer)
returns text
language sql
volatile
set search_path = ''
as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
  from generate_series(1, len);
$$;

create or replace function public.create_group(p_name text)
returns table (id uuid, join_code text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  code text;
  gid uuid;
begin
  if uid is null then raise exception 'Sign in to create a group'; end if;
  if (select count(*) from public.groups g where g.owner_id = uid) >= 10 then
    raise exception 'You can own up to 10 groups';
  end if;
  loop
    code := private.random_code(6);
    exit when not exists (select 1 from public.groups g where g.join_code = code);
  end loop;
  insert into public.groups (name, join_code, owner_id) values (btrim(p_name), code, uid) returning groups.id into gid;
  insert into public.group_members (group_id, user_id) values (gid, uid);
  return query select gid, code;
end;
$$;

create or replace function public.join_group(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  gid uuid;
begin
  if uid is null then raise exception 'Sign in to join a group'; end if;
  select g.id into gid from public.groups g where g.join_code = upper(btrim(p_code));
  if gid is null then raise exception 'No group has that code'; end if;
  if (select count(*) from public.group_members m where m.group_id = gid) >= 100 then
    raise exception 'This group is full';
  end if;
  insert into public.group_members (group_id, user_id) values (gid, uid) on conflict do nothing;
  return gid;
end;
$$;

revoke execute on function public.create_group(text), public.join_group(text) from public, anon;
grant execute on function public.create_group(text), public.join_group(text) to authenticated;

-- ---------------------------------------------------------------- races
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{5}$'),
  host_id uuid not null references public.profiles (id) on delete cascade,
  visibility text not null check (visibility in ('private', 'public')),
  text_type text not null check (char_length(text_type) between 1 and 40),
  text text not null check (char_length(text) between 20 and 2000 and text ~ '^[ -~]+$'),
  status text not null default 'lobby' check (status in ('lobby', 'racing', 'done')),
  starts_at timestamptz,
  cap_s smallint not null default 120,
  created_at timestamptz not null default now()
);
create table public.room_players (
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
create index room_players_user_idx on public.room_players (user_id);
create index rooms_public_idx on public.rooms (created_at desc) where visibility = 'public' and status = 'lobby';

-- Validated by the submit-race Edge Function (service role only).
create table public.race_results (
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  finished boolean not null,
  progress integer not null check (progress >= 0),
  finish_ms integer,
  wpm real not null check (wpm >= 0),
  accuracy real not null check (accuracy between 0 and 100),
  created_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create or replace function private.is_room_member(rid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.room_players p where p.room_id = rid and p.user_id = (select auth.uid()));
$$;
grant execute on function private.is_room_member(uuid) to authenticated;

alter table public.rooms enable row level security;
alter table public.room_players enable row level security;
alter table public.race_results enable row level security;
create policy "Public rooms and your rooms are visible" on public.rooms for select to authenticated
  using (visibility = 'public' or private.is_room_member(id));
create policy "Room members see each other" on public.room_players for select to authenticated
  using (private.is_room_member(room_id));
create policy "Room members see race results" on public.race_results for select to authenticated
  using (private.is_room_member(room_id));
revoke all on public.rooms, public.room_players, public.race_results from anon;
revoke insert, update, delete on public.rooms, public.room_players, public.race_results from authenticated;

-- Race badges: first race, and a win when you are the first to finish in a room of two or more.
create or replace function private.award_race_badges()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_badges (user_id, badge_id) values (new.user_id, 'first-race') on conflict do nothing;
  if new.finished
    and (select count(*) from public.room_players p where p.room_id = new.room_id) >= 2
    and not exists (
      select 1 from public.race_results r
      where r.room_id = new.room_id and r.finished and r.user_id <> new.user_id and r.finish_ms <= new.finish_ms
    ) then
    insert into public.user_badges (user_id, badge_id) values (new.user_id, 'race-winner') on conflict do nothing;
  end if;
  return new;
end;
$$;
create trigger race_results_award_badges after insert on public.race_results for each row execute function private.award_race_badges();

create or replace function public.create_room(p_visibility text, p_text_type text, p_text text)
returns table (id uuid, code text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  c text;
  rid uuid;
begin
  if uid is null then raise exception 'Sign in to create a room'; end if;
  if (select count(*) from public.rooms r where r.host_id = uid and r.created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Too many rooms created. Try again later';
  end if;
  loop
    c := private.random_code(5);
    exit when not exists (select 1 from public.rooms r where r.code = c);
  end loop;
  insert into public.rooms (code, host_id, visibility, text_type, text)
  values (c, uid, p_visibility, p_text_type, p_text)
  returning rooms.id into rid;
  insert into public.room_players (room_id, user_id) values (rid, uid);
  return query select rid, c;
end;
$$;

create or replace function public.join_room(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  r public.rooms%rowtype;
begin
  if uid is null then raise exception 'Sign in to join a room'; end if;
  select * into r from public.rooms where code = upper(btrim(p_code));
  if r.id is null then raise exception 'No room has that code'; end if;
  if exists (select 1 from public.room_players p where p.room_id = r.id and p.user_id = uid) then
    return r.id;
  end if;
  if r.status <> 'lobby' then raise exception 'That race has already started'; end if;
  if (select count(*) from public.room_players p where p.room_id = r.id) >= 8 then
    raise exception 'That room is full';
  end if;
  insert into public.room_players (room_id, user_id) values (r.id, uid);
  return r.id;
end;
$$;

create or replace function public.leave_room(p_room uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  next_host uuid;
begin
  delete from public.room_players where room_id = p_room and user_id = uid;
  if (select host_id from public.rooms where id = p_room) = uid then
    select p.user_id into next_host from public.room_players p where p.room_id = p_room order by p.joined_at limit 1;
    if next_host is null then
      delete from public.rooms where id = p_room;
    else
      update public.rooms set host_id = next_host where id = p_room;
    end if;
  end if;
end;
$$;

-- Host starts the race: everyone gets the same start time from the server clock.
create or replace function public.start_race(p_room uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  t timestamptz;
begin
  if (select count(*) from public.room_players p where p.room_id = p_room) < 2 then
    raise exception 'A race needs at least 2 players';
  end if;
  update public.rooms
  set status = 'racing', starts_at = now() + interval '5 seconds'
  where id = p_room and host_id = (select auth.uid()) and status = 'lobby'
  returning starts_at into t;
  if t is null then raise exception 'Only the host can start the race'; end if;
  return t;
end;
$$;

-- Host starts another round in the same room with new text.
create or replace function public.reset_room(p_room uuid, p_text text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.rooms
  set status = 'lobby', starts_at = null, text = p_text
  where id = p_room and host_id = (select auth.uid()) and status <> 'lobby';
  if not found then raise exception 'Only the host can start a new round'; end if;
  delete from public.race_results where room_id = p_room;
end;
$$;

create or replace function public.list_public_rooms()
returns table (id uuid, code text, host text, text_type text, players bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.code, p.username::text, r.text_type, (select count(*) from public.room_players x where x.room_id = r.id)
  from public.rooms r
  join public.profiles p on p.id = r.host_id
  where r.visibility = 'public' and r.status = 'lobby' and r.created_at > now() - interval '30 minutes'
    and (select count(*) from public.room_players x where x.room_id = r.id) < 8
  order by r.created_at desc
  limit 20;
$$;

create or replace function public.server_now()
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select now();
$$;

revoke execute on function public.create_room(text, text, text), public.join_room(text), public.leave_room(uuid),
  public.start_race(uuid), public.reset_room(uuid, text), public.list_public_rooms() from public, anon;
grant execute on function public.create_room(text, text, text), public.join_room(text), public.leave_room(uuid),
  public.start_race(uuid), public.reset_room(uuid, text), public.list_public_rooms() to authenticated;
grant execute on function public.server_now() to anon, authenticated;

-- ---------------------------------------------------------------- leaderboards
-- Global boards count ranked tests only (the daily challenge has its own board); optional group filter.
drop function public.get_leaderboard(int, text, text, text, int);
create or replace function public.get_leaderboard(
  p_duration int,
  p_period text default 'all',
  p_country text default null,
  p_lang text default 'en',
  p_limit int default 50,
  p_group uuid default null
)
returns table (
  rank bigint, user_id uuid, username text, country text, avatar_url text, is_guest boolean,
  wpm real, accuracy real, achieved_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  with since as (
    select case p_period
      when 'daily' then date_trunc('day', now() at time zone 'Asia/Manila') at time zone 'Asia/Manila'
      when 'weekly' then date_trunc('week', now() at time zone 'Asia/Manila') at time zone 'Asia/Manila'
      else '-infinity'::timestamptz
    end as t
  ),
  best as (
    select distinct on (r.user_id) r.user_id, r.wpm, r.accuracy, r.created_at
    from public.results r, since
    where r.kind = 'test' and r.duration_s = p_duration and r.lang = p_lang
      and r.accuracy >= 95 and r.created_at >= since.t
    order by r.user_id, r.wpm desc, r.created_at asc
  )
  select rank() over (order by b.wpm desc, b.created_at asc), b.user_id, p.username::text, p.country::text,
    p.avatar_url, p.is_guest, b.wpm, b.accuracy, b.created_at
  from best b
  join public.profiles p on p.id = b.user_id
  where (p_country is null or p.country = p_country)
    and (p_period <> 'all' or not p.is_guest)
    and (p_group is null or exists (select 1 from public.group_members m where m.group_id = p_group and m.user_id = b.user_id))
  order by b.wpm desc, b.created_at asc
  limit least(greatest(p_limit, 1), 100);
$$;

create or replace function public.get_daily_board(p_date date default null, p_limit int default 50)
returns table (
  rank bigint, user_id uuid, username text, country text, avatar_url text, is_guest boolean,
  wpm real, accuracy real, achieved_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  with best as (
    select distinct on (r.user_id) r.user_id, r.wpm, r.accuracy, r.created_at
    from public.results r
    where r.kind = 'daily' and r.accuracy >= 95
      and r.daily_date = coalesce(p_date, (now() at time zone 'Asia/Manila')::date)
    order by r.user_id, r.wpm desc, r.created_at asc
  )
  select rank() over (order by b.wpm desc, b.created_at asc), b.user_id, p.username::text, p.country::text,
    p.avatar_url, p.is_guest, b.wpm, b.accuracy, b.created_at
  from best b
  join public.profiles p on p.id = b.user_id
  order by b.wpm desc, b.created_at asc
  limit least(greatest(p_limit, 1), 100);
$$;

grant execute on function public.get_leaderboard(int, text, text, text, int, uuid) to anon, authenticated;
grant execute on function public.get_daily_board(date, int) to anon, authenticated;

-- Public profile: add streaks.
drop function public.get_profile_stats(text);
create or replace function public.get_profile_stats(p_username text)
returns table (
  user_id uuid, username text, country text, avatar_url text, is_guest boolean, joined_at timestamptz,
  best_30 real, best_60 real, tests_taken bigint, avg_accuracy real, streak_current integer, streak_best integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  select p.id, p.username::text, p.country::text, p.avatar_url, p.is_guest, p.created_at,
    (select max(r.wpm) from public.results r where r.user_id = p.id and r.duration_s = 30 and r.accuracy >= 95),
    (select max(r.wpm) from public.results r where r.user_id = p.id and r.duration_s = 60 and r.accuracy >= 95),
    (select count(*) from public.results r where r.user_id = p.id),
    (select avg(r.accuracy)::real from public.results r where r.user_id = p.id),
    case when p.last_practice_date >= (now() at time zone 'Asia/Manila')::date - 1 then p.streak_current else 0 end,
    p.streak_best
  from public.profiles p
  where p.username = p_username::extensions.citext;
$$;
grant execute on function public.get_profile_stats(text) to anon, authenticated;

-- Streak columns are server-managed.
revoke update on public.profiles from authenticated;
grant update (username, country, avatar_url, tested_out_stages) on public.profiles to authenticated;
