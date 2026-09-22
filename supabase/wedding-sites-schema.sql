-- RSVP Studio — wedding website template builder schema (ADDITIVE)
-- Paste this into the SQL editor for the-rsvp-studio project, AFTER
-- portal-schema.sql has already been run.
--
-- This does NOT modify or touch profiles / events / event_members /
-- invite_codes, or any per-event RSVP table (francesjash_rsvps,
-- tercel_rsvps, etc.) — it only adds a new table linking an existing
-- `events` row to that event's site content + presentation. Table is
-- still named `wedding_sites` for historical reasons (see
-- docs/template-builder-decisions.md) but is generic across event types.

create table if not exists wedding_sites (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique references events (id) on delete cascade,
  slug text not null unique, -- public URL: /invite/:slug

  -- The builder always reads/writes draft_*. "Publish" is the one
  -- explicit action that copies draft_* into published_*. See Decision 6
  -- in docs/template-builder-decisions.md.
  draft_content jsonb not null default '{}'::jsonb,
  draft_presentation jsonb not null default '{}'::jsonb,

  published_content jsonb,        -- null until first Publish
  published_presentation jsonb,
  published_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table wedding_sites enable row level security;

-- Anyone can read a PUBLISHED site (the public wedding page); only the
-- event's own owner/members can read the row at all otherwise (which,
-- since RLS is row-level not column-level, also exposes draft_* to
-- members — acceptable for V1 since draft content isn't sensitive, and
-- the public /invite/:slug route only ever queries published_* client-side.
-- Revisit by splitting into two tables if that assumption changes).
create policy "wedding_sites_select_own_or_public" on wedding_sites
  for select using (
    published_at is not null
    or event_id in (select event_id from event_members where profile_id = auth.uid())
    or event_id in (select id from events where owner_id = auth.uid())
  );

create policy "wedding_sites_update_own" on wedding_sites
  for update using (
    event_id in (select event_id from event_members where profile_id = auth.uid())
    or event_id in (select id from events where owner_id = auth.uid())
  );

create policy "wedding_sites_insert_own" on wedding_sites
  for insert with check (
    event_id in (select event_id from event_members where profile_id = auth.uid())
    or event_id in (select id from events where owner_id = auth.uid())
  );

create or replace function wedding_sites_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_wedding_sites_update on wedding_sites;
create trigger on_wedding_sites_update
  before update on wedding_sites
  for each row execute function wedding_sites_set_updated_at();
