-- RSVP Studio — Poolside (Oct 28 2026). ADDITIVE, safe to re-run.
-- Run on LIVE (ubonzkfflxqwcwlbemmy) before pushing.
--   A Premium pool-party design (a resort pool seen from above, the whole page long, its water
--   drawn live), listed for birthdays and other celebrations, plus the filter-only "party" tag
--   (the Parties chip on /build). Right after Riviera in the gallery.
insert into templates (id, label, kind, tier, status, event_types, sort) values
  ('poolside', 'Poolside', 'code', 'premium', 'listed', '{birthday,other,party}', 18)
on conflict (id) do update set label = excluded.label, tier = 'premium', status = 'listed', event_types = excluded.event_types, updated_at = now();

-- Check: expect one listed Premium row.
select id, label, tier, status, event_types, sort from templates where id = 'poolside';
