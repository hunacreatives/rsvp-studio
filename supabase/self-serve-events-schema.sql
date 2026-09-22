-- RSVP Studio — self-serve event creation schema (ADDITIVE)
-- Paste this into the SQL editor for the-rsvp-studio project, AFTER
-- portal-schema.sql and wedding-sites-schema.sql have already been run.
--
-- This does NOT touch profiles / event_members / invite_codes /
-- wedding_sites, or any existing per-event RSVP table (francesjash_rsvps,
-- tercel_rsvps, etc.). It adds:
--   1. An `event_type` column on `events`, used by the self-serve
--      "Create Event" quick-start form.
--   2. The one RLS policy that was missing before: an authenticated user
--      inserting an `events` row they own. Today `events` rows only ever
--      get created by staff directly in the dashboard/service-role
--      context — this is what actually unlocks self-serve creation.
--   3. `events.table_name` becomes nullable. Legacy events keep their
--      value (pointing at their own hand-provisioned table); self-serve
--      events leave it null and use the new shared `rsvps` table below
--      instead — see docs/template-builder-decisions.md for why.
--   4. A new shared `rsvps` table for self-serve events only.

alter table events add column if not exists event_type text
  check (event_type in ('wedding', 'birthday', 'anniversary', 'other'));

alter table events alter column table_name drop not null;

create policy "events_insert_own" on events
  for insert with check (owner_id = auth.uid());

create table if not exists rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  name text not null,
  email text not null,
  message text,
  created_at timestamptz not null default now()
);

alter table rsvps enable row level security;

-- Guests submitting an RSVP are not authenticated, so insert is public —
-- mirrors how the legacy per-event tables are written today (via the
-- service-role key in api/wedding-rsvp.ts, which bypasses RLS anyway,
-- but this policy also allows a future client-side insert path).
create policy "rsvps_insert_public" on rsvps
  for insert with check (true);

create policy "rsvps_select_own" on rsvps
  for select using (
    event_id in (select event_id from event_members where profile_id = auth.uid())
    or event_id in (select id from events where owner_id = auth.uid())
  );
