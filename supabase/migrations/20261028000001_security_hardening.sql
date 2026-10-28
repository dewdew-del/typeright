-- Security hardening from the 28 Oct 2026 review (see docs/SECURITY.md).
-- Safe to run more than once. Existing rows that would break a new rule are cleaned first.

-- ---------------------------------------------------------------- 1. review flags keep runs off the boards
-- submit-result marks runs 'very-fast' (over 180 WPM) or 'even-timing' (script-like rhythm). They are saved
-- but hidden from the leaderboards and the profile bests until the developer clears the flag.
create or replace function public.get_casual_board(
  p_mode text default '2min',
  p_lang text default null,
  p_period text default 'all',
  p_country text default null,
  p_limit int default 50
)
returns table (
  rank bigint, user_id uuid, username text, country text, avatar_url text, is_guest boolean,
  wpm real, accuracy real, achieved_at timestamptz, duration_ms integer
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
    select distinct on (r.user_id) r.user_id, r.wpm, r.accuracy, r.created_at, r.typed_ms
    from public.results r, since
    where r.kind = 'casual'
      and r.duration_s = case p_mode when 'endless' then 0 when '10s' then 10 when '30s' then 30 when '1min' then 60 else 120 end
      and (p_mode <> 'endless' or r.typed_ms >= 600000)
      and not (r.flags && array['very-fast', 'even-timing']::text[])
      and (p_lang is null or r.lang = p_lang)
      and r.created_at >= since.t
    order by r.user_id, r.wpm desc, r.created_at asc
  )
  select rank() over (order by b.wpm desc, b.created_at asc), b.user_id, p.username::text, p.country::text,
    p.avatar_url, p.is_guest, b.wpm, b.accuracy, b.created_at, b.typed_ms
  from best b
  join public.profiles p on p.id = b.user_id
  where (p_country is null or p.country = p_country)
    and (p_period <> 'all' or not p.is_guest)
  order by b.wpm desc, b.created_at asc
  limit least(greatest(p_limit, 1), 100);
$$;

create or replace function public.get_profile_stats(p_username text)
returns table (
  user_id uuid, username text, country text, avatar_url text, is_guest boolean, joined_at timestamptz,
  best_2min real, best_endless real, tests_taken bigint, avg_accuracy real, streak_current integer, streak_best integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  select p.id, p.username::text, p.country::text, p.avatar_url, p.is_guest, p.created_at,
    (select max(r.wpm) from public.results r where r.user_id = p.id and r.kind = 'casual' and r.duration_s = 120
       and not (r.flags && array['very-fast', 'even-timing']::text[])),
    (select max(r.wpm) from public.results r where r.user_id = p.id and r.kind = 'casual' and r.duration_s = 0 and r.typed_ms >= 600000
       and not (r.flags && array['very-fast', 'even-timing']::text[])),
    (select count(*) from public.results r where r.user_id = p.id and r.kind = 'casual'),
    (select avg(r.accuracy)::real from public.results r where r.user_id = p.id and r.kind = 'casual'),
    case when p.last_practice_date >= (now() at time zone 'Asia/Manila')::date - 1 then p.streak_current else 0 end,
    p.streak_best
  from public.profiles p
  where p.username = p_username::extensions.citext;
$$;

-- ---------------------------------------------------------------- 2. profile photo: only our own storage file
-- The app only ever sets <storage>/avatars/<user id>/avatar.webp. Any other address would make every viewer's
-- browser contact a stranger's server.
update public.profiles
set avatar_url = null
where avatar_url is not null
  and avatar_url !~ ('^https://kibryhwcekdyvvskkepv\.supabase\.co/storage/v1/object/public/avatars/' || id::text || '/avatar\.webp(\?v=[0-9]+)?$');

alter table public.profiles drop constraint if exists profiles_avatar_url_check;
alter table public.profiles add constraint profiles_avatar_url_check check (
  avatar_url is null
  or avatar_url ~ ('^https://kibryhwcekdyvvskkepv\.supabase\.co/storage/v1/object/public/avatars/' || id::text || '/avatar\.webp(\?v=[0-9]+)?$')
);

-- One fixed file name per user, so nobody can fill the free storage with many files.
drop policy if exists "Users upload their own avatar" on storage.objects;
create policy "Users upload their own avatar" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and name = (select auth.uid())::text || '/avatar.webp');
drop policy if exists "Users replace their own avatar" on storage.objects;
create policy "Users replace their own avatar" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and name = (select auth.uid())::text || '/avatar.webp')
  with check (bucket_id = 'avatars' and name = (select auth.uid())::text || '/avatar.webp');

