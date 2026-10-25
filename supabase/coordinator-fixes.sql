-- RSVP Studio — Coordinator mode fixes from the Oct 25 2026 audit. ADDITIVE, safe to re-run.
-- Needs coordinator-mode.sql and coordinator-desk.sql. Run on LIVE (project ubonzkfflxqwcwlbemmy)
-- before pushing.
--   1. A coordinator's client events stay drafts until handed over (or made Premium): free
--      publishing waits for the client, so client events can't be used for extra free live sites,
--      and a hand-over never stacks free live sites on the client.
--   2. Invites: at most 20 a day from one person, whichever events they're for (the email is
--      sent from our address).
--   3. event_people: emails only for people who can edit the event (viewers see names).
--   4. Domains: only the couple and cohosts (and staff) see a project's domain and its price.
--   5. leave_project goes through remove_event_member (their seating plans pass to the couple,
--      the check-in link changes).
--   6. my_crew_events(): the events this person is on as a viewer their coordinator invited
--      (they get the Coordinator desk; a viewer the couple invited, like a lola, doesn't).
--   7. Mesa plans: up to 30, counting only plans for events still to come.
--   8. event_plans(): whose seating plans an event has, for the couple and their coordinator.

-- 1. Client events: drafts until handed over --------------------------------------------
-- (free-limits.sql's guard, plus the client event rule)
create or replace function wedding_sites_free_live_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  other text;
  e events%rowtype;
begin
  if new.published_at is null then return new; end if;
  if tg_op = 'UPDATE' and old.published_at is not null then return new; end if;   -- already live: edits are fine
  if auth.uid() is null or coalesce(is_staff(), false) then return new; end if;
  select * into e from events where id = new.event_id;
  -- A client event the coordinator still owns: only a Premium (paid) one goes live before
  -- the client takes it over. (Paid publishing runs from the payment webhook, not here.)
  if e.client_of is not null and e.client_of = e.owner_id and e.handed_over_at is null
     and not coalesce(event_is_premium(e.id), false) then
    raise exception 'CLIENT_DRAFT: hand it over to your client to publish it free' using errcode = 'P0001';
  end if;
  other := free_live_conflict(new.event_id, new.published_presentation->>'activeTemplateId');
  if other is not null then
    raise exception 'FREE_LIVE_LIMIT: %', other using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists on_wedding_sites_free_live_guard on wedding_sites;
create trigger on_wedding_sites_free_live_guard before insert or update on wedding_sites
  for each row execute function wedding_sites_free_live_guard();

-- 2. Invites: 20 a day per sender ----------------------------------------------------------
-- (coordinator-desk.sql's, plus the daily cap)
create or replace function invite_to_event(p_event uuid, p_email text, p_role text)
returns jsonb
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_me text := event_role(p_event);
  v_token text := encode(gen_random_bytes(18), 'hex');
  v_id uuid;
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'EMAIL'; end if;
  if p_role not in ('owner', 'cohost', 'coordinator', 'viewer') then raise exception 'ROLE'; end if;
  if p_role = 'owner' then
    if not (coalesce(v_me = 'owner', false)
            and exists (select 1 from events where id = p_event and client_of = auth.uid() and handed_over_at is null)) then
      raise exception 'NOT_ALLOWED';
    end if;
  elsif not (coalesce(v_me in ('owner', 'cohost'), false) or (v_me = 'coordinator' and p_role = 'viewer') or coalesce(is_staff(), false)) then
    raise exception 'NOT_ALLOWED';
  end if;
  if not coalesce(is_staff(), false)
     and (select count(*) from event_invites where invited_by = auth.uid() and created_at > now() - interval '1 day') >= 20 then
    raise exception 'DAILY_LIMIT';
  end if;
  if exists (select 1 from events e join profiles p on p.id = e.owner_id where e.id = p_event and lower(p.email) = v_email)
     or (p_role <> 'owner' and exists (select 1 from event_members m join profiles p on p.id = m.profile_id where m.event_id = p_event and lower(p.email) = v_email)) then
    raise exception 'ALREADY';
  end if;
  if (select count(*) from event_invites where event_id = p_event and accepted_at is null and cancelled_at is null) >= 30 then raise exception 'TOO_MANY'; end if;
  update event_invites set cancelled_at = now()
  where event_id = p_event and accepted_at is null and cancelled_at is null
    and (lower(email) = v_email or (p_role = 'owner' and role = 'owner'));
  insert into event_invites (event_id, email, role, token_hash, invited_by)
  values (p_event, v_email, p_role, encode(digest(v_token, 'sha256'), 'hex'), auth.uid())
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'token', v_token);
end;
$$;
revoke all on function invite_to_event(uuid, text, text) from public, anon;
grant execute on function invite_to_event(uuid, text, text) to authenticated;

-- 3. event_people: emails only for those who can edit ------------------------------------
create or replace function event_people(p_event uuid)
returns table (kind text, id uuid, name text, email text, role text, since timestamptz, added_by uuid)
language sql stable security definer set search_path = public
as $$
  select 'person', p.id, p.full_name, case when coalesce(can_edit_event(p_event), false) then p.email end, 'owner', e.created_at, null::uuid
  from events e join profiles p on p.id = e.owner_id
  where e.id = p_event and can_access_event(p_event)
  union all
  select 'person', p.id, p.full_name, case when coalesce(can_edit_event(p_event), false) or p.id = auth.uid() then p.email end, m.role, m.created_at, m.added_by
  from event_members m join profiles p on p.id = m.profile_id
  where m.event_id = p_event and can_access_event(p_event) and not p.is_staff
  union all
  select 'invite', i.id, null, i.email, i.role, i.created_at, i.invited_by
  from event_invites i
  where i.event_id = p_event and i.accepted_at is null and i.cancelled_at is null and i.expires_at > now()
    and (coalesce(can_bill_event(p_event), false) or i.invited_by = auth.uid());
$$;
revoke all on function event_people(uuid) from public, anon;
grant execute on function event_people(uuid) to authenticated;

-- 4. Domains: the people who pay ------------------------------------------------------------
drop policy if exists "site_domains_select" on site_domains;
create policy "site_domains_select" on site_domains
  for select using (is_staff() or (event_id is not null and coalesce(can_bill_event(event_id), false)));

-- 5. Leaving an event: the same as being removed ---------------------------------------------
create or replace function leave_project(p_event uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from event_members where event_id = p_event and profile_id = auth.uid()) then
    perform remove_event_member(p_event, auth.uid());
  end if;
end;
$$;
revoke all on function leave_project(uuid) from public, anon;
grant execute on function leave_project(uuid) to authenticated;

-- 6. A coordinator's crew ----------------------------------------------------------------------
create or replace function my_crew_events()
returns setof uuid
language sql stable security definer set search_path = public
as $$
  -- Added by the event's coordinator: the one who set up this client event (its owner until
  -- hand-over, then a member), or a coordinator the couple brought in.
  select m.event_id
  from event_members m join events e on e.id = m.event_id
  where m.profile_id = auth.uid() and m.role = 'viewer'
    and (e.client_of = m.added_by
         or exists (select 1 from event_members a where a.event_id = m.event_id and a.profile_id = m.added_by and a.role = 'coordinator'));
$$;
revoke all on function my_crew_events() from public, anon;
grant execute on function my_crew_events() to authenticated;

-- 7. Mesa plans: up to 30 per account, and only plans for events still to come (or not linked
--    to an event) count, so a coordinator's past seasons don't fill it up.
create or replace function seating_charts_cap() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- An upsert of an existing plan also fires this; only a genuinely new plan counts.
  if not exists (select 1 from seating_charts where id = new.id)
     and (select count(*) from seating_charts s
          where s.owner_id = new.owner_id
            and not exists (select 1 from events e where e.id = s.event_id and e.event_date < current_date - 30)) >= 30 then
    raise exception 'SEATING_CHART_LIMIT';
  end if;
  return new;
end;
$$;
drop trigger if exists seating_charts_cap on seating_charts;
create trigger seating_charts_cap before insert on seating_charts for each row execute function seating_charts_cap();

-- 8. Whose seating plans an event has (plans are each person's own): the event page and "Send
--    seats to your website" say so, so the couple and their coordinator don't overwrite each
--    other without knowing.
create or replace function event_plans(p_event uuid)
returns table (id text, owner_name text, mine boolean, updated_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select s.id, coalesce(nullif(p.full_name, ''), split_part(p.email, '@', 1)), s.owner_id = auth.uid(), s.updated_at
  from seating_charts s left join profiles p on p.id = s.owner_id
  where s.event_id = p_event and coalesce(can_access_event(p_event), false)
  order by s.updated_at desc;
$$;
revoke all on function event_plans(uuid) from public, anon;
grant execute on function event_plans(uuid) to authenticated;

-- Check: should print 1 | 1 | 1 | 1 | 1 | 1 | 1
select
  (select count(*) from pg_proc where proname = 'wedding_sites_free_live_guard' and prosrc like '%CLIENT_DRAFT%') as client_drafts,
  (select count(*) from pg_proc where proname = 'invite_to_event' and prosrc like '%DAILY_LIMIT%') as invite_cap,
  (select count(*) from pg_proc where proname = 'event_people' and prosrc like '%can_edit_event%') as emails_for_editors,
  (select count(*) from pg_policies where policyname = 'site_domains_select' and qual like '%can_bill_event%') as domains_for_payers,
  (select count(*) from pg_proc where proname = 'my_crew_events' and prosrc like '%client_of%') as crew,
  (select count(*) from pg_proc where proname = 'seating_charts_cap' and prosrc like '%>= 30%') as plan_cap,
  (select count(*) from pg_proc where proname = 'event_plans') as event_plans;
