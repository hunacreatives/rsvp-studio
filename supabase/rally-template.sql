-- RSVP Studio — Rally (Oct 29 2026). ADDITIVE, safe to re-run.
-- Run on LIVE (ubonzkfflxqwcwlbemmy) before pushing.
--   A Premium design for pickleball birthdays, tournaments, open play and club socials (one point
--   played out the whole page long on a real 3D court under floodlights, golden hour to blue hour:
--   each section a shot of a simulated rally, the camera following the ball, and the reply a line
--   call, where a guest's "In" is the host's winning smash), listed for birthdays and other
--   celebrations, plus the filter-only "party" tag. After Pixel Quest.
insert into templates (id, label, kind, tier, status, event_types, sort) values
  ('rally', 'Rally', 'code', 'premium', 'listed', '{birthday,other,party}', 24)
on conflict (id) do update set label = excluded.label, tier = 'premium', status = 'listed', event_types = excluded.event_types, updated_at = now();

-- Check: expect one listed Premium row.
select id, label, tier, status, event_types, sort from templates where id = 'rally';
