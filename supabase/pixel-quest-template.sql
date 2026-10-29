-- RSVP Studio — Pixel Quest (Oct 29 2026). ADDITIVE, safe to re-run.
-- Run on LIVE (ubonzkfflxqwcwlbemmy) before pushing.
--   A Premium design for birthdays, any age (a side-scrolling pixel level the whole page long: a
--   CRT title screen with Press start, the hero running stage to stage from afternoon to night,
--   each part in a pixel dialog window, to the reply at the cake), listed for birthdays and other
--   celebrations, plus the filter-only "party" tag. After Level Up.
insert into templates (id, label, kind, tier, status, event_types, sort) values
  ('pixel-quest', 'Pixel Quest', 'code', 'premium', 'listed', '{birthday,other,party}', 23)
on conflict (id) do update set label = excluded.label, tier = 'premium', status = 'listed', event_types = excluded.event_types, updated_at = now();

-- Check: expect one listed Premium row.
select id, label, tier, status, event_types, sort from templates where id = 'pixel-quest';
