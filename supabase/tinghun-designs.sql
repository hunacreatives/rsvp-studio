-- RSVP Studio — the three Ting Hun designs (Oct 24 2026). ADDITIVE, safe to re-run.
-- Run on LIVE (ubonzkfflxqwcwlbemmy) before pushing. Needs engagement-events.sql (already run).
--   Rice Paper, Lacquer Door and Porcelain Garden: Premium, listed, for engagements.
--   The placeholder `tinghun` row from engagement-events.sql has no design behind it: hidden.
insert into templates (id, label, kind, tier, status, event_types, sort) values
  ('tinghun-rice', 'Rice Paper', 'code', 'premium', 'listed', '{engagement}', 98),
  ('tinghun-lacquer', 'Lacquer Door', 'code', 'premium', 'listed', '{engagement}', 99),
  ('tinghun-porcelain', 'Porcelain Garden', 'code', 'premium', 'listed', '{engagement}', 100)
on conflict (id) do update set tier = 'premium', status = 'listed', event_types = '{engagement}', updated_at = now();

update templates set status = 'hidden', updated_at = now() where id = 'tinghun';

-- Check: expect 3 listed rows and tinghun hidden.
select id, label, tier, status, event_types from templates where id like 'tinghun%' order by sort;
