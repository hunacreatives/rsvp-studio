-- RSVP Studio — Studio → Costs: receipts + dollars in pesos (Nov 6 2026).
-- ADDITIVE, safe to re-run. Run on LIVE (project ubonzkfflxqwcwlbemmy) BEFORE the push.
-- Needs supabase/studio-costs.sql (can_see_costs(), studio_costs) already run.

-- 1. Receipts: a private bucket only the cost viewers (owner + hello@) can read or change.
--    Files live at <random id>/<file name>; the cost row keeps the list in `receipts`.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cost-receipts', 'cost-receipts', false, 10485760,
        array['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "cost_receipts_read" on storage.objects;
create policy "cost_receipts_read" on storage.objects
  for select using (bucket_id = 'cost-receipts' and can_see_costs());
drop policy if exists "cost_receipts_insert" on storage.objects;
create policy "cost_receipts_insert" on storage.objects
  for insert with check (bucket_id = 'cost-receipts' and can_see_costs());
drop policy if exists "cost_receipts_delete" on storage.objects;
create policy "cost_receipts_delete" on storage.objects
  for delete using (bucket_id = 'cost-receipts' and can_see_costs());

alter table studio_costs add column if not exists receipts jsonb not null default '[]'::jsonb;

-- 2. Dollars in pesos. Each dollar cost keeps the peso amount it was worth on its date
--    (rate from the day it was spent, or the card statement's peso figure if typed in),
--    so old totals never move when the rate does.
alter table studio_costs add column if not exists php_amount numeric(12, 2);
alter table studio_costs add column if not exists fx_rate numeric(10, 4);

-- Existing dollar costs: USD→PHP on their dates (Frankfurter / ECB reference rate).
update studio_costs set fx_rate = 63.547, php_amount = round(amount * 63.547, 2)
  where currency = 'USD' and php_amount is null and spent_on <= date '2026-11-02';
update studio_costs set fx_rate = 63.461, php_amount = round(amount * 63.461, 2)
  where currency = 'USD' and php_amount is null and spent_on = date '2026-11-03';
-- Anything else still missing gets today's rate (Nov 6: 63.017).
update studio_costs set fx_rate = 63.017, php_amount = round(amount * 63.017, 2)
  where currency = 'USD' and php_amount is null;
-- Peso costs: the peso amount is the amount.
update studio_costs set php_amount = amount, fx_rate = null where currency = 'PHP' and php_amount is distinct from amount;

-- From now on every cost must have its peso amount.
alter table studio_costs drop constraint if exists studio_costs_php_amount;
alter table studio_costs add constraint studio_costs_php_amount
  check (php_amount is not null and php_amount > 0 and (currency <> 'PHP' or php_amount = amount));

-- 3. Meta ads, corrected to the real running totals (Instagram Ad tools, Nov 6; both paused)
--    plus Meta's 12% VAT, which is what the card is charged.
--    Launch boost: the FB and IG rows become one row. Spend ₱3,141.56 + VAT = ₱3,518.55.
update studio_costs
   set vendor = 'Meta (FB + IG)', note = 'Launch post boost, paused (₱3,141.56 spend + 12% VAT)',
       amount = 3518.55, php_amount = 3518.55, fx_rate = null
 where id = '48d3e4a3-502e-4641-9d72-81dc3b0839de';
delete from studio_costs where id = '83b3798a-f00e-430e-815d-a7d1b5781b3c';
--    Pickleball ad: spend ₱2,039.96 + VAT = ₱2,284.76.
update studio_costs
   set note = 'Pickleball reel boost, paused (₱2,039.96 spend + 12% VAT)',
       amount = 2284.76, php_amount = 2284.76, fx_rate = null
 where id = '2389f362-e1a3-417a-af0a-f96e06439b7b';

-- Check: should print 1 | 3 | 0
select
  (select count(*) from storage.buckets where id = 'cost-receipts' and not public) as bucket,
  (select count(*) from pg_policies where tablename = 'objects' and policyname like 'cost_receipts_%') as policies,
  (select count(*) from studio_costs where php_amount is null) as missing_pesos;
