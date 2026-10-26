-- Temporary: every server-verified casual run counts on the leaderboard and profile bests
-- (the accuracy >= 95 filter is removed). To bring the rule back, re-run the two functions from
-- 20261026000007_casual_boards_avatars.sql and set MIN_ACCURACY = 95 in submit-result.

create or replace function public.get_casual_board(
  p_mode text default '2min',
  p_lang text default 'en',
  p_period text default 'all',
  p_country text default null,
  p_limit int default 50
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
    where r.kind = 'casual'
      and r.duration_s = case when p_mode = 'endless' then 0 else 120 end
      and r.lang = p_lang
      and r.created_at >= since.t
    order by r.user_id, r.wpm desc, r.created_at asc
  )
  select rank() over (order by b.wpm desc, b.created_at asc), b.user_id, p.username::text, p.country::text,
    p.avatar_url, p.is_guest, b.wpm, b.accuracy, b.created_at
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
    (select max(r.wpm) from public.results r where r.user_id = p.id and r.kind = 'casual' and r.duration_s = 120),
    (select max(r.wpm) from public.results r where r.user_id = p.id and r.kind = 'casual' and r.duration_s = 0),
    (select count(*) from public.results r where r.user_id = p.id and r.kind = 'casual'),
    (select avg(r.accuracy)::real from public.results r where r.user_id = p.id and r.kind = 'casual'),
    case when p.last_practice_date >= (now() at time zone 'Asia/Manila')::date - 1 then p.streak_current else 0 end,
    p.streak_best
  from public.profiles p
  where p.username = p_username::extensions.citext;
$$;
