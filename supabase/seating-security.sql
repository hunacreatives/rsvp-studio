-- RSVP Studio — Mesa: seating plans can only be linked to your own events (Oct 25 2026).
-- ADDITIVE, safe to re-run. Run on LIVE before pushing. Fixes a gap in seating-charts.sql and
-- seating-checkin.sql: a plan could be linked (seating_charts.event_id) to any event, so a
-- stranger who knew an event's id could have their plan show in that couple's emails, or make
-- a check-in link on that couple's Premium event.
--   1. Saving a plan with an event_id needs access to that event (owner, member or staff).
--   2. checkin_link checks the same.
--   3. Any plan already linked to an event its owner can't access is unlinked.

-- 1. Who may link a plan to an event
drop policy if exists "seating_charts_owner" on seating_charts;
create policy "seating_charts_owner" on seating_charts for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and (event_id is null or can_access_event(event_id)));

-- 2. The check-in link
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
  -- The plan must be linked to an event this person can open (their own, or one they're on).
  if c.event_id is not null and not coalesce(can_access_event(c.event_id), false) then raise exception 'NOT_YOURS'; end if;
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

-- 3. Unlink any plan whose owner can't open the event it points at
update seating_charts s set event_id = null
where s.event_id is not null
  and not exists (select 1 from events e where e.id = s.event_id and e.owner_id = s.owner_id)
  and not exists (select 1 from event_members m where m.event_id = s.event_id and m.profile_id = s.owner_id)
  and not exists (select 1 from profiles p where p.id = s.owner_id and p.is_staff);

-- Check: should print 1 | 0
select
  (select count(*) from pg_policies where tablename = 'seating_charts' and policyname = 'seating_charts_owner' and with_check like '%can_access_event%') as link_rule,
  (select count(*) from seating_charts s where s.event_id is not null
     and not exists (select 1 from events e where e.id = s.event_id and e.owner_id = s.owner_id)
     and not exists (select 1 from event_members m where m.event_id = s.event_id and m.profile_id = s.owner_id)
     and not exists (select 1 from profiles p where p.id = s.owner_id and p.is_staff)) as stray_links;
