-- RSVP Studio — partner tiers (Oct 12 2026).
--   Starter 10% · Silver 15% at 5 paying clients · Gold 20% at 15 paying clients.
--   Clients always get 10% off. A booking keeps the rate the partner was on when that
--   client first paid (never backdated). Tiers never go down. Studio can set a custom
--   rate for a partner instead (rate_mode = 'custom', uses partners.rate).
-- ADDITIVE, safe to re-run. Needs revenue.sql and discounts.sql. Run on LIVE before pushing.

alter table partners add column if not exists rate_mode text not null default 'tiered';
alter table partners drop constraint if exists partners_rate_mode_check;
alter table partners add constraint partners_rate_mode_check check (rate_mode in ('tiered', 'custom'));
alter table partners add column if not exists paying_peak int not null default 0;  -- tiers never go down
alter table events add column if not exists partner_rate numeric(5, 2);            -- locked when the client first pays
alter table partners add column if not exists welcomed_at timestamptz;             -- welcome email sent

-- A partner's tier. p_exclude: leave one project out of the count (the one being paid
-- right now, so the client who reaches a tier is still paid at the tier before it).
create or replace function partner_tier(p_code text, p_exclude uuid default null)
returns table (tier text, rate numeric, paying bigint, next_tier text, next_at int, next_rate numeric)
language sql stable security definer set search_path = public
as $$
  with pa as (select * from partners where code = p_code),
  n as (
    select greatest(
      (select count(distinct coalesce(ev.owner_id, ev.id)) from events ev
        where ev.partner_code = p_code and ev.id is distinct from p_exclude and event_revenue(ev.id) > 0),
      case when p_exclude is null then coalesce((select paying_peak from pa), 0) else 0 end
    ) as paying
  )
  select
    case when pa.rate_mode = 'custom' then 'custom' when n.paying >= 15 then 'gold' when n.paying >= 5 then 'silver' else 'starter' end,
    (case when pa.rate_mode = 'custom' then pa.rate when n.paying >= 15 then 20 when n.paying >= 5 then 15 else 10 end)::numeric,
    n.paying,
    case when pa.rate_mode = 'custom' or n.paying >= 15 then null when n.paying >= 5 then 'gold' else 'silver' end,
    case when pa.rate_mode = 'custom' or n.paying >= 15 then null when n.paying >= 5 then 15 else 5 end,
    (case when pa.rate_mode = 'custom' or n.paying >= 15 then null when n.paying >= 5 then 20 else 15 end)::numeric
  from pa, n;
$$;
revoke all on function partner_tier(text, uuid) from public, anon, authenticated;

