-- RSVP Studio — the "Capiz" template (Oct 22 2026). ADDITIVE, safe to re-run.
-- Run on LIVE before pushing the Capiz code: the gallery row, Premium, listed for weddings
-- between Love Letter (80) and Promenade (90).

insert into templates (id, label, kind, tier, status, event_types, sort)
values ('capiz', 'Capiz', 'code', 'premium', 'listed', '{wedding}', 85)
on conflict (id) do update set tier = 'premium', status = 'listed', updated_at = now();

-- Check: should print 1
select count(*) as capiz_listed from templates where id = 'capiz' and status = 'listed' and tier = 'premium';
