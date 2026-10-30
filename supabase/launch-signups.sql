-- RSVP Studio: launch-day email list (Oct 30 2026). Safe to re-run.
-- Run on LIVE (ubonzkfflxqwcwlbemmy) before pushing.
--   The launch page's "Notify me" sends the email to the server, which adds it here and sends a
--   one-time thank-you. The site itself can't read or write the list (only the server, and you in
--   the Supabase table editor).

create table if not exists launch_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email) and length(email) <= 254),
  source text check (length(source) <= 80),
  created_at timestamptz not null default now()
);
alter table launch_signups enable row level security;
-- no policies: the browser gets nothing; the server's service key bypasses this
drop policy if exists "anyone can join the launch list" on launch_signups;
revoke all on launch_signups from anon, authenticated;

-- Check: expect the table, empty, with no policies.
select count(*) as signups from launch_signups;
select count(*) as policies from pg_policies where tablename = 'launch_signups';
