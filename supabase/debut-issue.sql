-- RSVP Studio — The Debut Issue (Oct 24 2026). ADDITIVE, safe to re-run.
-- Run on LIVE (ubonzkfflxqwcwlbemmy) before pushing.
--   A Premium debut design (a fashion-magazine issue), listed for birthdays and debuts,
--   second in the gallery (after Capiz). Change its place anytime in Studio → Templates.
insert into templates (id, label, kind, tier, status, event_types, sort) values
  ('debut-issue', 'Debut Issue', 'code', 'premium', 'listed', '{birthday,debut}', 15)
on conflict (id) do update set label = excluded.label, tier = 'premium', status = 'listed', event_types = excluded.event_types, updated_at = now();

-- Check: expect one listed Premium row.
select id, label, tier, status, event_types, sort from templates where id = 'debut-issue';
