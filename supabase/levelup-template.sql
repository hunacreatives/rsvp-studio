-- RSVP Studio — Level Up (Oct 29 2026). ADDITIVE, safe to re-run.
-- Run on LIVE (ubonzkfflxqwcwlbemmy) before pushing.
--   A Premium design for gamers, any age (a low-poly island in real 3D, a title screen with
--   Press start, flown over quest by quest to the reply at the castle), listed for birthdays and
--   other celebrations, plus the filter-only "party" tag.
insert into templates (id, label, kind, tier, status, event_types, sort) values
  ('levelup', 'Level Up', 'code', 'premium', 'listed', '{birthday,other,party}', 22)
on conflict (id) do update set label = excluded.label, tier = 'premium', status = 'listed', event_types = excluded.event_types, updated_at = now();

-- Check: expect one listed Premium row.
select id, label, tier, status, event_types, sort from templates where id = 'levelup';
