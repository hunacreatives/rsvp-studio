-- RSVP Studio — Mesa: day-of check-in (Oct 25 2026). Premium.
-- ADDITIVE, safe to re-run. Run on LIVE before pushing day-of check-in. Needs
-- seating-charts.sql and free-premium.sql (event_is_premium).
--   The host makes a check-in link for a plan linked to a Premium event. Ushers open it on
--   their phones, without an account, and check guests in; they never change the seating plan
--   itself. Arrivals live in seating_checkins, one row per guest (or walk-in), so several phones
--   never clash and the host's autosave never overwrites them.
--   seating_charts.checkin_token   the link (/tools/seating-chart-maker/day/<token>)
--   seating_charts.checkin_until   when it stops working (a few days after the event)
--   seating_charts.checkin_pin     an optional 4-digit PIN, stored hashed
--   checkin_link(chart, action, pin)  the host: make / new / off / pin
--   checkin_chart(token, pin, bg)     a phone: the plan (no seating rules) and the picture
--   checkin_sync(token, pin, since, items)  a phone: send its check-ins, get everyone's since

create extension if not exists pgcrypto with schema extensions;

alter table seating_charts add column if not exists checkin_token text unique check (checkin_token is null or char_length(checkin_token) between 16 and 40);
alter table seating_charts add column if not exists checkin_until timestamptz;
alter table seating_charts add column if not exists checkin_pin text;

create table if not exists seating_checkins (
  chart_id text not null references seating_charts (id) on delete cascade,
  guest_id text not null check (char_length(guest_id) between 1 and 40),  -- 'w…' = a walk-in
  state text not null check (state in ('here', 'away', 'none')),          -- none = undone
  arrived_at timestamptz,
  table_id text check (table_id is null or char_length(table_id) <= 40),  -- a day-of move or a walk-in's seat
  seat int check (seat is null or seat between 0 and 60),
  name text check (name is null or char_length(name) <= 120),            -- walk-ins only
  party int check (party is null or party between 1 and 20),             -- walk-ins only
  by text check (by is null or char_length(by) <= 40),
  updated_at timestamptz not null default now(),
  primary key (chart_id, guest_id)
);
create index if not exists seating_checkins_sync_idx on seating_checkins (chart_id, updated_at);

-- The host reads their own (to bring walk-ins and moves into the plan afterwards). Phones go
-- through the functions below only.
alter table seating_checkins enable row level security;
drop policy if exists "seating_checkins_owner" on seating_checkins;
create policy "seating_checkins_owner" on seating_checkins for select
  using (exists (select 1 from seating_charts c where c.id = chart_id and c.owner_id = auth.uid()));

-- The host: make the link (or a new one, which locks out old phones), turn it off, or set or
-- clear the PIN. Only for the plan's owner, and only when it's linked to a Premium event.
-- Returns the link's state: token, until, has_pin.
create or replace function checkin_link(p_chart text, p_action text, p_pin text default null)
returns jsonb
language plpgsql security definer set search_path = public, extensions
as $$
declare
  c seating_charts%rowtype;
  v_day date;
begin
  select * into c from seating_charts where id = p_chart and owner_id = auth.uid();
  if not found then raise exception 'NOT_YOURS'; end if;
  if c.event_id is null or not coalesce(event_is_premium(c.event_id), false) then raise exception 'PREMIUM'; end if;
  select event_date into v_day from events where id = c.event_id;
  if p_action in ('make', 'new') then
    update seating_charts set
      checkin_token = case when p_action = 'new' or checkin_token is null then encode(gen_random_bytes(12), 'hex') else checkin_token end,
      -- Works until three days after the event (or 30 days from now, with no date).
      checkin_until = coalesce((v_day + 3)::timestamptz, now() + interval '30 days')
    where id = p_chart;
  elsif p_action = 'off' then
    update seating_charts set checkin_token = null, checkin_until = null where id = p_chart;
  elsif p_action = 'pin' then
    if p_pin is not null and p_pin !~ '^[0-9]{4}$' then raise exception 'PIN_FORMAT'; end if;
    update seating_charts set checkin_pin = case when p_pin is null then null else crypt(p_pin, gen_salt('bf')) end where id = p_chart;
  else
    raise exception 'ACTION';
  end if;
  select * into c from seating_charts where id = p_chart;
  return jsonb_build_object('token', c.checkin_token, 'until', c.checkin_until, 'has_pin', c.checkin_pin is not null);
end;
$$;
revoke all on function checkin_link(text, text, text) from public, anon;
grant execute on function checkin_link(text, text, text) to authenticated;

-- Which plan a token opens, if it's on, in date, Premium, and the PIN (if any) is right.
-- Returns the chart id, or an error word: off, pin, premium.
create or replace function checkin_check(p_token text, p_pin text)
returns text
language plpgsql stable security definer set search_path = public, extensions
as $$
declare
  c seating_charts%rowtype;
