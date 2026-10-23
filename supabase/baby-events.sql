-- RSVP Studio — baby events + the Calado template (Oct 23 2026). ADDITIVE, safe to re-run.
-- Run on LIVE before pushing.
--   1. events.event_type can be 'baby' (a christening, first birthday, both, or a dedication;
--      the design asks which). Hosts pick "Christening & First Birthday" when creating.
--   2. rsvps.kid_count: how many of a reply's party are kids (Calado asks adults and kids
--      separately; venues charge per head). Part of guest_count, never more than it.
--   3. The Calado catalog row: Premium, listed, for baby events.

-- 1. The event type
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'events'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%event_type%'
  loop
    execute format('alter table events drop constraint %I', c);
  end loop;
  alter table events add constraint events_event_type_check
    check (event_type in ('wedding', 'birthday', 'anniversary', 'baby', 'other'));
end $$;

-- 2. Kids in a reply
alter table rsvps add column if not exists kid_count int check (kid_count is null or (kid_count >= 0 and kid_count <= 20));

-- 3. Calado
insert into templates (id, label, kind, tier, status, event_types, sort)
values ('calado', 'Calado', 'code', 'premium', 'listed', '{baby}', 95)
on conflict (id) do update set tier = 'premium', status = 'listed', event_types = '{baby}', updated_at = now();

-- Check: should print 1 | 1 | 1
select
  (select count(*) from pg_constraint where conname = 'events_event_type_check' and pg_get_constraintdef(oid) ilike '%baby%') as baby_type,
  (select count(*) from information_schema.columns where table_name = 'rsvps' and column_name = 'kid_count') as kid_count,
  (select count(*) from templates where id = 'calado' and status = 'listed') as calado_listed;
