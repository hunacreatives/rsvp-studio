-- Love Letter template (src/pages/wedding-sites/templates/love-letter): adds it
-- to the template catalog as a FREE, LISTED design. Safe to re-run.

insert into templates (id, label, kind, tier, status, event_types, sort)
values ('love-letter', 'Love Letter', 'code', 'free', 'listed', '{wedding}', 80)
on conflict (id) do update
  set tier = 'free', status = 'listed', updated_at = now();
