-- RSVP Studio — The Paddle Case (Nov 8 2026). ADDITIVE, safe to re-run.
-- Run on LIVE (ubonzkfflxqwcwlbemmy) before pushing.
--   A Premium pickleball design: a premium paddle case open on a walnut table, seen from above
--   (a Blender still), every word on an object in it; the camera moves from object to object as
--   the guest scrolls. Listed for birthdays and other celebrations, plus the filter-only "party"
--   tag. After Flat Lay (101).
insert into templates (id, label, kind, tier, status, event_types, sort) values
  ('paddlecase', 'The Paddle Case', 'code', 'premium', 'listed', '{birthday,other,party}', 102)
on conflict (id) do update set label = excluded.label, tier = 'premium', status = 'listed', event_types = excluded.event_types, updated_at = now();

-- Check: expect one listed Premium row.
select id, label, tier, status, event_types, sort from templates where id = 'paddlecase';
