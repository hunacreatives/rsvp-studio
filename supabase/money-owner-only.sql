-- RSVP Studio — money is owner-only (Oct 13 2026). ADDITIVE, safe to re-run. Run on LIVE.
-- Admins keep running projects, invoices (create/send/mark paid) and support, but only the
-- owner can: read payments and partner payouts, change DIY prices and promo codes, and
-- delete an invoice (admins void instead). Customers still see their own payments.

-- 1. Payments: the owner, or the customer the payment belongs to (staff otherwise excluded,
--    because can_access_event() is true for every staff member).
drop policy if exists "payments_select" on payments;
create policy "payments_select" on payments
  for select using (
    coalesce(is_owner(), false)
    or (not coalesce(is_staff(), false)
        and (profile_id = auth.uid() or (event_id is not null and can_access_event(event_id))))
  );

-- 2. Partner payouts: owner only (partners see their own through my_partner_payouts()).
drop policy if exists "partner_payouts_staff" on partner_payouts;
drop policy if exists "partner_payouts_owner" on partner_payouts;
create policy "partner_payouts_owner" on partner_payouts for all
  using (coalesce(is_owner(), false)) with check (coalesce(is_owner(), false));

-- 3. DIY prices: everyone reads them; only the owner changes them.
drop policy if exists "site_prices_staff_write" on site_prices;
drop policy if exists "site_prices_owner_write" on site_prices;
create policy "site_prices_owner_write" on site_prices for all
  using (coalesce(is_owner(), false)) with check (coalesce(is_owner(), false));

-- 4. Promo codes: owner only (including the Studio list).
drop policy if exists "promo_codes_staff" on promo_codes;
drop policy if exists "promo_codes_owner" on promo_codes;
create policy "promo_codes_owner" on promo_codes for all
  using (coalesce(is_owner(), false)) with check (coalesce(is_owner(), false));

create or replace function promo_code_stats()
returns table (code text, percent_off int, note text, active boolean, starts_on date, ends_on date, max_uses int, uses int, created_at timestamptz)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not coalesce(is_owner(), false) then raise exception 'NOT_ALLOWED'; end if;
  return query select pc.code, pc.percent_off, pc.note, pc.active, pc.starts_on, pc.ends_on, pc.max_uses, promo_uses(pc.code), pc.created_at
    from promo_codes pc order by pc.created_at desc;
end;
$$;
revoke all on function promo_code_stats() from public, anon;
grant execute on function promo_code_stats() to authenticated;

-- 5. Invoices: staff create, read and update (void, mark paid); only the owner deletes.
drop policy if exists "invoices_staff_write" on invoices;
drop policy if exists "invoices_staff_insert" on invoices;
drop policy if exists "invoices_staff_update" on invoices;
drop policy if exists "invoices_owner_delete" on invoices;
create policy "invoices_staff_insert" on invoices for insert with check (coalesce(is_staff(), false));
create policy "invoices_staff_update" on invoices for update using (coalesce(is_staff(), false)) with check (coalesce(is_staff(), false));
create policy "invoices_owner_delete" on invoices for delete using (coalesce(is_owner(), false));

-- Check: should print 1 | 1 | 1 | 1 | 3
select
  (select count(*) from pg_policies where tablename = 'payments' and policyname = 'payments_select') as payments,
  (select count(*) from pg_policies where tablename = 'partner_payouts' and policyname = 'partner_payouts_owner') as payouts,
  (select count(*) from pg_policies where tablename = 'site_prices' and policyname = 'site_prices_owner_write') as prices,
  (select count(*) from pg_policies where tablename = 'promo_codes' and policyname = 'promo_codes_owner') as promos,
  (select count(*) from pg_policies where tablename = 'invoices' and policyname in ('invoices_staff_insert', 'invoices_staff_update', 'invoices_owner_delete')) as invoices;
