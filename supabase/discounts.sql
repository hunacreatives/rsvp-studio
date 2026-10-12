-- RSVP Studio — discounts (Oct 12 2026): 10% across the board.
--   • Every new account: 10% off its first payment (Premium automatically at checkout;
--     packages: Studio's invoice form shows it and takes it off in one click).
--   • Referred by a partner: 10% off (never stacked with the first-payment 10%), and the
--     partner earns 10% of what the client pays.
-- ADDITIVE, safe to re-run. Needs revenue.sql. Run on LIVE before pushing.

alter table partners alter column rate set default 10;
alter table partners alter column discount set default 10;
-- Anyone still on the old 20/20 defaults moves to 10/10 (rates set by hand stay as they are).
update partners set rate = 10 where rate = 20;
update partners set discount = 10 where discount = 20;

-- 10 when this is the owner's first payment: they've never paid for another project
-- (a Premium/publish fee or an invoice). Payments for THIS project don't count, so the
-- price stays the same after they pay it.
create or replace function first_payment_discount(p_event uuid)
returns numeric
language sql stable security definer set search_path = public
as $$
  select case
    when e.owner_id is null then 0
    when exists (select 1 from payments p join events o on o.id = p.event_id
                 where o.owner_id = e.owner_id and o.id <> e.id and p.status = 'paid' and p.kind in ('site_publish', 'invoice'))
      or exists (select 1 from invoices i join events o on o.id = i.event_id
                 where o.owner_id = e.owner_id and o.id <> e.id and i.status = 'paid')
      then 0
    else 10
  end
  from events e where e.id = p_event;
$$;
revoke all on function first_payment_discount(uuid) from public, anon, authenticated;

-- The discount a project gets: the bigger of its partner's and the first-payment one (never both).
create or replace function event_discount(p_event uuid)
returns numeric
language sql stable security definer set search_path = public
as $$
  select greatest(coalesce(partner_discount(p_event), 0), coalesce(first_payment_discount(p_event), 0));
$$;
revoke all on function event_discount(uuid) from public, anon, authenticated;

-- Prices (site_publish_due / site_upgrade_due) go through this, so checkout and the
-- publish check always agree.
create or replace function discounted_centavos(p_price int, p_event uuid)
returns int
language sql stable security definer set search_path = public
as $$
  select (floor(p_price * (100 - event_discount(p_event)) / 100 / 100) * 100)::int;
$$;
revoke all on function discounted_centavos(int, uuid) from public, anon, authenticated;

-- For the builder's pay screens: the % off and why ('partner' | 'first'), or 0.
create or replace function my_event_discount(p_event uuid)
returns table (pct numeric, reason text)
language sql stable security definer set search_path = public
as $$
  select event_discount(p_event),
         case when coalesce(partner_discount(p_event), 0) >= coalesce(first_payment_discount(p_event), 0) and coalesce(partner_discount(p_event), 0) > 0 then 'partner'
              when coalesce(first_payment_discount(p_event), 0) > 0 then 'first' end
  where auth.uid() is not null and can_access_event(p_event);
$$;
revoke all on function my_event_discount(uuid) from public, anon;
grant execute on function my_event_discount(uuid) to authenticated;

-- For Studio's invoice form: should this client's package get 10% off, and why?
-- A project not linked to a client yet counts as a first booking.
create or replace function booking_discount(p_event uuid)
returns table (pct numeric, reason text, partner_code text)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not coalesce(is_staff(), false) then raise exception 'NOT_ALLOWED'; end if;
  return query
  select greatest(coalesce(pa.discount, 0),
                  case when e.owner_id is null or first_payment_discount(e.id) > 0 then 10 else 0 end)::numeric,
         case when pa.code is not null and coalesce(pa.discount, 0) > 0 then 'partner'
              when e.owner_id is null or first_payment_discount(e.id) > 0 then 'first' end,
         pa.code
  from events e left join partners pa on pa.code = e.partner_code and pa.active
  where e.id = p_event;
end;
$$;
revoke all on function booking_discount(uuid) from public, anon;
grant execute on function booking_discount(uuid) to authenticated;

-- Check: what a new account pays for Premium now (₱499 → 449).
select
  (select amount from site_prices where tier = 'premium') as premium_list,
  floor(499 * 0.9) as premium_first_payment,
  (select count(*) from partners where rate <> 10 or discount <> 10) as partners_not_on_10;
