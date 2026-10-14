-- Pickleball template (src/pages/wedding-sites/templates/pickleball): adds it
-- to the template catalog as a FREE, LISTED design, so every host sees it in
-- the builder's gallery. Safe to re-run.

insert into templates (id, label, kind, tier, status, event_types, sort)
values ('pickleball', 'Pickleball', 'code', 'free', 'listed', '{}', 60)
on conflict (id) do update
  set tier = 'free', status = 'listed', updated_at = now();
