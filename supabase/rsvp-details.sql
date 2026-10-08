-- RSVP Studio — RSVP details: attending, number of guests, dietary needs.
-- Safe to re-run. Run on STAGING first, then on the live project BEFORE
-- pushing the code that uses it. Only the shared `rsvps` table (self-serve
-- events) gets the columns; legacy per-event tables keep the details in
-- their message text instead (see api/wedding-rsvp.ts).

alter table rsvps add column if not exists attending boolean;
alter table rsvps add column if not exists guest_count int;
alter table rsvps drop constraint if exists rsvps_guest_count_check;
alter table rsvps add constraint rsvps_guest_count_check check (guest_count is null or guest_count between 0 and 20);
alter table rsvps add column if not exists dietary text;
