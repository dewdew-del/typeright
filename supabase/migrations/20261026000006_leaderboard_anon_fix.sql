-- get_leaderboard mentions group_members (optional group filter). Logged-out visitors need the table
-- privilege for the query to run; RLS has no anon policy, so they still see zero member rows.
grant select on public.group_members to anon;
