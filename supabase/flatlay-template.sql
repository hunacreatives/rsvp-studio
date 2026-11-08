-- RSVP Studio — Flat Lay (Nov 8 2026). ADDITIVE, safe to re-run.
-- Run on LIVE (ubonzkfflxqwcwlbemmy) before pushing.
--   A Premium pickleball design (one terracotta court from straight above in a low morning sun,
--   the words painted on it in court-line paint, a line-marking robot painting them in at the
--   start, Blender props under the same sun), listed for birthdays and other celebrations, plus
--   the filter-only "party" tag. Sort 101 (The Paddle Case is 102).
insert into templates (id, label, kind, tier, status, event_types, sort) values
  ('flatlay', 'Flat Lay', 'code', 'premium', 'listed', '{birthday,other,party}', 101)
on conflict (id) do update set label = excluded.label, tier = 'premium', status = 'listed', event_types = excluded.event_types, sort = excluded.sort, updated_at = now();

-- Check: expect one listed Premium row.
select id, label, tier, status, event_types, sort from templates where id = 'flatlay';
