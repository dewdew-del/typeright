-- Casual typing gets 10 s, 30 s and 1 min next to 2 min and Endless, and the leaderboard becomes one list
-- per length (all languages, all time, all countries).
-- duration_s: 10, 30, 60, 120 = timed runs; 0 = Endless.
alter table public.test_issues drop constraint test_issues_duration_s_check;
alter table public.test_issues add constraint test_issues_duration_s_check check (duration_s in (0, 10, 30, 60, 120));

create or replace function public.get_casual_board(
  p_mode text default '2min',
  p_lang text default null,
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
      and r.duration_s = case p_mode when 'endless' then 0 when '10s' then 10 when '30s' then 30 when '1min' then 60 else 120 end
      and (p_lang is null or r.lang = p_lang)
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
grant execute on function public.get_casual_board(text, text, text, text, int) to anon, authenticated;
