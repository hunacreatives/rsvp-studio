-- RSVP Studio — revenue: Premium price, where customers come from, the partner
-- program (planners/coordinators and influencers: own code, 20% commission,
-- 20% off for the people they send, their own dashboard), and a 10-project cap.
-- ADDITIVE, safe to re-run. Needs free-limits.sql. Run on LIVE before pushing.

-- ---------------------------------------------------------------------
-- 1. Premium is ₱499 (Studio → Templates can still change it)
-- ---------------------------------------------------------------------
update site_prices set amount = 499, updated_at = now() where tier = 'premium' and amount = 0;

-- ---------------------------------------------------------------------
-- 2. Partners
-- ---------------------------------------------------------------------
create table if not exists partners (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{3,20}$'),
  kind text not null default 'planner' check (kind in ('planner', 'influencer', 'other')),
  name text not null,
  business text,
  email text,                                   -- they log in with this email to see their dashboard
  phone text,
  handle text,                                  -- @instagram / tiktok, for influencers
  payout_details text,                          -- GCash / bank
  rate numeric(5, 2) not null default 20 check (rate >= 0 and rate <= 100),       -- their commission %
  discount numeric(5, 2) not null default 20 check (discount >= 0 and discount <= 90), -- % off for people they send
  active boolean not null default true,
  enquiry_id uuid references enquiries (id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);
alter table partners add column if not exists kind text not null default 'planner';
alter table partners add column if not exists handle text;
alter table partners add column if not exists discount numeric(5, 2) not null default 20;
alter table partners enable row level security;
drop policy if exists "partners_staff" on partners;
create policy "partners_staff" on partners for all using (is_staff()) with check (is_staff());

create table if not exists partner_payouts (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references partners (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  paid_at date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);
alter table partner_payouts enable row level security;
drop policy if exists "partner_payouts_staff" on partner_payouts;
create policy "partner_payouts_staff" on partner_payouts for all using (is_staff()) with check (is_staff());

-- Link visits per partner per day (a browser counts once a day).
create table if not exists partner_clicks (
  partner_id uuid not null references partners (id) on delete cascade,
  day date not null default current_date,
  clicks int not null default 0,
  primary key (partner_id, day)
);
alter table partner_clicks enable row level security;
drop policy if exists "partner_clicks_staff" on partner_clicks;
create policy "partner_clicks_staff" on partner_clicks for select using (is_staff());

create or replace function log_partner_click(p_code text)
returns void
language sql security definer set search_path = public
as $$
  insert into partner_clicks (partner_id, day, clicks)
  select id, current_date, 1 from partners where code = upper(trim(p_code)) and active
  on conflict (partner_id, day) do update set clicks = partner_clicks.clicks + 1;
$$;
grant execute on function log_partner_click(text) to anon, authenticated;

-- Is this a real, active code? → the partner's name and the discount it gives.
drop function if exists partner_code_valid(text);
create function partner_code_valid(p_code text)
returns table (name text, discount numeric)
language sql stable security definer set search_path = public
as $$
  select name, discount from partners where code = upper(trim(p_code)) and active;
$$;
grant execute on function partner_code_valid(text) to anon, authenticated;

-- Which partner a customer and a project are credited to.
alter table profiles add column if not exists partner_code text;
alter table events add column if not exists partner_code text;

-- ---------------------------------------------------------------------
-- 3. Where a customer came from (first visit), saved once on sign-up
-- ---------------------------------------------------------------------
--   source: 'partner' | 'site' | 'email' | 'google' | 'social' | 'ads' | 'other' | 'direct'
alter table profiles add column if not exists signup_source text;
alter table profiles add column if not exists signup_source_detail text;

create or replace function record_signup_source(p_source text, p_detail text, p_partner text, p_clicked_at timestamptz)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null
     or p_source not in ('partner', 'site', 'email', 'google', 'social', 'ads', 'other', 'direct') then return; end if;
  update profiles set
    signup_source = p_source,
    signup_source_detail = left(nullif(p_detail, ''), 120),
    -- never a partner's own account
    partner_code = (select pa.code from partners pa
                    where pa.code = upper(coalesce(p_partner, '')) and pa.active
                      and lower(coalesce(pa.email, '')) <> lower(coalesce(auth.jwt() ->> 'email', '')))
  where id = auth.uid()
    and signup_source is null
    -- only a NEW account, made after the visit was recorded
    and created_at >= least(p_clicked_at, now()) - interval '10 minutes'
    and created_at > now() - interval '2 days';
end;
$$;
revoke all on function record_signup_source(text, text, text, timestamptz) from public, anon;
grant execute on function record_signup_source(text, text, text, timestamptz) to authenticated;

-- A code entered at checkout ("Have a referral code?"): credits the project and
-- the customer, before anything's been paid. Returns the partner's name.
create or replace function apply_partner_code(p_event uuid, p_code text)
returns text
language plpgsql security definer set search_path = public
as $$
declare pa partners%rowtype; ev events%rowtype;
begin
  select * into ev from events where id = p_event;
  if not found or auth.uid() is null or ev.owner_id is distinct from auth.uid() then raise exception 'NOT_ALLOWED'; end if;
  select * into pa from partners where code = upper(trim(p_code)) and active;
  if not found then raise exception 'BAD_CODE'; end if;
  if lower(coalesce(pa.email, '')) = lower(coalesce(auth.jwt() ->> 'email', '')) then raise exception 'OWN_CODE'; end if;
  if ev.managed_by_studio then raise exception 'NOT_ALLOWED'; end if;
  if ev.partner_code is not null and ev.partner_code <> pa.code then raise exception 'ALREADY_CREDITED'; end if;
  if exists (select 1 from payments where event_id = p_event and kind = 'site_publish' and status = 'paid') then raise exception 'ALREADY_PAID'; end if;
  update events set partner_code = pa.code where id = p_event;
  update profiles set partner_code = pa.code where id = auth.uid() and partner_code is null;
  return pa.name;
end;
$$;
revoke all on function apply_partner_code(uuid, text) from public, anon;
grant execute on function apply_partner_code(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- 4. Prices: people a partner sent pay less
-- ---------------------------------------------------------------------
create or replace function partner_discount(p_event uuid)
returns numeric
language sql stable security definer set search_path = public
as $$
  select coalesce((select pa.discount from events e join partners pa on pa.code = e.partner_code and pa.active where e.id = p_event), 0);
$$;
revoke all on function partner_discount(uuid) from public, anon, authenticated;

-- price × (100 − discount)%, in whole pesos (₱499 at 20% off → ₱399)
create or replace function discounted_centavos(p_price int, p_event uuid)
returns int
language sql stable security definer set search_path = public
as $$
  select (floor(p_price * (100 - partner_discount(p_event)) / 100 / 100) * 100)::int;
$$;
revoke all on function discounted_centavos(int, uuid) from public, anon, authenticated;

create or replace function site_publish_due(p_event uuid, p_template text)
returns table (tier text, price_centavos int, paid_centavos int, due_centavos int, managed boolean)
language sql stable security definer set search_path = public
as $$
  with t as (
    select coalesce((select tier from templates where id = p_template), 'free') as tier
  ), p as (
    select discounted_centavos(round(coalesce((select amount from site_prices sp, t where sp.tier = t.tier), 0) * 100)::int, p_event) as price
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

create or replace function site_upgrade_due(p_event uuid)
returns table (premium boolean, price_centavos int, due_centavos int)
language sql stable security definer set search_path = public
as $$
  with p as (
    select discounted_centavos(round(coalesce((select amount from site_prices where tier = 'premium'), 0) * 100)::int, p_event) as price
  ), paid as (
    select coalesce(sum(amount_centavos), 0)::int as paid
    from payments where event_id = p_event and kind = 'site_publish' and status = 'paid'
  )
  select event_is_premium(p_event), p.price,
         case when event_is_premium(p_event) then 0 else greatest(p.price - paid.paid, 0) end
  from p, paid;
$$;
revoke all on function site_upgrade_due(uuid) from public, anon, authenticated;
grant execute on function site_upgrade_due(uuid) to service_role;

-- ---------------------------------------------------------------------
-- 5. New projects: credit the customer's partner; cap of 10 per account
-- ---------------------------------------------------------------------
create or replace function events_free_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not coalesce(is_staff(), false) and not coalesce(new.managed_by_studio, false) then
    if (select count(*) from events e
        where e.owner_id = new.owner_id and not e.managed_by_studio and e.deleted_at is null
          and (site_live_until(e.id) is null or site_live_until(e.id) > now())) >= 10 then
      raise exception 'PROJECT_LIMIT: accounts can have 10 projects at a time' using errcode = 'P0001';
    end if;
    if (select count(*) from free_projects(new.owner_id)) >= 3 then
      raise exception 'FREE_LIMIT: free accounts can have 3 projects at a time' using errcode = 'P0001';
    end if;
  end if;
  if new.partner_code is null and not coalesce(new.managed_by_studio, false) then
    new.partner_code := (select partner_code from profiles where id = new.owner_id);
  end if;
  return new;
end;
$$;
drop trigger if exists on_events_free_limit on events;
create trigger on_events_free_limit before insert on events
  for each row execute function events_free_limit();

-- ---------------------------------------------------------------------
-- 6. Reports
-- ---------------------------------------------------------------------
-- What a project has brought in: paid invoices + paid Premium/publish fees.
-- (Domains are left out — most of it is Vercel's cost.)
create or replace function event_revenue(p_event uuid)
returns numeric
language sql stable security definer set search_path = public
as $$
  select coalesce((select sum(amount) from invoices where event_id = p_event and status = 'paid'), 0)
       + coalesce((select sum(amount_centavos) / 100.0 from payments where event_id = p_event and kind = 'site_publish' and status = 'paid'), 0);
$$;
revoke all on function event_revenue(uuid) from public, anon, authenticated;

-- Everyone a partner brought: enquiries, sign-ups, and projects credited to them.
-- p_mask: hide emails and shorten names (for the partner's own dashboard).
create or replace function partner_people(p_code text, p_mask boolean)
returns table (kind text, person text, email text, project text, status text, revenue numeric, commission numeric, created_at timestamptz)
language sql stable security definer set search_path = public
as $$
  with pa as (select * from partners where code = p_code),
  enq as (
    select 'enquiry'::text as kind, e.name as person, e.email, ev.name as project, e.status,
           coalesce(case when ev.partner_code = p_code then event_revenue(ev.id) end, 0) as revenue, e.created_at, e.event_id
    from enquiries e left join events ev on ev.id = e.event_id
    where upper(e.values ->> 'partner_code') = p_code and e.status <> 'spam'
  ),
  sig as (
    select 'signup'::text, coalesce(nullif(p.full_name, ''), split_part(p.email, '@', 1)), p.email,
           (select string_agg(ev.name, ', ') from events ev where ev.owner_id = p.id and ev.partner_code = p_code and ev.deleted_at is null),
           case when exists (select 1 from events ev where ev.owner_id = p.id and ev.partner_code = p_code and event_revenue(ev.id) > 0) then 'paid' else 'signed up' end,
           coalesce((select sum(event_revenue(ev.id)) from events ev where ev.owner_id = p.id and ev.partner_code = p_code
                     and ev.id not in (select event_id from enq where event_id is not null)), 0),
           p.created_at, null::uuid
    from profiles p where p.partner_code = p_code
  ),
  proj as (   -- credited by the studio, not through a sign-up or enquiry above
    select 'project'::text, coalesce(o.full_name, ev.name), o.email, ev.name, 'project', event_revenue(ev.id), ev.created_at, ev.id
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
         a.status, a.revenue, round(a.revenue * (select rate from pa) / 100, 2), a.created_at
  from allp a
  order by a.created_at desc;
$$;
revoke all on function partner_people(text, boolean) from public, anon, authenticated;

-- One partner's totals.
create or replace function partner_totals(p_code text)
returns table (clicks bigint, enquiries bigint, signups bigint, paying bigint, revenue numeric, commission numeric, paid_out numeric, owed numeric)
language sql stable security definer set search_path = public
as $$
  with pa as (select * from partners where code = p_code),
  r as (select coalesce(sum(event_revenue(ev.id)), 0) as revenue from events ev where ev.partner_code = p_code)
  select coalesce((select sum(c.clicks) from partner_clicks c where c.partner_id = (select id from pa)), 0),
         (select count(*) from enquiries e where upper(e.values ->> 'partner_code') = p_code and e.status <> 'spam'),
         (select count(*) from profiles p where p.partner_code = p_code),
         (select count(distinct coalesce(ev.owner_id, ev.id)) from events ev where ev.partner_code = p_code and event_revenue(ev.id) > 0),
         r.revenue,
         round(r.revenue * (select rate from pa) / 100, 2),
         coalesce((select sum(po.amount) from partner_payouts po where po.partner_id = (select id from pa)), 0),
         round(r.revenue * (select rate from pa) / 100, 2) - coalesce((select sum(po.amount) from partner_payouts po where po.partner_id = (select id from pa)), 0)
  from r;
$$;
revoke all on function partner_totals(text) from public, anon, authenticated;

-- Studio → Partners: every partner with totals.
create or replace function partner_report()
returns table (id uuid, code text, kind text, name text, business text, email text, phone text, handle text, payout_details text,
               rate numeric, discount numeric, active boolean, notes text, created_at timestamptz,
               clicks bigint, enquiries bigint, signups bigint, paying bigint, revenue numeric, commission numeric, paid_out numeric, owed numeric)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not coalesce(is_staff(), false) then raise exception 'NOT_ALLOWED'; end if;
  return query
  select pa.id, pa.code, pa.kind, pa.name, pa.business, pa.email, pa.phone, pa.handle, pa.payout_details,
         pa.rate, pa.discount, pa.active, pa.notes, pa.created_at,
         t.clicks, t.enquiries, t.signups, t.paying, t.revenue, t.commission, t.paid_out, t.owed
  from partners pa cross join lateral partner_totals(pa.code) t
  order by pa.active desc, t.revenue desc, pa.created_at desc;
end;
$$;
revoke all on function partner_report() from public, anon;
grant execute on function partner_report() to authenticated;

-- Studio → Partners → a partner: who they brought.
create or replace function partner_referrals(p_partner uuid)
returns table (kind text, person text, email text, project text, status text, revenue numeric, commission numeric, created_at timestamptz)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not coalesce(is_staff(), false) then raise exception 'NOT_ALLOWED'; end if;
  return query select * from partner_people((select code from partners where id = p_partner), false);
end;
$$;
revoke all on function partner_referrals(uuid) from public, anon;
grant execute on function partner_referrals(uuid) to authenticated;

-- The partner's own dashboard (/account/partner): matched by their login email.
create or replace function my_partner()
returns table (code text, kind text, name text, rate numeric, discount numeric, active boolean,
               clicks bigint, enquiries bigint, signups bigint, paying bigint, revenue numeric, commission numeric, paid_out numeric, owed numeric)
language sql stable security definer set search_path = public
as $$
  select pa.code, pa.kind, pa.name, pa.rate, pa.discount, pa.active,
         t.clicks, t.enquiries, t.signups, t.paying, t.revenue, t.commission, t.paid_out, t.owed
  from partners pa cross join lateral partner_totals(pa.code) t
  where auth.uid() is not null and pa.email is not null
    and lower(pa.email) = lower(auth.jwt() ->> 'email')
  limit 1;
$$;
revoke all on function my_partner() from public, anon;
grant execute on function my_partner() to authenticated;

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

-- Studio → Overview: where customers came from over the last p_days.
create or replace function source_report(p_days int default 90)
returns table (source text, signups bigint, enquiries bigint, paying_customers bigint, revenue numeric)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not coalesce(is_staff(), false) then raise exception 'NOT_ALLOWED'; end if;
  return query
  with since as (select now() - make_interval(days => p_days) as t),
  people as (
    select p.id, coalesce(p.signup_source, p.referred_via, 'unknown') as source
    from profiles p, since where p.created_at >= since.t and not coalesce(p.is_staff, false)
  ),
  enq as (
    select coalesce(nullif(e.values ->> 'source', ''), 'unknown') as source
    from enquiries e, since where e.created_at >= since.t and e.form = 'project-inquiry' and e.status <> 'spam'
  ),
  money as (
    select pe.source, pe.id, coalesce(sum(event_revenue(ev.id)), 0) as amt
    from people pe left join events ev on ev.owner_id = pe.id
    group by pe.source, pe.id
  ),
  sources as (select x.source from people x union select y.source from enq y)
  select s.source,
         (select count(*) from people x where x.source = s.source),
         (select count(*) from enq x where x.source = s.source),
         (select count(*) from money m where m.source = s.source and m.amt > 0),
         coalesce((select sum(m.amt) from money m where m.source = s.source), 0)
  from sources s
  order by 5 desc, 2 desc;
end;
$$;
revoke all on function source_report(int) from public, anon;
grant execute on function source_report(int) to authenticated;

-- Check:
select
  (select amount from site_prices where tier = 'premium') as premium_price,
  (select count(*) from partners) as partners,
  (select count(*) from information_schema.columns where table_name = 'profiles' and column_name in ('signup_source', 'partner_code')) as profile_cols_ok;
