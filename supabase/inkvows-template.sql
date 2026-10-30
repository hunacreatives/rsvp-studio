-- RSVP Studio — Ink and vows (Oct 30 2026). ADDITIVE, safe to re-run.
-- Run on LIVE (ubonzkfflxqwcwlbemmy) before pushing.
--   A Premium design for weddings and engagements: editorial calligraphy on one long sheet of
--   heavy cotton paper, close up. A pen writes the couple's names stroke by stroke, the ink wet
--   and then drying into the fibres, then each section's heading as the guest reaches it (the
--   story with a gilded initial, the day, the venue, the entourage, attire, where to stay, gifts,
--   questions) down to the reply with a wax seal pressed on it. Listed for weddings and
--   engagements. After Simbahan.
insert into templates (id, label, kind, tier, status, event_types, sort) values
  ('inkvows', 'Ink and vows', 'code', 'premium', 'listed', '{wedding,engagement}', 27)
on conflict (id) do update set label = excluded.label, tier = 'premium', status = 'listed', event_types = excluded.event_types, updated_at = now();

-- Check: expect one listed Premium row.
select id, label, tier, status, event_types, sort from templates where id = 'inkvows';
