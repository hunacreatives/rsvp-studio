-- RSVP Studio — the partner application, from the applicant's side (Oct 25 2026). ADDITIVE, safe to re-run.
-- Run on LIVE (ubonzkfflxqwcwlbemmy) before pushing.
--   my_partner_application(): the signed-in person's latest partner application (matched by
--   their login email, the same way my_partner() finds an approved partner), so /partners and
--   the Coordinator desk can say "your application is in" instead of asking again.
--   Only its status and date come back, never the answers.
--   partner_revenue(): also leaves out invoices on a partner's own client event that were paid
--   off-checkout (marked paid by the studio, no payment record) before the event was handed
--   over. Those are the partner's own money, like the checkout payments already left out, so
--   they earn no commission and don't count toward a tier.

create or replace function my_partner_application()
returns table (status text, created_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select e.status, e.created_at
  from enquiries e
  where auth.uid() is not null
    and e.form = 'partner-inquiry'
    and lower(e.email) = lower(auth.jwt() ->> 'email')
  order by e.created_at desc
  limit 1;
$$;
revoke all on function my_partner_application() from public, anon;
grant execute on function my_partner_application() to authenticated;

-- coordinator-desk.sql's partner_revenue, plus the off-checkout invoices above.
create or replace function partner_revenue(p_event uuid)
returns numeric
language sql stable security definer set search_path = public
as $$
  select greatest(event_revenue(p_event)
    -- paid at checkout by the partner (matched by the payer's email)
    - coalesce((
        select sum(pm.amount_centavos) / 100.0
        from payments pm
        join profiles payer on payer.id = pm.profile_id
        join events e on e.id = pm.event_id
        join partners pa on pa.code = e.partner_code
        where pm.event_id = p_event and pm.kind in ('site_publish', 'invoice') and pm.status = 'paid'
          and pa.email is not null and lower(payer.email) = lower(pa.email)
      ), 0)
    -- paid off-checkout while it was still the partner's client event (before hand-over)
    - coalesce((
        select sum(i.amount)
        from invoices i
        join events e on e.id = i.event_id
        join partners pa on pa.code = e.partner_code
        join profiles coord on coord.id = e.client_of
        where i.event_id = p_event and i.status = 'paid'
          and pa.email is not null and lower(coord.email) = lower(pa.email)
          and (e.handed_over_at is null or coalesce(i.paid_at, i.created_at) < e.handed_over_at)
          and not exists (select 1 from payments pm where pm.invoice_id = i.id and pm.status = 'paid')
      ), 0), 0);
$$;
revoke all on function partner_revenue(uuid) from public, anon, authenticated;

-- Check: should print 1 | 1
select (select count(*) from pg_proc where proname = 'my_partner_application') as partner_application,
       (select count(*) from pg_proc where proname = 'partner_revenue' and prosrc like '%handed_over_at%') as own_invoices_out;
