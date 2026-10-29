-- RSVP Studio — Letterpress (Oct 29 2026). ADDITIVE, safe to re-run.
-- Run on LIVE (ubonzkfflxqwcwlbemmy) before pushing.
--   A Premium design for weddings and engagements (a fine-art invitation suite on a linen table,
--   seen from above in window light: the ink-blue envelope's wax seal breaks and the invitation
--   slides out, then each section is one piece of the suite, from the day's program and the
--   fabric swatches to the reply card with its stamped envelope), listed for weddings and
--   engagements. After Rally.
insert into templates (id, label, kind, tier, status, event_types, sort) values
  ('letterpress', 'Letterpress', 'code', 'premium', 'listed', '{wedding,engagement}', 25)
on conflict (id) do update set label = excluded.label, tier = 'premium', status = 'listed', event_types = excluded.event_types, updated_at = now();

-- Check: expect one listed Premium row.
select id, label, tier, status, event_types, sort from templates where id = 'letterpress';
