-- Developer-only view of recent sessions (who has used the site lately). Only the developer's confirmed
-- Google/email account may call it; everyone else gets "not allowed".
create or replace function public.admin_recent_sessions(p_hours int default 24)
returns table (username text, is_guest boolean, country text, last_seen timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from auth.users u
    where u.id = auth.uid() and lower(u.email) = 'jotojotdell@gmail.com' and u.email_confirmed_at is not null
  ) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
  select p.username::text, p.is_guest, p.country::text, greatest(s.refreshed_at, s.updated_at, s.created_at)
  from auth.sessions s
  join public.profiles p on p.id = s.user_id
  where greatest(s.refreshed_at, s.updated_at, s.created_at) > now() - make_interval(hours => least(greatest(p_hours, 1), 168))
  order by 4 desc
  limit 200;
end;
$$;
revoke all on function public.admin_recent_sessions(int) from public, anon;
grant execute on function public.admin_recent_sessions(int) to authenticated;