-- ---------------------------------------------------------------- 3. tested_out_stages: small and valid
update public.profiles
set tested_out_stages = '{}'
where not (tested_out_stages <@ '{0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20}'::smallint[])
   or cardinality(tested_out_stages) > 21;

alter table public.profiles drop constraint if exists profiles_tested_out_stages_check;
alter table public.profiles add constraint profiles_tested_out_stages_check check (
  tested_out_stages <@ '{0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20}'::smallint[]
  and cardinality(tested_out_stages) <= 21
);

-- ---------------------------------------------------------------- 4. extra table rights nobody needs
-- RLS does not cover TRUNCATE; the web API cannot send it, but the rights are not needed either.
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;
alter default privileges for role postgres in schema public revoke truncate, references, trigger on tables from anon, authenticated;

-- ---------------------------------------------------------------- 5. groups were removed from the app
revoke execute on function public.create_group(text), public.join_group(text) from authenticated;

-- ---------------------------------------------------------------- 6. reserved usernames
-- NOT VALID: rows that already exist are left alone; every new or changed username is checked.
alter table public.profiles drop constraint if exists profiles_username_reserved;
alter table public.profiles add constraint profiles_username_reserved check (
  lower(username::text) !~ '^(admin|administrator|root|system|support|staff|moderator|mod|official|owner|typeright)$'
) not valid;

create or replace function public.username_available(name text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select name ~ '^[A-Za-z0-9_.-]{3,20}$'
    and lower(name) !~ '^(admin|administrator|root|system|support|staff|moderator|mod|official|owner|typeright)$'
    and not exists (select 1 from public.profiles p where p.username = name::extensions.citext);
$$;

-- Sign-up: a reserved name (asked for, or derived from an email like admin@...) falls back to "player".
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  guest boolean := coalesce(new.is_anonymous, false);
  wanted text := new.raw_user_meta_data ->> 'username';
  wanted_country text := upper(coalesce(new.raw_user_meta_data ->> 'country', ''));
  reserved constant text := '^(admin|administrator|root|system|support|staff|moderator|mod|official|owner|typeright)$';
  base text;
  candidate text;
begin
  if wanted ~ '^[A-Za-z0-9_.-]{3,20}$' and lower(wanted) !~ reserved then
    candidate := wanted;
  else
    if guest then
      base := 'Guest';
    else
      base := left(btrim(regexp_replace(split_part(coalesce(new.email, ''), '@', 1), '[^A-Za-z0-9_.]', '', 'g'), '.'), 15);
      if char_length(base) < 3 or lower(base) ~ reserved then
        base := 'player';
      end if;
    end if;
    candidate := case when guest then base || '-' || lpad((floor(random() * 10000))::int::text, 4, '0') else base end;
    while exists (select 1 from public.profiles p where p.username = candidate::extensions.citext) loop
      candidate := base || '-' || lpad((floor(random() * 10000))::int::text, 4, '0');
    end loop;
  end if;

  insert into public.profiles (id, username, is_guest, country)
  values (new.id, candidate, guest, case when wanted_country ~ '^[A-Z]{2}$' then wanted_country else 'PH' end);
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
