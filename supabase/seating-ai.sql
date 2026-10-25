-- RSVP Studio — Mesa: reading a venue's floor plan with AI (Oct 25 2026).
-- ADDITIVE, safe to re-run. Run on LIVE before pushing the floor plan reader.
--   seating_ai_uses   one row each time someone has a floor plan read. Only the server
--                     (service role) reads or writes it; it keeps each account to a few
--                     reads a day and the whole site to a daily ceiling.

create table if not exists seating_ai_uses (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists seating_ai_uses_user_idx on seating_ai_uses (user_id, created_at desc);
create index if not exists seating_ai_uses_day_idx on seating_ai_uses (created_at desc);

-- No policies: browsers can't read or write it, only the server.
alter table seating_ai_uses enable row level security;

-- Check: should print 1 | t
select
  (select count(*) from information_schema.tables where table_name = 'seating_ai_uses') as uses_table,
  (select relrowsecurity from pg_class where relname = 'seating_ai_uses') as rls_on;
