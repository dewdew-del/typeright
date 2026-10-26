-- Profiles: one row per auth user (accounts and anonymous guests).
-- Rows are created by a trigger on sign-up; users can edit only a few columns of their own row.

create extension if not exists citext with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username extensions.citext not null unique check (username::text ~ '^[A-Za-z0-9_-]{3,20}$'),
  country char(2) not null default 'PH' check (country ~ '^[A-Z]{2}$'),
  avatar_url text check (avatar_url is null or (avatar_url ~ '^https://' and char_length(avatar_url) <= 500)),
  is_guest boolean not null default false,
  tested_out_stages smallint[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Public profile pages and leaderboards need to read usernames and countries.
create policy "Profiles are readable by everyone"
  on public.profiles for select
  to anon, authenticated
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Column-level limits: is_guest, id and timestamps are never client-editable.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (username, country, avatar_url, tested_out_stages) on public.profiles to authenticated;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Creates the profile on sign-up. Uses the requested username when valid; otherwise derives one
-- from the email (accounts) or "Guest-1234" (anonymous guests), adding digits until it is free.
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
  if wanted ~ '^[A-Za-z0-9_-]{3,20}$' then
    candidate := wanted; -- the client checks availability first; a clash fails the sign-up
  else
    if guest then
      base := 'Guest';
    else
      base := left(regexp_replace(split_part(coalesce(new.email, ''), '@', 1), '[^A-Za-z0-9_]', '', 'g'), 15);
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- A guest who links an email or Google account keeps the same id; mark the profile as a full account.
create or replace function public.handle_user_upgraded()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set is_guest = false where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_upgraded
  after update of is_anonymous on auth.users
  for each row
  when (old.is_anonymous is true and new.is_anonymous is false)
  execute function public.handle_user_upgraded();

-- Trigger functions must not be callable through the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_upgraded() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;

-- Sign-up form check: is this username valid and free?
create or replace function public.username_available(name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select name ~ '^[A-Za-z0-9_-]{3,20}$'
    and not exists (select 1 from public.profiles p where p.username = name::extensions.citext);
$$;

revoke execute on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;
