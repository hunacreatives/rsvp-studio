-- RSVP Studio — In Bloom (cinematic) and Open Play become FREE designs (Oct 29 2026).
-- Run on LIVE (ubonzkfflxqwcwlbemmy) before pushing. Safe to re-run.
update templates set tier = 'free', updated_at = now() where id in ('cinematic', 'open-play');

-- Check: expect both rows with tier free.
select id, label, tier, status, sort from templates where id in ('cinematic', 'open-play');
