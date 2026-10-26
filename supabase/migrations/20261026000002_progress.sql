-- Journey progress and per-key stats for signed-in users (accounts and guests).
-- Unranked practice data: self-reported by the client, never used for leaderboards.

create table public.lesson_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id text not null check (lesson_id ~ '^l[0-9]{3}$'),
  stars smallint not null default 0 check (stars between 0 and 3),
  best_wpm real not null default 0 check (best_wpm >= 0 and best_wpm < 1000),
  best_accuracy real not null default 0 check (best_accuracy between 0 and 100),
  passed boolean not null default false,
  attempts integer not null default 0 check (attempts >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table public.key_stats (
  user_id uuid not null references auth.users (id) on delete cascade,
  key text not null check (char_length(key) = 1),
  attempts integer not null default 0 check (attempts >= 0),
  misses integer not null default 0 check (misses >= 0),
  total_ms bigint not null default 0 check (total_ms >= 0),
  primary key (user_id, key)
);

alter table public.lesson_progress enable row level security;
alter table public.key_stats enable row level security;

-- Owners only, for every operation.
create policy "Own lesson progress: read" on public.lesson_progress for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Own lesson progress: insert" on public.lesson_progress for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Own lesson progress: update" on public.lesson_progress for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Own lesson progress: delete" on public.lesson_progress for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "Own key stats: read" on public.key_stats for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Own key stats: insert" on public.key_stats for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Own key stats: update" on public.key_stats for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Own key stats: delete" on public.key_stats for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.lesson_progress from anon;
revoke all on public.key_stats from anon;

create trigger lesson_progress_touch_updated_at
  before update on public.lesson_progress
  for each row execute function public.touch_updated_at();
