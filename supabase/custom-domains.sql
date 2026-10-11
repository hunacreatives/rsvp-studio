-- RSVP Studio — custom domains for DIY sites, bought through Vercel's registrar.
-- ADDITIVE, safe to re-run. Run on LIVE before pushing the code that uses it.
-- Needs payments.sql, free-premium.sql and project-lifecycle.sql.
--
--   1. domain_settings: one row, edited in Studio → Templates → Custom domains —
--      on/off, exchange rate (₱ per US$), markup, minimum price, and Huna's
--      registrant details (every domain is registered to Huna).
--   2. site_domains: each domain bought for a site and where it's at:
--        paid → buying → connecting → active   (failed / expired on the side)
--   3. payments can now be for a domain or a domain renewal.
--   4. A site with an active domain stays online until the domain expires.
--   5. get_site_by_domain(): which site a custom domain shows.

-- ---------------------------------------------------------------------
-- 1. Settings
-- ---------------------------------------------------------------------
create table if not exists domain_settings (
  id int primary key default 1 check (id = 1),
  enabled boolean not null default false,
  fx_rate numeric(8, 2) not null default 60 check (fx_rate > 0),       -- ₱ per US$
  multiplier numeric(4, 2) not null default 2 check (multiplier >= 1),
  min_price numeric(10, 2) not null default 1499 check (min_price >= 0),
  contact jsonb,                                                          -- registrant details
  updated_at timestamptz not null default now()
);
insert into domain_settings (id) values (1) on conflict (id) do nothing;
-- Huna's registrant details (every domain is registered to Huna), and switched on.
-- Customers only see it once VERCEL_API_TOKEN is set in Vercel. Editable in Studio.
update domain_settings set
  enabled = true,
  contact = '{"firstName":"Francis Fiel","lastName":"Roble","companyName":"Huna Creatives","email":"hello@thersvpstudio.com","phone":"+63.9626609469","address1":"Bloq Residences, Talamban","city":"Cebu City","state":"Cebu","zip":"6000","country":"PH"}'::jsonb,
  updated_at = now()
where id = 1 and contact is null;
alter table domain_settings enable row level security;
drop policy if exists "domain_settings_staff" on domain_settings;
create policy "domain_settings_staff" on domain_settings for all using (is_staff()) with check (is_staff());

-- ---------------------------------------------------------------------
-- 2. Domains
-- ---------------------------------------------------------------------
create table if not exists site_domains (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events (id) on delete set null,
  domain text not null unique check (domain ~ '^[a-z0-9-]+(\.[a-z0-9-]+)+$'),
  status text not null default 'paid' check (status in ('paid', 'buying', 'connecting', 'active', 'failed', 'expired')),
  price_usd numeric(10, 2) not null,           -- what Vercel charges (locked at checkout)
  renewal_usd numeric(10, 2),
  price_php numeric(10, 2) not null,           -- what the customer paid
  payment_id uuid references payments (id) on delete set null,
  vercel_order_id text,
  purchased_at timestamptz,
  expires_at timestamptz,
  renew_notice_sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists site_domains_event_idx on site_domains (event_id);
alter table site_domains enable row level security;
drop policy if exists "site_domains_select" on site_domains;
create policy "site_domains_select" on site_domains
  for select using (is_staff() or (event_id is not null and can_access_event(event_id)));

-- ---------------------------------------------------------------------
-- 3. Payments for domains
-- ---------------------------------------------------------------------
do $$
declare r record;
begin
  for r in select conname from pg_constraint
    where conrelid = 'payments'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%kind%'
  loop
    execute format('alter table payments drop constraint %I', r.conname);
  end loop;
end $$;
alter table payments add constraint payments_kind_check
  check (kind in ('invoice', 'site_publish', 'domain', 'domain_renewal'));
alter table payments add column if not exists domain text;
-- Vercel's price at checkout (US$), so the purchase uses exactly the price the customer was quoted.
alter table payments add column if not exists domain_price_usd numeric(10, 2);
alter table payments add column if not exists domain_renewal_usd numeric(10, 2);

-- ---------------------------------------------------------------------
-- 4. An active domain keeps its site online until the domain expires
-- ---------------------------------------------------------------------
create or replace function site_live_until(p_event uuid)
returns timestamptz
language sql stable security definer set search_path = public
as $$
  select case
    when e.managed_by_studio then null
    else greatest(
      case
        when event_day(e.id) is not null then
          ((event_day(e.id) + case when event_is_premium(e.id) then interval '1 year' else interval '30 days' end + interval '1 day')::timestamp)
            at time zone 'Asia/Manila'
        else ws.published_at + interval '1 year'
      end,
      (select max(d.expires_at) from site_domains d where d.event_id = e.id and d.status = 'active'))
  end
  from events e left join wedding_sites ws on ws.event_id = e.id
  where e.id = p_event;
$$;

-- ---------------------------------------------------------------------
-- 5. Custom domain → site
-- ---------------------------------------------------------------------
create or replace function get_site_by_domain(p_host text)
returns text
language sql stable security definer set search_path = public
as $$
  select ws.slug
  from site_domains d
  join wedding_sites ws on ws.event_id = d.event_id
  where d.domain = regexp_replace(lower(p_host), '^www\.', '')
    and d.status in ('active', 'expired')
  limit 1;
$$;
grant execute on function get_site_by_domain(text) to anon, authenticated;

-- Check:
select
  (select enabled from domain_settings) as domains_enabled,
  (select fx_rate from domain_settings) as fx_rate,
  (select count(*) from site_domains) as domains,
  (select count(*) from pg_constraint where conname = 'payments_kind_check') as payments_kind_ok;
