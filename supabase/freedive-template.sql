-- RSVP Studio — The Blue (Oct 28 2026). ADDITIVE, safe to re-run.
-- Run on LIVE (ubonzkfflxqwcwlbemmy) before pushing.
--   A Premium design for divers and sea lovers (a level camera at the waterline, then down the
--   dive line as the guest scrolls, to the reply at full depth), listed for birthdays and other
--   celebrations, plus the filter-only "party" tag (Parties chip on /build). After Poolside.
insert into templates (id, label, kind, tier, status, event_types, sort) values
  ('freedive', 'The Blue', 'code', 'premium', 'listed', '{birthday,other,party}', 19)
on conflict (id) do update set label = excluded.label, tier = 'premium', status = 'listed', event_types = excluded.event_types, updated_at = now();

-- Check: expect one listed Premium row.
select id, label, tier, status, event_types, sort from templates where id = 'freedive';
