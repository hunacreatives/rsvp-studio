-- RSVP Studio — Safari (Oct 28 2026). ADDITIVE, safe to re-run.
-- Run on LIVE (ubonzkfflxqwcwlbemmy) before pushing.
--   A Premium design for children's birthdays (a paper-cut storybook savanna driven through in a
--   jeep, the animals telling each part in speech bubbles, a safari pass for the reply), listed
--   for birthdays, baby (first birthdays) and other celebrations, plus the filter-only "party" tag.
insert into templates (id, label, kind, tier, status, event_types, sort) values
  ('safari', 'Safari', 'code', 'premium', 'listed', '{birthday,baby,other,party}', 21)
on conflict (id) do update set label = excluded.label, tier = 'premium', status = 'listed', event_types = excluded.event_types, updated_at = now();

-- Check: expect one listed Premium row.
select id, label, tier, status, event_types, sort from templates where id = 'safari';
