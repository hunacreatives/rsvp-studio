-- Debut template (src/pages/wedding-sites/templates/debut): adds it to the
-- template catalog as a FREE, LISTED design (shown for every occasion).
-- Safe to re-run.

insert into templates (id, label, kind, tier, status, event_types, sort)
values ('debut', 'Debut', 'code', 'free', 'listed', '{}', 70)
on conflict (id) do update
  set tier = 'free', status = 'listed', updated_at = now();
