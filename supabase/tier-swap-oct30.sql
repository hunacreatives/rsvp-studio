-- RSVP Studio: tier changes (Oct 30 2026). Safe to re-run.
-- Run on LIVE (ubonzkfflxqwcwlbemmy) before pushing.
--   Scrapbook, Calado, Rice Paper and Porcelain Garden become Free; Promenade becomes Premium.
--   Sites already paid for as Premium keep Premium (that's on the payment, not the design).

-- 0. Look first: published sites on these designs, and whether each was paid as Premium.
select ws.published_presentation->>'activeTemplateId' as design, e.name,
       exists (select 1 from payments p where p.event_id = e.id and p.kind = 'site_publish'
               and p.status = 'paid' and p.template_tier = 'premium') as paid_premium
from wedding_sites ws join events e on e.id = ws.event_id
where ws.published_at is not null
  and ws.published_presentation->>'activeTemplateId' in ('scrapbook', 'calado', 'tinghun-rice', 'tinghun-porcelain', 'promenade')
order by 1, 2;

-- 1. The change.
update templates set tier = 'free', updated_at = now()
where id in ('scrapbook', 'calado', 'tinghun-rice', 'tinghun-porcelain');
update templates set tier = 'premium', updated_at = now()
where id = 'promenade';

-- Check: expect four free rows and Promenade premium.
select id, label, tier, status from templates
where id in ('scrapbook', 'calado', 'tinghun-rice', 'tinghun-porcelain', 'promenade')
order by tier, label;