begin
  if char_length(coalesce(p_token, '')) < 16 then return 'off'; end if;
  select * into c from seating_charts where checkin_token = p_token;
  if not found or not coalesce(c.checkin_until > now(), false) then return 'off'; end if;
  if c.event_id is null or not coalesce(event_is_premium(c.event_id), false) then return 'premium'; end if;
  if c.checkin_pin is not null and coalesce(crypt(coalesce(p_pin, ''), c.checkin_pin) = c.checkin_pin, false) is not true then return 'pin'; end if;
  return 'ok:' || c.id;
end;
$$;
revoke all on function checkin_check(text, text) from public, anon, authenticated;

-- A phone opening the link: the plan without its seating rules, when it last changed, and the
-- venue picture only when the phone doesn't already have it (p_bg = the key it has).
create or replace function checkin_chart(p_token text, p_pin text default null, p_bg text default null)
returns jsonb
language plpgsql stable security definer set search_path = public, extensions
as $$
declare
  v text := checkin_check(p_token, p_pin);
  c seating_charts%rowtype;
begin
  if v not like 'ok:%' then return jsonb_build_object('error', v); end if;
  select * into c from seating_charts where id = substr(v, 4);
  return jsonb_build_object(
    'chart', c.chart - 'rules',
    'chart_at', c.updated_at,
    'background', case when c.background is not null and coalesce(c.chart -> 'bg' ->> 'key', '') <> coalesce(p_bg, '') then c.background end,
    'now', now());
end;
$$;
grant execute on function checkin_chart(text, text, text) to anon, authenticated;

-- A phone's check-ins in, everyone's changes since p_since out, in one call (weak signal).
-- Items: [{guest_id, state, at, table_id, seat, name, party, by}]. Sending the same item twice
-- does nothing new. A check-in made offline keeps its own time (up to 12 hours back).
create or replace function checkin_sync(p_token text, p_pin text default null, p_since timestamptz default null, p_items jsonb default '[]'::jsonb)
returns jsonb
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v text := checkin_check(p_token, p_pin);
  v_chart text;
  it jsonb;
  v_rows int;
begin
  if v not like 'ok:%' then return jsonb_build_object('error', v); end if;
  v_chart := substr(v, 4);
  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_items, '[]'::jsonb)) > 200 then
    return jsonb_build_object('error', 'items');
  end if;
  select count(*) into v_rows from seating_checkins where chart_id = v_chart;
  for it in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    continue when coalesce(it ->> 'guest_id', '') = '' or char_length(it ->> 'guest_id') > 40;
    continue when coalesce(it ->> 'state', '') not in ('here', 'away', 'none');
    -- At most 3,500 rows per plan (guests plus walk-ins).
    continue when v_rows >= 3500 and not exists (select 1 from seating_checkins where chart_id = v_chart and guest_id = it ->> 'guest_id');
    insert into seating_checkins as s (chart_id, guest_id, state, arrived_at, table_id, seat, name, party, by, updated_at)
    values (
      v_chart,
      it ->> 'guest_id',
      it ->> 'state',
      case when it ->> 'state' = 'here' then least(now(), greatest(now() - interval '12 hours', coalesce((it ->> 'at')::timestamptz, now()))) end,
      left(nullif(it ->> 'table_id', ''), 40),
      case when (it ->> 'seat') ~ '^[0-9]{1,2}$' then (it ->> 'seat')::int end,
      left(nullif(it ->> 'name', ''), 120),
      case when (it ->> 'party') ~ '^[0-9]{1,2}$' then least(20, greatest(1, (it ->> 'party')::int)) end,
      left(nullif(it ->> 'by', ''), 40),
      now())
    on conflict (chart_id, guest_id) do update set
      state = excluded.state,
      -- The first arrival time and usher stay when the same guest is checked in again.
      arrived_at = case when excluded.state = 'here' and s.state = 'here' then s.arrived_at else excluded.arrived_at end,
      by = case when excluded.state = 'here' and s.state = 'here' then s.by else excluded.by end,
      table_id = coalesce(excluded.table_id, s.table_id),
      seat = coalesce(excluded.seat, s.seat),
      name = coalesce(excluded.name, s.name),
      party = coalesce(excluded.party, s.party),
      updated_at = now();
    v_rows := v_rows + 1;
  end loop;
  return jsonb_build_object(
    'now', now(),
    'chart_at', (select updated_at from seating_charts where id = v_chart),
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object('guest_id', guest_id, 'state', state, 'arrived_at', arrived_at, 'table_id', table_id, 'seat', seat, 'name', name, 'party', party, 'by', by, 'updated_at', updated_at))
      from seating_checkins where chart_id = v_chart and (p_since is null or updated_at > p_since)), '[]'::jsonb));
end;
$$;
grant execute on function checkin_sync(text, text, timestamptz, jsonb) to anon, authenticated;

-- Check: should print 1 | 3 | 1
select
  (select count(*) from information_schema.tables where table_name = 'seating_checkins') as checkins_table,
  (select count(*) from information_schema.columns where table_name = 'seating_charts' and column_name in ('checkin_token', 'checkin_until', 'checkin_pin')) as link_cols,
  (select count(*) from pg_proc where proname = 'checkin_sync') as sync_fn;
