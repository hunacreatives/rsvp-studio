-- Promenade template (src/pages/wedding-sites/templates/promenade): adds it to
-- the catalog as a DRAFT (staff only) while the designers' watercolours are in
-- progress. The preview link works without this row:
--   https://thersvpstudio.com/build/preview/promenade?brief=1  (the designers' brief)
-- When the paintings are in, list it:
--   update templates set status = 'listed', updated_at = now() where id = 'promenade';
-- Safe to re-run.

insert into templates (id, label, kind, tier, status, event_types, sort)
values ('promenade', 'Promenade', 'code', 'free', 'draft', '{wedding}', 90)
on conflict (id) do nothing;
