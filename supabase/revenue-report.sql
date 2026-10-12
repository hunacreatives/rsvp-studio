-- RSVP Studio — Studio → Revenue (owner only).
-- Every paid item in a period, one row each, with what it cost us (domains: Vercel's
-- US$ price × the ₱ rate in domain_settings) and the partner commission it earned.
-- Package payments are counted from paid invoices (an invoice paid through PayMongo
-- also has a payments row — that one is skipped so nothing counts twice).
-- ADDITIVE, safe to re-run. Needs partner-tiers.sql and team-roles.sql. Run on LIVE before pushing.

create or replace function revenue_items(p_from timestamptz, p_to timestamptz)
returns table (paid_at timestamptz, source text, amount numeric, cost numeric, commission numeric, event_id uuid, label text, method text)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not coalesce(is_owner(), false) then raise exception 'NOT_ALLOWED'; end if;
  return query
  -- Packages: paid invoices
  select i.paid_at, 'package'::text, i.amount::numeric, 0::numeric,
         case when e.partner_code is not null then round(i.amount * event_partner_rate(e.id) / 100, 2) else 0 end::numeric,
         i.event_id,
         concat_ws(' — ', e.name, i.description),
         (select p.method from payments p where p.invoice_id = i.id and p.status = 'paid' order by p.paid_at desc limit 1)
  from invoices i left join events e on e.id = i.event_id
  where i.status = 'paid' and i.paid_at >= p_from and i.paid_at < p_to
  union all
  -- Premium / publishing fees
  select p.paid_at, 'premium', (p.amount_centavos / 100.0)::numeric, 0::numeric,
         case when e.partner_code is not null then round(p.amount_centavos / 100.0 * event_partner_rate(e.id) / 100, 2) else 0 end::numeric,
         p.event_id, concat_ws(' — ', e.name, coalesce(p.description, 'Premium')), p.method
  from payments p left join events e on e.id = p.event_id
  where p.kind = 'site_publish' and p.status = 'paid' and p.paid_at >= p_from and p.paid_at < p_to
  union all
  -- Custom domains and renewals (cost = what Vercel charged, in ₱)
  select p.paid_at, case when p.kind = 'domain' then 'domain' else 'renewal' end, (p.amount_centavos / 100.0)::numeric,
         round(coalesce(p.domain_price_usd, 0) * coalesce((select fx_rate from domain_settings where id = 1), 0), 2)::numeric,
         0::numeric, p.event_id, coalesce(p.domain, p.description), p.method
  from payments p
  where p.kind in ('domain', 'domain_renewal') and p.status = 'paid' and p.paid_at >= p_from and p.paid_at < p_to;
end;
$$;
revoke all on function revenue_items(timestamptz, timestamptz) from public, anon;
grant execute on function revenue_items(timestamptz, timestamptz) to authenticated;

-- Partner payouts made in a period (money actually sent to partners).
create or replace function revenue_payouts(p_from date, p_to date)
returns table (paid_at date, amount numeric, partner text, note text)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not coalesce(is_owner(), false) then raise exception 'NOT_ALLOWED'; end if;
  return query
  select po.paid_at, po.amount, pa.name, po.note
  from partner_payouts po join partners pa on pa.id = po.partner_id
  where po.paid_at >= p_from and po.paid_at < p_to
  order by po.paid_at desc;
end;
$$;
revoke all on function revenue_payouts(date, date) from public, anon;
grant execute on function revenue_payouts(date, date) to authenticated;

grant execute on function is_owner() to authenticated;

-- Check (the report itself is owner-only, so it can't run from the SQL editor):
select count(*) as functions_ok from pg_proc where proname in ('revenue_items', 'revenue_payouts');
