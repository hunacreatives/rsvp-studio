-- RSVP Studio — Studio → Costs (Nov 3 2026). ADDITIVE, safe to re-run. Run on LIVE before the push.
-- What the studio spends (ads, software, domains), who paid it, and the 50/50 split
-- between the two business partners. Only the owner and the accounts listed in
-- cost_viewers (the shared hello@ login) can see or change costs; other admins can't.

-- 1. Who besides the owner sees costs. No policies, so it's only editable here in SQL.
create table if not exists cost_viewers (email text primary key);
alter table cost_viewers enable row level security;
insert into cost_viewers (email) values ('hello@thersvpstudio.com') on conflict do nothing;

-- The login email comes from the auth token (not profiles.email, which a user could edit),
-- and the account must still be on the Studio team.
create or replace function can_see_costs()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(is_owner(), false)
    or (coalesce(is_staff(), false)
        and exists (select 1 from cost_viewers v where v.email = lower(coalesce(auth.jwt() ->> 'email', ''))));
$$;
revoke all on function can_see_costs() from public, anon;
grant execute on function can_see_costs() to authenticated;

-- 2. The costs. paid_by is a name (the partners share one login); settled_on is stamped
--    when they settle up, so the balance only counts what's still open.
create table if not exists studio_costs (
  id uuid primary key default gen_random_uuid(),
  spent_on date not null default current_date,
  vendor text not null,
  category text not null default 'software' check (category in ('ads', 'software', 'domain', 'other')),
  note text,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'PHP' check (currency in ('PHP', 'USD')),
  monthly boolean not null default false,
  paid_by text,
  settled_on date,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references profiles (id) on delete set null
);
create index if not exists studio_costs_spent_on on studio_costs (spent_on desc);
alter table studio_costs enable row level security;
drop policy if exists "studio_costs_viewers" on studio_costs;
create policy "studio_costs_viewers" on studio_costs for all
  using (can_see_costs()) with check (can_see_costs());

-- 3. Launch costs so far (only if the table is empty). Payer left blank: set it in Studio.
insert into studio_costs (spent_on, vendor, category, note, amount, currency, monthly)
select * from (values
  (date '2026-11-02', 'Meta (Facebook)', 'ads', 'Launch post boost, 7 days (₱924 + ₱110.88 VAT)', 1034.88, 'PHP', false),
  (date '2026-11-02', 'Meta (Instagram)', 'ads', 'Launch post boost, 7 days', 2016.00, 'PHP', false),
  (date '2026-11-02', 'Resend', 'software', 'Pro plan (email)', 20.00, 'USD', true),
  (date '2026-11-02', 'Vercel', 'software', 'Pro plan (hosting)', 20.00, 'USD', true),
  (date '2026-11-02', 'Google Workspace', 'software', 'hello@thersvpstudio.com', 9.41, 'USD', true)
) as seed (spent_on, vendor, category, note, amount, currency, monthly)
where not exists (select 1 from studio_costs);

-- Check: should print 1 | 1 | 5 (or more, if costs were already added)
select
  (select count(*) from cost_viewers where email = 'hello@thersvpstudio.com') as viewer,
  (select count(*) from pg_policies where tablename = 'studio_costs' and policyname = 'studio_costs_viewers') as policy,
  (select count(*) from studio_costs) as costs;
