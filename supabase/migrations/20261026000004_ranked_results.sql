-- Ranked tests: the server issues the text, re-scores the keystroke log, and only then stores a result.
-- Clients can read results (leaderboards, profiles) but can never write them: only the Edge Functions
-- (service role) insert into these tables.

create table public.test_issues (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'test' check (kind in ('test', 'daily', 'race')),
  lang text not null default 'en' check (lang in ('en', 'fil')),
  duration_s smallint not null check (duration_s in (30, 60)),
  text text not null,
  issued_at timestamptz not null default now(),
  consumed_at timestamptz
);
create index test_issues_user_idx on public.test_issues (user_id, issued_at desc);

create table public.results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  issue_id uuid not null unique references public.test_issues (id) on delete cascade,
  kind text not null check (kind in ('test', 'daily', 'race')),
  lang text not null check (lang in ('en', 'fil')),
  duration_s smallint not null,
  wpm real not null check (wpm >= 0),
  raw_wpm real not null check (raw_wpm >= 0),
  accuracy real not null check (accuracy between 0 and 100),
  keystrokes integer not null check (keystrokes >= 0),
  flags text[] not null default '{}',
  created_at timestamptz not null default now()
);
-- Leaderboards: best qualifying runs per duration and language, newest-first windows for daily/weekly.
create index results_board_idx on public.results (duration_s, lang, wpm desc) where accuracy >= 95;
create index results_recent_idx on public.results (duration_s, lang, created_at desc) where accuracy >= 95;
create index results_user_idx on public.results (user_id, created_at desc);

-- Raw keystroke logs for auditing (not public).
create table public.result_logs (
  result_id uuid primary key references public.results (id) on delete cascade,
  log jsonb not null
);

-- Every submission, accepted or not: rate limiting and an audit trail.
create table public.submission_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  outcome text not null check (outcome in ('accepted', 'rejected', 'rate-limited')),
  reason text,
  created_at timestamptz not null default now()
);
create index submission_attempts_user_idx on public.submission_attempts (user_id, created_at desc);

alter table public.test_issues enable row level security;
alter table public.results enable row level security;
alter table public.result_logs enable row level security;
alter table public.submission_attempts enable row level security;

create policy "Results are readable by everyone" on public.results for select to anon, authenticated using (true);

-- No other policies: with RLS on, anon and authenticated can do nothing else on these tables.
revoke all on public.test_issues, public.result_logs, public.submission_attempts from anon, authenticated;
revoke insert, update, delete on public.results from anon, authenticated;

-- Leaderboard: each player's best qualifying run (accuracy >= 95%) for a duration.
-- Periods use Philippine time. Guests appear on daily and weekly boards only.
create or replace function public.get_leaderboard(
  p_duration int,
  p_period text default 'all',
  p_country text default null,
  p_lang text default 'en',
  p_limit int default 50
)
returns table (
  rank bigint,
  user_id uuid,
  username text,
  country text,
  avatar_url text,
  is_guest boolean,
  wpm real,
  accuracy real,
  achieved_at timestamptz
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
    where r.duration_s = p_duration
      and r.lang = p_lang
      and r.accuracy >= 95
      and r.created_at >= since.t
    order by r.user_id, r.wpm desc, r.created_at asc
  )
  select
    rank() over (order by b.wpm desc, b.created_at asc),
    b.user_id,
    p.username::text,
    p.country::text,
    p.avatar_url,
    p.is_guest,
    b.wpm,
    b.accuracy,
    b.created_at
  from best b
  join public.profiles p on p.id = b.user_id
  where (p_country is null or p.country = p_country)
    and (p_period <> 'all' or not p.is_guest)
  order by b.wpm desc, b.created_at asc
  limit least(greatest(p_limit, 1), 100);
$$;

-- Public profile summary by username.
create or replace function public.get_profile_stats(p_username text)
returns table (
  user_id uuid,
  username text,
  country text,
  avatar_url text,
  is_guest boolean,
  joined_at timestamptz,
  best_30 real,
  best_60 real,
  tests_taken bigint,
  avg_accuracy real
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    p.id,
    p.username::text,
    p.country::text,
    p.avatar_url,
    p.is_guest,
    p.created_at,
    (select max(r.wpm) from public.results r where r.user_id = p.id and r.duration_s = 30 and r.accuracy >= 95),
    (select max(r.wpm) from public.results r where r.user_id = p.id and r.duration_s = 60 and r.accuracy >= 95),
    (select count(*) from public.results r where r.user_id = p.id),
    (select avg(r.accuracy)::real from public.results r where r.user_id = p.id)
  from public.profiles p
  where p.username = p_username::extensions.citext;
$$;

grant execute on function public.get_leaderboard(int, text, text, text, int) to anon, authenticated;
grant execute on function public.get_profile_stats(text) to anon, authenticated;
