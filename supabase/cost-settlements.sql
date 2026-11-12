-- RSVP Studio — Studio → Costs: settle-ups as records (Nov 12 2026).
-- ADDITIVE, safe to re-run. Run on LIVE (project ubonzkfflxqwcwlbemmy) BEFORE the push.
-- Needs supabase/studio-costs.sql and supabase/cost-receipts-fx.sql already run.
--
-- Settling up used to just stamp the open costs. Now it records the payment itself
-- (who sent it, to whom, how much, when, plus screenshots of the transfer in the
-- cost-receipts bucket), links the costs to it, and can be undone.

create table if not exists cost_settlements (
  id uuid primary key default gen_random_uuid(),
  paid_on date not null default current_date,
  from_name text,                 -- null when it was even and nothing was sent
  to_name text,
  amount numeric(12, 2) not null default 0 check (amount >= 0),
  note text,
  receipts jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references profiles (id) on delete set null
);
alter table cost_settlements enable row level security;
drop policy if exists "cost_settlements_viewers" on cost_settlements;
create policy "cost_settlements_viewers" on cost_settlements for all
  using (can_see_costs()) with check (can_see_costs());

alter table studio_costs add column if not exists settlement_id uuid references cost_settlements (id) on delete set null;
create index if not exists studio_costs_settlement on studio_costs (settlement_id);

-- Record a settle-up and stamp its costs in one go. Runs as the caller, so RLS applies.
create or replace function record_cost_settlement(
  p_cost_ids uuid[], p_paid_on date, p_from text, p_to text, p_amount numeric, p_note text, p_receipts jsonb
) returns uuid
language plpgsql security invoker set search_path = public
as $$
declare
  sid uuid;
  n int;
begin
  if not coalesce(can_see_costs(), false) then
    raise exception 'Not allowed';
  end if;
  insert into cost_settlements (paid_on, from_name, to_name, amount, note, receipts)
  values (coalesce(p_paid_on, current_date), nullif(trim(p_from), ''), nullif(trim(p_to), ''),
          round(coalesce(p_amount, 0), 2), nullif(trim(p_note), ''), coalesce(p_receipts, '[]'::jsonb))
  returning id into sid;
  update studio_costs set settled_on = coalesce(p_paid_on, current_date), settlement_id = sid
   where id = any (p_cost_ids) and settled_on is null;
  get diagnostics n = row_count;
  if n = 0 then
    raise exception 'Those costs are already settled. Reload the page.';
  end if;
  return sid;
end;
$$;
revoke all on function record_cost_settlement(uuid[], date, text, text, numeric, text, jsonb) from public, anon;
grant execute on function record_cost_settlement(uuid[], date, text, text, numeric, text, jsonb) to authenticated;

-- Undo a settle-up: its costs go back to open and the record is removed.
-- (The app removes the record's screenshots from storage afterwards.)
create or replace function undo_cost_settlement(p_id uuid)
returns void
language plpgsql security invoker set search_path = public
as $$
begin
  if not coalesce(can_see_costs(), false) then
    raise exception 'Not allowed';
  end if;
  update studio_costs set settled_on = null, settlement_id = null where settlement_id = p_id;
  delete from cost_settlements where id = p_id;
end;
$$;
revoke all on function undo_cost_settlement(uuid) from public, anon;
grant execute on function undo_cost_settlement(uuid) to authenticated;

-- Check: should print 1 | 1 | t | t | 0
-- (the last column: costs settled the old way, with no record. The accidental Nov 12
--  settle-up was already reopened on Nov 12, so it should be 0.)
select
  (select count(*) from information_schema.tables where table_name = 'cost_settlements') as settlements_table,
  (select count(*) from pg_policies where tablename = 'cost_settlements') as policy,
  to_regprocedure('record_cost_settlement(uuid[], date, text, text, numeric, text, jsonb)') is not null as record_fn,
  to_regprocedure('undo_cost_settlement(uuid)') is not null as undo_fn,
  (select count(*) from studio_costs where settled_on is not null and settlement_id is null) as old_style_settled;
