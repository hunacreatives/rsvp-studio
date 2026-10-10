-- RSVP Studio — Batch 2: online payments (PayMongo). ADDITIVE, safe to re-run.
-- Run on LIVE before the code that uses it is pushed. Needs hardening.sql.
--
--   1. payments: one row per PayMongo checkout (an invoice, or publishing a DIY site).
--      Written only by the server (api/pay-checkout.ts, api/paymongo-webhook.ts).
--   2. site_prices: what publishing a DIY site costs, per template tier — edited in
--      Studio → Templates. 0 = free to publish.
--   3. events.managed_by_studio: projects the studio runs (never pay to publish);
--      events.next_step_owner: whose turn the "next step" is.
--   4. invoices: how it was paid, and when a reminder last went out.
--   5. Publishing a DIY site needs it paid for — enforced here, not just in the app.

-- ---------------------------------------------------------------------
-- 1. Payments
-- ---------------------------------------------------------------------
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('invoice', 'site_publish')),
  invoice_id uuid references invoices (id) on delete set null,
  event_id uuid references events (id) on delete cascade,
  profile_id uuid references profiles (id) on delete set null,
  amount_centavos int not null check (amount_centavos > 0),
  description text,
  template_tier text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'expired')),
  checkout_session_id text unique,
  checkout_url text,
  method text,                    -- gcash · paymaya · card · qrph · grab_pay …
  paymongo_payment_id text,
  fulfilled boolean not null default false,
  paid_at timestamptz,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists payments_invoice_idx on payments (invoice_id);
create index if not exists payments_event_idx on payments (event_id, kind, status);
alter table payments enable row level security;
drop policy if exists "payments_select" on payments;
create policy "payments_select" on payments
  for select using (is_staff() or profile_id = auth.uid() or (event_id is not null and can_access_event(event_id)));

-- ---------------------------------------------------------------------
-- 2. DIY site prices (per template tier)
-- ---------------------------------------------------------------------
create table if not exists site_prices (
  tier text primary key check (tier in ('free', 'premium')),
  amount numeric(12, 2) not null default 0 check (amount >= 0),
  updated_at timestamptz not null default now()
);
insert into site_prices (tier, amount) values ('free', 0), ('premium', 0) on conflict (tier) do nothing;
alter table site_prices enable row level security;
drop policy if exists "site_prices_read" on site_prices;
create policy "site_prices_read" on site_prices for select using (true);
drop policy if exists "site_prices_staff_write" on site_prices;
create policy "site_prices_staff_write" on site_prices for all using (is_staff()) with check (is_staff());

-- ---------------------------------------------------------------------
-- 3. Events
-- ---------------------------------------------------------------------
alter table events add column if not exists managed_by_studio boolean not null default false;
alter table events add column if not exists next_step_owner text;
alter table events drop constraint if exists events_next_step_owner_check;
alter table events add constraint events_next_step_owner_check check (next_step_owner is null or next_step_owner in ('client', 'studio'));

-- Studio projects: anything with its own RSVP table, invoices, invite codes, or no owner yet.
update events e set managed_by_studio = true
  where not managed_by_studio
    and (e.table_name is not null
      or e.owner_id is null
      or exists (select 1 from invoices i where i.event_id = e.id)
      or exists (select 1 from invite_codes c where c.event_id = e.id)
      or exists (select 1 from profiles p where p.id = e.owner_id and p.is_staff));

-- Customers create DIY events only (never "studio-managed", never another table).
drop policy if exists "events_insert_own" on events;
create policy "events_insert_own" on events
  for insert with check (owner_id = auth.uid() and table_name is null and not managed_by_studio);

-- ---------------------------------------------------------------------
-- 4. Invoices
-- ---------------------------------------------------------------------
alter table invoices add column if not exists paid_method text;      -- gcash · card · bank transfer · cash …
alter table invoices add column if not exists paid_reference text;   -- PayMongo payment id, bank ref …
alter table invoices add column if not exists last_reminded_at timestamptz;

-- ---------------------------------------------------------------------
-- 5. Publishing a DIY site
-- ---------------------------------------------------------------------
-- What's still owed to publish this event's site with a given template.
create or replace function site_publish_due(p_event uuid, p_template text)
returns table (tier text, price_centavos int, paid_centavos int, due_centavos int, managed boolean)
language sql stable security definer set search_path = public
as $$
  with t as (
    select coalesce((select tier from templates where id = p_template), 'free') as tier
  ), p as (
    select round(coalesce((select amount from site_prices sp, t where sp.tier = t.tier), 0) * 100)::int as price
  ), paid as (
    select coalesce(sum(amount_centavos), 0)::int as paid
    from payments where event_id = p_event and kind = 'site_publish' and status = 'paid'
  ), ev as (
    select coalesce((select managed_by_studio from events where id = p_event), false) as managed
  )
  select t.tier, p.price, paid.paid,
         case when ev.managed then 0 else greatest(p.price - paid.paid, 0) end,
         ev.managed
  from t, p, paid, ev;
$$;
revoke all on function site_publish_due(uuid, text) from public, anon, authenticated;
grant execute on function site_publish_due(uuid, text) to service_role;

-- The builder asks this before showing "Publish": price for the template in the draft.
create or replace function site_publish_quote(p_event uuid)
returns table (tier text, price_centavos int, paid_centavos int, due_centavos int, managed boolean)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not (is_staff() or can_access_event(p_event)) then raise exception 'Not your event'; end if;
  return query
    select * from site_publish_due(p_event, (select draft_presentation->>'activeTemplateId' from wedding_sites where event_id = p_event));
end;
$$;
revoke all on function site_publish_quote(uuid) from public, anon;
grant execute on function site_publish_quote(uuid) to authenticated;

-- Going live (or changing the live template) is blocked until it's paid for.
-- Staff and the server (webhook, service key) are never blocked.
create or replace function wedding_sites_publish_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare due int;
begin
  if new.published_at is null then return new; end if;
  if tg_op = 'UPDATE' and old.published_at is not null
     and new.published_presentation->>'activeTemplateId' is not distinct from old.published_presentation->>'activeTemplateId' then
    return new;
  end if;
  if auth.uid() is null or is_staff() then return new; end if;
  select d.due_centavos into due from site_publish_due(new.event_id, new.published_presentation->>'activeTemplateId') d;
  if coalesce(due, 0) > 0 then
    raise exception 'PAYMENT_REQUIRED: publishing this site costs ₱% more', round(due / 100.0, 2)
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists on_wedding_sites_publish_guard on wedding_sites;
create trigger on_wedding_sites_publish_guard before insert or update on wedding_sites
  for each row execute function wedding_sites_publish_guard();

-- Check:
select
  (select count(*) from site_prices) as prices,
  (select count(*) from events where managed_by_studio) as studio_projects,
  (select count(*) from events where not managed_by_studio) as diy_events,
  (select count(*) from payments) as payments;
