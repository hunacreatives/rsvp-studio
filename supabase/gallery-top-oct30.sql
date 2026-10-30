-- RSVP Studio: gallery order (Oct 30 2026). Safe to re-run, and fine whether or not the earlier
-- version of this file was run. Run on LIVE (ubonzkfflxqwcwlbemmy). No push needed.
--   The top of the gallery: Simbahan, Promenade, Safari, Level Up, Pixel Quest, Summit, The Blue,
--   then Riviera, Poolside and Rally. Every other design keeps its order after these
--   (Premium still before Free).

-- 1. Make room: every other design moves down, keeping its order (only once).
update templates set sort = sort + 100, updated_at = now()
where id not in ('simbahan', 'promenade', 'safari', 'levelup', 'pixel-quest', 'summit', 'freedive',
                 'riviera', 'poolside', 'rally')
  and sort < 100;

-- 2. The top ten, in order.
update templates t set sort = v.n, updated_at = now()
from (values ('simbahan', 1), ('promenade', 2), ('safari', 3), ('levelup', 4),
             ('pixel-quest', 5), ('summit', 6), ('freedive', 7),
             ('riviera', 8), ('poolside', 9), ('rally', 10)) as v(id, n)
where t.id = v.id;

-- Check: the gallery order.
select id, label, tier, sort from templates where status = 'listed'
order by (tier = 'premium') desc, sort, label;
