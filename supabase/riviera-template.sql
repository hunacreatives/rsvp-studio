-- RSVP Studio — Riviera (Oct 28 2026). ADDITIVE, safe to re-run.
-- Run on LIVE (ubonzkfflxqwcwlbemmy) before pushing.
--   A Premium yacht-party design (one yacht seen from above, the whole page long, on a
--   real-time sea), listed for birthdays, engagements, anniversaries and other celebrations,
--   plus the filter-only "party" tag (the new Parties chip on /build; like "debut", the events
--   table never checks it). Third in the gallery. Change its place anytime in Studio → Templates.
insert into templates (id, label, kind, tier, status, event_types, sort) values
  ('riviera', 'Riviera', 'code', 'premium', 'listed', '{birthday,engagement,anniversary,other,party}', 17)
on conflict (id) do update set label = excluded.label, tier = 'premium', status = 'listed', event_types = excluded.event_types, updated_at = now();

-- Check: expect one listed Premium row.
select id, label, tier, status, event_types, sort from templates where id = 'riviera';
