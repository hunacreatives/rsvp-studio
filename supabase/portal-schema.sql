-- The RSVP Studio — client portal schema
-- Paste this into the SQL editor for the-rsvp-studio project
-- (https://ubonzkfflxqwcwlbemmy.supabase.co).
--
-- This project already hosts one table per event (francesjash_rsvps,
-- tercel_rsvps, ...) that each event site's own /admin page reads from
-- directly with the anon key. This schema does NOT touch those tables or
-- their access — it only adds new tables for the portal (accounts, and a
-- mapping from a client's account to which existing RSVP table is theirs).

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles (id) on delete set null,
  name text not null,
  event_date date,
  status text not null default 'upcoming' check (status in ('upcoming', 'past', 'archived')),
  -- name of the existing table in this project that holds this event's
  -- RSVPs, e.g. 'francesjash_rsvps' or 'tercel_rsvps'.
  table_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists event_members (
  event_id uuid not null references events (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner', 'viewer')),
  primary key (event_id, profile_id)
);

create table if not exists invite_codes (
  code text primary key,
  event_id uuid not null references events (id) on delete cascade,
  used_at timestamptz
);

-- Auto-create a profile row whenever someone signs up
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Row-level security — only on the new portal tables. francesjash_rsvps,
-- tercel_rsvps, and any other existing per-event table are left exactly as
-- they are today; the portal reads them the same way each event's own
-- /admin page already does.
alter table profiles enable row level security;
alter table events enable row level security;
alter table event_members enable row level security;
alter table invite_codes enable row level security;

create policy "profiles_self" on profiles
  for select using (id = auth.uid());

create policy "events_select_own" on events
  for select using (
    owner_id = auth.uid()
    or id in (select event_id from event_members where profile_id = auth.uid())
  );

create policy "event_members_select_own" on event_members
  for select using (profile_id = auth.uid());

-- invite_codes has no client-facing policies at all — redemption happens
-- server-side (api/link-event.ts) using the service-role key, which
-- bypasses RLS. No one should be able to read or guess codes via the
-- anon key.

-- Seed rows for the two events already live in this project. event_date
-- left null — fill in via the Table Editor once you have the real dates.
-- Run once; link each to a client's account afterward by generating an
-- invite code (see the invite_codes table above) or setting owner_id
-- directly once that client has signed up.
insert into events (name, table_name)
values
  ('Frances Jash 1st Birthday', 'francesjash_rsvps'),
  ('Tercel''s 41st Birthday', 'tercel_rsvps')
on conflict do nothing;
