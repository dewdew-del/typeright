-- Stage 8: nightly cleanup so the free-plan database stays small.
-- Runs at 03:17 UTC via pg_cron (free on Supabase).

create extension if not exists pg_cron;

create or replace function private.cleanup()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Keystroke logs are only an audit trail: keep 30 days. The scores stay in results.
  delete from public.result_logs l
  using public.results r
  where r.id = l.result_id and r.created_at < now() - interval '30 days';

  -- Texts handed out but never submitted. Consumed issues are referenced by results, so keep those.
  delete from public.test_issues
  where consumed_at is null and issued_at < now() - interval '1 day';

  -- Rate-limit history only matters for the last hour or so.
  delete from public.submission_attempts where created_at < now() - interval '2 days';

  -- Rooms that never started a race.
  delete from public.rooms where status = 'lobby' and created_at < now() - interval '1 day';

  -- Guest sessions live in one browser tab, so old anonymous users are orphans.
  -- 14 days keeps them on the weekly board until it rolls over. Cascades to their rows.
  delete from auth.users where is_anonymous and created_at < now() - interval '14 days';
end;
$$;

revoke all on function private.cleanup() from public, anon, authenticated;

select cron.unschedule('typeright-cleanup') where exists (select 1 from cron.job where jobname = 'typeright-cleanup');
select cron.schedule('typeright-cleanup', '17 3 * * *', 'select private.cleanup()');