-- When a referred client first pays: lock that booking's rate and record the partner's peak.
create or replace function lock_partner_rate(p_event uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_code text; v_rate numeric; v_paying bigint;
begin
  select e.partner_code into v_code from events e where e.id = p_event and e.partner_rate is null and e.partner_code is not null;
  if v_code is null then return; end if;
  if not exists (select 1 from partners pa where pa.code = v_code) then return; end if;
  select t.rate into v_rate from partner_tier(v_code, p_event) t;    -- the rate before this client
  update events set partner_rate = v_rate where id = p_event;
  select t.paying into v_paying from partner_tier(v_code) t;         -- now including them
  update partners pa set paying_peak = greatest(pa.paying_peak, v_paying::int) where pa.code = v_code;
end;
$$;
revoke all on function lock_partner_rate(uuid) from public, anon, authenticated;

-- (invoices have no `kind`, so each table checks its own columns)
create or replace function lock_partner_rate_trg()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'paid' and (tg_op = 'INSERT' or old.status is distinct from 'paid') and new.event_id is not null then
    if tg_table_name = 'payments' then
      if new.kind in ('site_publish', 'invoice') then perform lock_partner_rate(new.event_id); end if;
    else
      perform lock_partner_rate(new.event_id);
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists on_payments_lock_partner_rate on payments;
create trigger on_payments_lock_partner_rate after insert or update of status on payments
  for each row execute function lock_partner_rate_trg();
drop trigger if exists on_invoices_lock_partner_rate on invoices;
create trigger on_invoices_lock_partner_rate after insert or update of status on invoices
  for each row execute function lock_partner_rate_trg();

-- A booking's commission rate: locked, or the partner's current one if not paid yet.
create or replace function event_partner_rate(p_event uuid)
returns numeric
language sql stable security definer set search_path = public
as $$
  select coalesce(e.partner_rate, (select t.rate from partner_tier(e.partner_code) t), 0)
  from events e where e.id = p_event;
$$;
revoke all on function event_partner_rate(uuid) from public, anon, authenticated;

-- Totals, with each booking at its own rate.
create or replace function partner_totals(p_code text)
returns table (clicks bigint, enquiries bigint, signups bigint, paying bigint, revenue numeric, commission numeric, paid_out numeric, owed numeric)
language sql stable security definer set search_path = public
as $$
  with pa as (select * from partners where code = p_code),
  r as (
    select coalesce(sum(event_revenue(ev.id)), 0) as revenue,
           round(coalesce(sum(event_revenue(ev.id) * event_partner_rate(ev.id) / 100), 0), 2) as commission
    from events ev where ev.partner_code = p_code
  ),
  po as (select coalesce(sum(amount), 0) as paid from partner_payouts where partner_id = (select id from pa))
  select coalesce((select sum(c.clicks) from partner_clicks c where c.partner_id = (select id from pa)), 0),
         (select count(*) from enquiries e where upper(e.values ->> 'partner_code') = p_code and e.status <> 'spam'),
         (select count(*) from profiles p where p.partner_code = p_code),
         (select count(distinct coalesce(ev.owner_id, ev.id)) from events ev where ev.partner_code = p_code and event_revenue(ev.id) > 0),
         r.revenue, r.commission, po.paid, r.commission - po.paid
  from r, po;
$$;
revoke all on function partner_totals(text) from public, anon, authenticated;

-- Everyone a partner brought, each booking at its own rate.
create or replace function partner_people(p_code text, p_mask boolean)
returns table (kind text, person text, email text, project text, status text, revenue numeric, commission numeric, created_at timestamptz)
language sql stable security definer set search_path = public
as $$
  with enq as (
    select 'enquiry'::text as kind, e.name as person, e.email, ev.name as project, e.status,
           coalesce(case when ev.partner_code = p_code then event_revenue(ev.id) end, 0) as revenue,
           coalesce(case when ev.partner_code = p_code then event_revenue(ev.id) * event_partner_rate(ev.id) / 100 end, 0) as commission,
           e.created_at, e.event_id
    from enquiries e left join events ev on ev.id = e.event_id
    where upper(e.values ->> 'partner_code') = p_code and e.status <> 'spam'
  ),
  sig as (
    select 'signup'::text, coalesce(nullif(p.full_name, ''), split_part(p.email, '@', 1)), p.email,
           (select string_agg(ev.name, ', ') from events ev where ev.owner_id = p.id and ev.partner_code = p_code and ev.deleted_at is null),
           case when exists (select 1 from events ev where ev.owner_id = p.id and ev.partner_code = p_code and event_revenue(ev.id) > 0) then 'paid' else 'signed up' end,
           coalesce((select sum(event_revenue(ev.id)) from events ev where ev.owner_id = p.id and ev.partner_code = p_code
                     and ev.id not in (select event_id from enq where event_id is not null)), 0),
           coalesce((select sum(event_revenue(ev.id) * event_partner_rate(ev.id) / 100) from events ev where ev.owner_id = p.id and ev.partner_code = p_code
                     and ev.id not in (select event_id from enq where event_id is not null)), 0),
           p.created_at, null::uuid
    from profiles p where p.partner_code = p_code
  ),
  proj as (
    select 'project'::text, coalesce(o.full_name, ev.name), o.email, ev.name, 'project',
           event_revenue(ev.id), event_revenue(ev.id) * event_partner_rate(ev.id) / 100, ev.created_at, ev.id
    from events ev left join profiles o on o.id = ev.owner_id
    where ev.partner_code = p_code and ev.deleted_at is null
      and ev.id not in (select event_id from enq where event_id is not null)
      and (o.id is null or o.partner_code is distinct from p_code)
  ),
  allp as (select * from enq union all select * from sig union all select * from proj)
  select a.kind,
         case when p_mask then initcap(split_part(trim(a.person), ' ', 1))
                || coalesce(' ' || nullif(upper(left(split_part(trim(a.person), ' ', 2), 1)), '') || '.', '')
              else a.person end,
         case when p_mask then null else a.email end,
         case when p_mask then null else a.project end,
         a.status, a.revenue, round(a.commission, 2), a.created_at
  from allp a
  order by a.created_at desc;
$$;
revoke all on function partner_people(text, boolean) from public, anon, authenticated;

-- Studio → Partners, now with each partner's tier.
drop function if exists partner_report();
create function partner_report()
returns table (id uuid, code text, kind text, name text, business text, email text, phone text, handle text, payout_details text,
               rate numeric, discount numeric, active boolean, notes text, created_at timestamptz, rate_mode text, welcomed_at timestamptz,
               tier text, tier_rate numeric, next_tier text, next_at int,
               clicks bigint, enquiries bigint, signups bigint, paying bigint, revenue numeric, commission numeric, paid_out numeric, owed numeric)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not coalesce(is_staff(), false) then raise exception 'NOT_ALLOWED'; end if;
  return query
  select pa.id, pa.code, pa.kind, pa.name, pa.business, pa.email, pa.phone, pa.handle, pa.payout_details,
         pa.rate, pa.discount, pa.active, pa.notes, pa.created_at, pa.rate_mode, pa.welcomed_at,
         tr.tier, tr.rate, tr.next_tier, tr.next_at,
         t.clicks, t.enquiries, t.signups, t.paying, t.revenue, t.commission, t.paid_out, t.owed
  from partners pa
  cross join lateral partner_totals(pa.code) t
  cross join lateral partner_tier(pa.code) tr
  order by pa.active desc, t.revenue desc, pa.created_at desc;
end;
$$;
revoke all on function partner_report() from public, anon;
grant execute on function partner_report() to authenticated;

-- The partner's own dashboard, with their tier and what's next.
drop function if exists my_partner();
create function my_partner()
returns table (code text, kind text, name text, rate numeric, discount numeric, active boolean,
               tier text, next_tier text, next_at int, next_rate numeric,
               clicks bigint, enquiries bigint, signups bigint, paying bigint, revenue numeric, commission numeric, paid_out numeric, owed numeric)
language sql stable security definer set search_path = public
as $$
  select pa.code, pa.kind, pa.name, tr.rate, pa.discount, pa.active,
         tr.tier, tr.next_tier, tr.next_at, tr.next_rate,
         t.clicks, t.enquiries, t.signups, greatest(t.paying, tr.paying), t.revenue, t.commission, t.paid_out, t.owed
  from partners pa
  cross join lateral partner_totals(pa.code) t
  cross join lateral partner_tier(pa.code) tr
  where auth.uid() is not null and pa.email is not null
    and lower(pa.email) = lower(auth.jwt() ->> 'email')
  limit 1;
$$;
revoke all on function my_partner() from public, anon;
grant execute on function my_partner() to authenticated;

-- (my_partner_people / my_partner_payouts read my_partner(); re-created so they bind to the new one.)
create or replace function my_partner_people()
returns table (kind text, person text, email text, project text, status text, revenue numeric, commission numeric, created_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select pp.* from my_partner() m cross join lateral partner_people(m.code, true) pp;
$$;
revoke all on function my_partner_people() from public, anon;
grant execute on function my_partner_people() to authenticated;

create or replace function my_partner_payouts()
returns table (amount numeric, paid_at date, note text)
language sql stable security definer set search_path = public
as $$
  select po.amount, po.paid_at, po.note
  from my_partner() m join partners pa on pa.code = m.code join partner_payouts po on po.partner_id = pa.id
  order by po.paid_at desc;
$$;
revoke all on function my_partner_payouts() from public, anon;
grant execute on function my_partner_payouts() to authenticated;

-- Check:
select
  (select count(*) from partners where rate_mode = 'tiered') as tiered_partners,
  (select count(*) from pg_trigger where tgname in ('on_payments_lock_partner_rate', 'on_invoices_lock_partner_rate')) as triggers_ok;
