-- RSVP Studio — Sprinkles (Oct 30 2026). ADDITIVE, safe to re-run.
-- Run on LIVE (ubonzkfflxqwcwlbemmy) before pushing.
--   A Premium design for birthdays (a cake's frosting as the page; every big heading is made of
--   real sprinkles that pour in, tumble and settle into the letters as its section arrives,
--   starting with the name and the age, then fall away as the page moves on; strawberry with
--   rainbow sprinkles, chocolate with pastels, or vanilla with gold and white), listed for
--   birthdays and parties. After Ink and vows.
insert into templates (id, label, kind, tier, status, event_types, sort) values
  ('sprinkles', 'Sprinkles', 'code', 'premium', 'listed', '{birthday,other,party}', 28)
on conflict (id) do update set label = excluded.label, tier = 'premium', status = 'listed', event_types = excluded.event_types, updated_at = now();

-- Check: expect one listed Premium row.
select id, label, tier, status, event_types, sort from templates where id = 'sprinkles';
