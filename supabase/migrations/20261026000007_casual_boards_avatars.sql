-- Leaderboards now come from casual typing (2 min and Endless), usernames may contain dots,
-- and profile photos are uploaded to Storage.

-- ---------------------------------------------------------------- usernames with dots
alter table public.profiles drop constraint profiles_username_check;
alter table public.profiles add constraint profiles_username_check check (username::text ~ '^[A-Za-z0-9_.-]{3,20}$');

create or replace function public.username_available(name text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select name ~ '^[A-Za-z0-9_.-]{3,20}$'
    and not exists (select 1 from public.profiles p where p.username = name::extensions.citext);
$$;

-- Sign-up no longer asks for a username: derive it from the email (dots kept), e.g. "wendell.jotojot".
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
  base text;
  candidate text;
begin
  if wanted ~ '^[A-Za-z0-9_.-]{3,20}$' then
    candidate := wanted;
  else
    if guest then
      base := 'Guest';
    else
      base := left(btrim(regexp_replace(split_part(coalesce(new.email, ''), '@', 1), '[^A-Za-z0-9_.]', '', 'g'), '.'), 15);
      if char_length(base) < 3 then
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

-- ---------------------------------------------------------------- casual results
-- duration_s: 120 = "2 min" (timed), 0 = "Endless" (untimed, at least 60 s of typing).
alter table public.test_issues drop constraint test_issues_duration_s_check;
alter table public.test_issues add constraint test_issues_duration_s_check check (duration_s in (0, 30, 60, 120));
alter table public.test_issues drop constraint test_issues_kind_check;
alter table public.test_issues add constraint test_issues_kind_check check (kind in ('test', 'daily', 'race', 'casual'));
alter table public.results drop constraint results_kind_check;
alter table public.results add constraint results_kind_check check (kind in ('test', 'daily', 'race', 'casual'));

create index results_casual_idx on public.results (duration_s, lang, wpm desc) where kind = 'casual' and accuracy >= 95;

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
      and r.accuracy >= 95
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

drop function public.get_profile_stats(text);
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
    (select max(r.wpm) from public.results r where r.user_id = p.id and r.kind = 'casual' and r.duration_s = 120 and r.accuracy >= 95),
    (select max(r.wpm) from public.results r where r.user_id = p.id and r.kind = 'casual' and r.duration_s = 0 and r.accuracy >= 95),
    (select count(*) from public.results r where r.user_id = p.id and r.kind = 'casual'),
    (select avg(r.accuracy)::real from public.results r where r.user_id = p.id and r.kind = 'casual'),
    case when p.last_practice_date >= (now() at time zone 'Asia/Manila')::date - 1 then p.streak_current else 0 end,
    p.streak_best
  from public.profiles p
  where p.username = p_username::extensions.citext;
$$;
grant execute on function public.get_profile_stats(text) to anon, authenticated;

-- ---------------------------------------------------------------- profile photos
-- Public bucket (photos show on leaderboards); each user can only write inside their own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 524288, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "Users read their own avatar files" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users upload their own avatar" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users replace their own avatar" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users delete their own avatar" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
