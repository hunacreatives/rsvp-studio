-- RSVP Studio — Seat Planner: plans saved to an account, and view-only share links (Oct 13 2026).
-- ADDITIVE, safe to re-run. Run on LIVE before pushing the Seat Planner.
--   seating_charts   one row per plan; the whole plan is `chart` (JSON, the same shape the
--                    browser keeps). Only its owner reads or writes it. Up to 20 per account.
--   share_token      set when the owner makes a share link; anyone with the link can VIEW
--                    the plan (get_shared_chart), nobody else can change it.
--   event_id         for later: linking a plan to an event's invite list.

create table if not exists seating_charts (
  id text primary key check (char_length(id) between 4 and 40),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  event_id uuid references events (id) on delete set null,
  title text not null default 'Seating plan' check (char_length(title) <= 120),
  chart jsonb not null check (pg_column_size(chart) <= 786432),
  -- The venue floor plan picture, if one was added (a compressed image, kept out of `chart`).
  background text check (background is null or char_length(background) <= 900000),
  share_token text unique check (share_token is null or char_length(share_token) between 16 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table seating_charts add column if not exists background text check (background is null or char_length(background) <= 900000);
create index if not exists seating_charts_owner_idx on seating_charts (owner_id, updated_at desc);

alter table seating_charts enable row level security;
drop policy if exists "seating_charts_owner" on seating_charts;
create policy "seating_charts_owner" on seating_charts for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Up to 20 plans per account.
create or replace function seating_charts_cap() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- An upsert of an existing plan also fires this; only a genuinely new plan counts.
  if not exists (select 1 from seating_charts where id = new.id)
     and (select count(*) from seating_charts where owner_id = new.owner_id) >= 20 then
    raise exception 'SEATING_CHART_LIMIT';
  end if;
  return new;
end;
$$;
drop trigger if exists seating_charts_cap on seating_charts;
create trigger seating_charts_cap before insert on seating_charts for each row execute function seating_charts_cap();

-- A share link: the plan (and its floor plan picture), read-only, for whoever has the token.
drop function if exists get_shared_chart(text);
create function get_shared_chart(p_token text)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select case when background is null then chart else chart || jsonb_build_object('background', background) end
  from seating_charts
  where share_token = p_token and char_length(coalesce(p_token, '')) >= 16
  limit 1;
$$;
grant execute on function get_shared_chart(text) to anon, authenticated;

-- Check: should print 1 | 1 | 1
select
  (select count(*) from information_schema.tables where table_name = 'seating_charts') as seating_table,
  (select count(*) from pg_policies where tablename = 'seating_charts' and policyname = 'seating_charts_owner') as owner_policy,
  (select count(*) from pg_proc where proname = 'get_shared_chart') as share_function;
