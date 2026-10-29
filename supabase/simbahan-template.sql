-- RSVP Studio — Simbahan (Oct 29 2026). ADDITIVE, safe to re-run.
-- Run on LIVE (ubonzkfflxqwcwlbemmy) before pushing.
--   A Premium wedding design: an old Filipino stone church drawn live in real 3D. The great
--   wooden doors swing open into the light and the guest walks down the aisle past the pews, the
--   roses and the candles, under shafts of late sun and brass chandeliers, one stop for each part
--   of the day (the story, the programme, the sponsors, the entourage, what to wear, good to
--   know), to the reply at the altar before the gilded retablo. Each card is a page of a church
--   programme in black and rubric red. Listed for weddings. After Letterpress.
insert into templates (id, label, kind, tier, status, event_types, sort) values
  ('simbahan', 'Simbahan', 'code', 'premium', 'listed', '{wedding}', 26)
on conflict (id) do update set label = excluded.label, tier = 'premium', status = 'listed', event_types = excluded.event_types, updated_at = now();

-- Check: expect one listed Premium row.
select id, label, tier, status, event_types, sort from templates where id = 'simbahan';
