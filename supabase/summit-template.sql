-- RSVP Studio — Summit (Oct 28 2026). ADDITIVE, safe to re-run.
-- Run on LIVE (ubonzkfflxqwcwlbemmy) before pushing.
--   A Premium design for climbers and hikers (a Philippine mountain, all rainforest, the camera
--   rising up it as the guest scrolls, through the cloud, to the reply at the top), listed for
--   birthdays and other celebrations, plus the filter-only "party" tag. After The Blue.
insert into templates (id, label, kind, tier, status, event_types, sort) values
  ('summit', 'Summit', 'code', 'premium', 'listed', '{birthday,other,party}', 20)
on conflict (id) do update set label = excluded.label, tier = 'premium', status = 'listed', event_types = excluded.event_types, updated_at = now();

-- Check: expect one listed Premium row.
select id, label, tier, status, event_types, sort from templates where id = 'summit';
