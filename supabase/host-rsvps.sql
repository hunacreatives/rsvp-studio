-- RSVP Studio — hosts manage their own RSVPs (Oct 13 2026). ADDITIVE, safe to re-run. Run on LIVE.
-- The Guests tab can add a reply by hand ("Tito called"), fix one, or remove one. Only the
-- event's owner/members (and staff), only on the shared rsvps table. Replies added by hand
-- may have no email or mobile, so they're marked added_by_host.

alter table rsvps add column if not exists added_by_host boolean not null default false;
alter table rsvps drop constraint if exists rsvps_contact_check;
alter table rsvps add constraint rsvps_contact_check check (email is not null or phone is not null or added_by_host);

drop policy if exists "rsvps_members_insert" on rsvps;
create policy "rsvps_members_insert" on rsvps for insert
  with check (added_by_host and can_access_event(event_id));
drop policy if exists "rsvps_members_update" on rsvps;
create policy "rsvps_members_update" on rsvps for update
  using (can_access_event(event_id)) with check (can_access_event(event_id));
drop policy if exists "rsvps_members_delete" on rsvps;
create policy "rsvps_members_delete" on rsvps for delete
  using (can_access_event(event_id));

-- Check: should print 1 | 3
select
  (select count(*) from information_schema.columns where table_name = 'rsvps' and column_name = 'added_by_host') as added_by_host,
  (select count(*) from pg_policies where tablename = 'rsvps' and policyname in ('rsvps_members_insert', 'rsvps_members_update', 'rsvps_members_delete')) as host_policies;
