-- RSVP Studio — Coordinator desk: coordinators add their clients' events, then hand them over
-- (Oct 25 2026). ADDITIVE, safe to re-run. Needs coordinator-mode.sql, revenue.sql,
-- free-limits.sql and partner-tiers.sql. Run on LIVE (project ubonzkfflxqwcwlbemmy) before pushing.
--   • profiles.is_coordinator: "I'm a coordinator or planner" (people set it themselves; accepting
--     a coordinator invite sets it too). It gives them the Coordinator desk as their Home.
--   • events.client_of: the coordinator who added the event for a client. They own it until
--     hand-over (and may pay for it); events.handed_over_at: when the client took it over.
--   • Unclaimed client events (client_of = owner, not handed over) don't count toward the
--     10-project cap, the 3 free projects or the one live free site. Instead: 10 per coordinator.
--   • Added by an active partner: the partner's own code goes on the event (their discount).
--   • Hand-over: the coordinator invites the client as 'owner'. When the client accepts, the
--     event (and its billing) is theirs and the coordinator stays on as its coordinator.
--   • Commission: what a partner pays for their own clients earns them no commission
--     (partner_revenue; partner_tier, partner_totals and partner_people use it).

-- 1. Columns -----------------------------------------------------------------------
alter table profiles add column if not exists is_coordinator boolean not null default false;
alter table events add column if not exists client_of uuid references profiles (id) on delete set null;
alter table events add column if not exists handed_over_at timestamptz;
create index if not exists events_client_of_idx on events (client_of) where client_of is not null;

-- Only the coordinator themselves can mark an event as theirs for a client, and only when they
-- make it; after that client_of and handed_over_at change only through a hand-over
-- (accept_event_invite) or the studio. (Named so it runs before on_events_free_limit.)
create or replace function events_guard_client_of()
returns trigger language plpgsql set search_path = public as $$
begin
  if auth.uid() is null or coalesce(is_staff(), false) or coalesce(current_setting('rsvp.handover', true), '') = 'on' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.client_of is distinct from auth.uid() or new.owner_id is distinct from auth.uid() then new.client_of := null; end if;
    new.handed_over_at := null;
  else
    new.client_of := old.client_of;
    new.handed_over_at := old.handed_over_at;
  end if;
  return new;
end;
$$;
drop trigger if exists on_events_client_of_guard on events;
create trigger on_events_client_of_guard before insert or update on events
  for each row execute function events_guard_client_of();

-- 2. Free limits: unclaimed client events sit outside them ---------------------------
-- (copied from free-limits.sql, plus the client_of line)
create or replace function free_projects(p_owner uuid)
returns table (id uuid, name text, live boolean)
language sql stable security definer set search_path = public
as $$
  select e.id, e.name, ws.published_at is not null
  from events e
  left join wedding_sites ws on ws.event_id = e.id
  where e.owner_id = p_owner
    and not e.managed_by_studio
    and e.deleted_at is null
    and not event_is_premium(e.id)
    and (site_live_until(e.id) is null or site_live_until(e.id) > now())
    and (e.client_of is distinct from e.owner_id or e.handed_over_at is not null)   -- not a client's, still to hand over
  order by e.created_at;
$$;
revoke all on function free_projects(uuid) from public, anon, authenticated;
grant execute on function free_projects(uuid) to service_role;

create or replace function free_live_conflict(p_event uuid, p_template text)
returns text
language sql stable security definer set search_path = public
as $$
  select o.name
  from events e
  join events o on o.owner_id = e.owner_id and o.id <> e.id
  join wedding_sites ows on ows.event_id = o.id and ows.published_at is not null
  where e.id = p_event
    and not e.managed_by_studio
    and (e.client_of is distinct from e.owner_id or e.handed_over_at is not null)
    -- this site will be free: no Premium paid for, and not a Premium template
    and not exists (select 1 from payments p where p.event_id = e.id and p.kind = 'site_publish' and p.status = 'paid' and p.template_tier = 'premium')
    and not exists (select 1 from templates t where t.id = p_template and t.tier = 'premium')
    -- the other one is a live free site
    and not o.managed_by_studio
    and o.deleted_at is null
    and not event_is_premium(o.id)
    and (site_live_until(o.id) is null or site_live_until(o.id) > now())
    and (o.client_of is distinct from o.owner_id or o.handed_over_at is not null)
  order by o.created_at
  limit 1;
$$;
revoke all on function free_live_conflict(uuid, text) from public, anon, authenticated;
grant execute on function free_live_conflict(uuid, text) to service_role;

-- New projects (from revenue.sql): the 10-project cap and 3 free ones leave unclaimed client
-- events out; those have their own cap of 10 free ones (Premium and paid ones don't count,
-- and partners have no cap). Credit: an active partner's client events get the partner's own
-- code; anything else, the code the owner signed up with (as before).
create or replace function events_free_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_client boolean := new.client_of is not null and new.client_of = new.owner_id and new.handed_over_at is null;
  v_partner text;
begin
  if v_client then
    select pa.code into v_partner from partners pa join profiles p on p.id = new.owner_id
    where pa.active and pa.email is not null and lower(pa.email) = lower(p.email)
    order by pa.created_at limit 1;
  end if;
  if auth.uid() is not null and not coalesce(is_staff(), false) and not coalesce(new.managed_by_studio, false) then
    if v_client then
      if v_partner is null and (select count(*) from events e
          where e.owner_id = new.owner_id and e.client_of = new.owner_id and e.handed_over_at is null
            and not e.managed_by_studio and e.deleted_at is null
            and not event_is_premium(e.id) and event_revenue(e.id) = 0
            and (site_live_until(e.id) is null or site_live_until(e.id) > now())) >= 10 then
        raise exception 'CLIENT_LIMIT: coordinators can have 10 client events at a time before handing them over' using errcode = 'P0001';
      end if;
    else
      if (select count(*) from events e
          where e.owner_id = new.owner_id and not e.managed_by_studio and e.deleted_at is null
            and (e.client_of is distinct from e.owner_id or e.handed_over_at is not null)
            and (site_live_until(e.id) is null or site_live_until(e.id) > now())) >= 10 then
        raise exception 'PROJECT_LIMIT: accounts can have 10 projects at a time' using errcode = 'P0001';
      end if;
      if (select count(*) from free_projects(new.owner_id)) >= 3 then
        raise exception 'FREE_LIMIT: free accounts can have 3 projects at a time' using errcode = 'P0001';
      end if;
    end if;
  end if;
  if v_client and v_partner is not null and not coalesce(new.managed_by_studio, false) then
    new.partner_code := v_partner;
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

-- 3. Hand-over invites ---------------------------------------------------------------
alter table event_invites drop constraint if exists event_invites_role_check;
alter table event_invites add constraint event_invites_role_check check (role in ('owner', 'cohost', 'coordinator', 'viewer'));

-- (coordinator-mode.sql's, plus 'owner': only the coordinator who owns a client event they
-- haven't handed over yet. One hand-over invite open at a time; the client may already be on
-- the event as a cohost or viewer.)
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
  if exists (select 1 from events e join profiles p on p.id = e.owner_id where e.id = p_event and lower(p.email) = v_email)
     or (p_role <> 'owner' and exists (select 1 from event_members m join profiles p on p.id = m.profile_id where m.event_id = p_event and lower(p.email) = v_email)) then
    raise exception 'ALREADY';
  end if;
  if (select count(*) from event_invites where event_id = p_event and accepted_at is null and cancelled_at is null) >= 30 then raise exception 'TOO_MANY'; end if;
  -- A new invite to the same person replaces the open one; a new hand-over replaces the last.
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

-- (coordinator-mode.sql's, plus: an 'owner' invite hands the event over — it becomes the
-- client's, the coordinator stays on as its coordinator, and their seating plans stay theirs;
-- a 'coordinator' invite gives them the Coordinator desk.)
create or replace function accept_event_invite(p_token text)
returns jsonb
language plpgsql security definer set search_path = public, extensions
as $$
declare
  i event_invites%rowtype;
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_from uuid;
begin
  if auth.uid() is null then raise exception 'SIGN_IN'; end if;
  select * into i from event_invites where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex');
  if not found or i.cancelled_at is not null then raise exception 'NOT_FOUND'; end if;
  if i.accepted_at is not null then
    if i.accepted_by = auth.uid() then return jsonb_build_object('event_id', i.event_id, 'role', i.role); end if;
    raise exception 'USED';
  end if;
  if i.expires_at < now() then raise exception 'EXPIRED'; end if;
  if lower(i.email) <> v_email then raise exception 'OTHER_EMAIL'; end if;
  if not exists (select 1 from events where id = i.event_id and deleted_at is null) then raise exception 'NOT_FOUND'; end if;
  if i.role = 'owner' then
    -- Still the coordinator's to hand over (not handed over, or deleted, since).
    select owner_id into v_from from events
    where id = i.event_id and owner_id = i.invited_by and client_of = i.invited_by and handed_over_at is null
    for update;
    if v_from is null then raise exception 'NOT_FOUND'; end if;
    perform set_config('rsvp.handover', 'on', true);
    update events set owner_id = auth.uid(), handed_over_at = now() where id = i.event_id;
    perform set_config('rsvp.handover', '', true);
    delete from event_members where event_id = i.event_id and profile_id = auth.uid();
    insert into event_members (event_id, profile_id, role, added_by)
    values (i.event_id, v_from, 'coordinator', auth.uid())
    on conflict (event_id, profile_id) do update set role = 'coordinator', added_by = excluded.added_by;
    -- Any other hand-over invite still open for this event is spent.
    update event_invites set cancelled_at = now()
    where event_id = i.event_id and role = 'owner' and id <> i.id and accepted_at is null and cancelled_at is null;
  -- The couple accepting an invite to their own event: nothing to add.
  elsif not exists (select 1 from events where id = i.event_id and owner_id = auth.uid()) then
    insert into event_members (event_id, profile_id, role, added_by)
    values (i.event_id, auth.uid(), i.role, i.invited_by)
    on conflict (event_id, profile_id) do update set role = excluded.role;
  end if;
  if i.role = 'coordinator' then
    update profiles set is_coordinator = true where id = auth.uid() and not is_coordinator;
  end if;
  update event_invites set accepted_at = now(), accepted_by = auth.uid() where id = i.id;
  return jsonb_build_object('event_id', i.event_id, 'role', i.role);
end;
$$;
revoke all on function accept_event_invite(text) from public, anon;
grant execute on function accept_event_invite(text) to authenticated;

-- 4. Commission: not on what a partner pays for their own clients --------------------------
-- What a project has brought in for its partner: event_revenue, less the paid publish/Premium
-- fees and invoices the partner paid themselves (matched by the payer's email).
create or replace function partner_revenue(p_event uuid)
returns numeric
language sql stable security definer set search_path = public
as $$
  select greatest(event_revenue(p_event) - coalesce((
    select sum(pm.amount_centavos) / 100.0
    from payments pm
    join profiles payer on payer.id = pm.profile_id
    join events e on e.id = pm.event_id
    join partners pa on pa.code = e.partner_code
    where pm.event_id = p_event and pm.kind in ('site_publish', 'invoice') and pm.status = 'paid'
      and pa.email is not null and lower(payer.email) = lower(pa.email)
  ), 0), 0);
$$;
revoke all on function partner_revenue(uuid) from public, anon, authenticated;

-- (partner-tiers.sql's three, with partner_revenue in place of event_revenue)
create or replace function partner_tier(p_code text, p_exclude uuid default null)
returns table (tier text, rate numeric, paying bigint, next_tier text, next_at int, next_rate numeric)
language sql stable security definer set search_path = public
as $$
  with pa as (select * from partners where code = p_code),
  n as (
    select greatest(
      (select count(distinct coalesce(ev.owner_id, ev.id)) from events ev
        where ev.partner_code = p_code and ev.id is distinct from p_exclude and partner_revenue(ev.id) > 0),
      case when p_exclude is null then coalesce((select paying_peak from pa), 0) else 0 end
    ) as paying
  )
  select
    case when pa.rate_mode = 'custom' then 'custom' when n.paying >= 15 then 'gold' when n.paying >= 5 then 'silver' else 'starter' end,
    (case when pa.rate_mode = 'custom' then pa.rate when n.paying >= 15 then 20 when n.paying >= 5 then 15 else 10 end)::numeric,
    n.paying,
    case when pa.rate_mode = 'custom' or n.paying >= 15 then null when n.paying >= 5 then 'gold' else 'silver' end,
    case when pa.rate_mode = 'custom' or n.paying >= 15 then null when n.paying >= 5 then 15 else 5 end,
    (case when pa.rate_mode = 'custom' or n.paying >= 15 then null when n.paying >= 5 then 20 else 15 end)::numeric
  from pa, n;
$$;
revoke all on function partner_tier(text, uuid) from public, anon, authenticated;

create or replace function partner_totals(p_code text)
returns table (clicks bigint, enquiries bigint, signups bigint, paying bigint, revenue numeric, commission numeric, paid_out numeric, owed numeric)
language sql stable security definer set search_path = public
as $$
  with pa as (select * from partners where code = p_code),
  r as (
    select coalesce(sum(partner_revenue(ev.id)), 0) as revenue,
           round(coalesce(sum(partner_revenue(ev.id) * event_partner_rate(ev.id) / 100), 0), 2) as commission
    from events ev where ev.partner_code = p_code
  ),
  po as (select coalesce(sum(amount), 0) as paid from partner_payouts where partner_id = (select id from pa))
  select coalesce((select sum(c.clicks) from partner_clicks c where c.partner_id = (select id from pa)), 0),
         (select count(*) from enquiries e where upper(e.values ->> 'partner_code') = p_code and e.status <> 'spam'),
         (select count(*) from profiles p where p.partner_code = p_code),
         (select count(distinct coalesce(ev.owner_id, ev.id)) from events ev where ev.partner_code = p_code and partner_revenue(ev.id) > 0),
         r.revenue, r.commission, po.paid, r.commission - po.paid
  from r, po;
$$;
revoke all on function partner_totals(text) from public, anon, authenticated;

create or replace function partner_people(p_code text, p_mask boolean)
returns table (kind text, person text, email text, project text, status text, revenue numeric, commission numeric, created_at timestamptz)
language sql stable security definer set search_path = public
as $$
  with enq as (
    select 'enquiry'::text as kind, e.name as person, e.email, ev.name as project, e.status,
           coalesce(case when ev.partner_code = p_code then partner_revenue(ev.id) end, 0) as revenue,
           coalesce(case when ev.partner_code = p_code then partner_revenue(ev.id) * event_partner_rate(ev.id) / 100 end, 0) as commission,
           e.created_at, e.event_id
    from enquiries e left join events ev on ev.id = e.event_id
    where upper(e.values ->> 'partner_code') = p_code and e.status <> 'spam'
  ),
  sig as (
    select 'signup'::text, coalesce(nullif(p.full_name, ''), split_part(p.email, '@', 1)), p.email,
           (select string_agg(ev.name, ', ') from events ev where ev.owner_id = p.id and ev.partner_code = p_code and ev.deleted_at is null),
           case when exists (select 1 from events ev where ev.owner_id = p.id and ev.partner_code = p_code and partner_revenue(ev.id) > 0) then 'paid' else 'signed up' end,
           coalesce((select sum(partner_revenue(ev.id)) from events ev where ev.owner_id = p.id and ev.partner_code = p_code
                     and ev.id not in (select event_id from enq where event_id is not null)), 0),
           coalesce((select sum(partner_revenue(ev.id) * event_partner_rate(ev.id) / 100) from events ev where ev.owner_id = p.id and ev.partner_code = p_code
                     and ev.id not in (select event_id from enq where event_id is not null)), 0),
           p.created_at, null::uuid
    from profiles p where p.partner_code = p_code
  ),
  proj as (
    select 'project'::text, coalesce(o.full_name, ev.name), o.email, ev.name, 'project',
           partner_revenue(ev.id), partner_revenue(ev.id) * event_partner_rate(ev.id) / 100, ev.created_at, ev.id
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
         a.status, a.revenue, round(a.commission, 2), a.created_at
  from allp a
  order by a.created_at desc;
$$;
revoke all on function partner_people(text, boolean) from public, anon, authenticated;

-- A booking's commission rate locks when the client first pays (partner-tiers.sql), and only
-- then: a partner paying for their own client (before handing it over) earns nothing and
-- doesn't fix the rate, so a tier reached in the meantime still counts.
create or replace function lock_partner_rate_trg()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_self boolean;
begin
  if new.status = 'paid' and (tg_op = 'INSERT' or old.status is distinct from 'paid') and new.event_id is not null then
    if tg_table_name = 'payments' then
      v_self := exists (select 1 from events e join partners pa on pa.code = e.partner_code join profiles pr on pr.id = new.profile_id
                        where e.id = new.event_id and pa.email is not null and lower(pr.email) = lower(pa.email));
      if new.kind in ('site_publish', 'invoice') and not v_self then perform lock_partner_rate(new.event_id); end if;
    else
      v_self := exists (select 1 from payments p join events e on e.id = p.event_id join partners pa on pa.code = e.partner_code join profiles pr on pr.id = p.profile_id
                        where p.invoice_id = new.id and p.status = 'paid' and pa.email is not null and lower(pr.email) = lower(pa.email));
      if not v_self then perform lock_partner_rate(new.event_id); end if;
    end if;
  end if;
  return new;
end;
$$;

-- Check: should print 3 | 1 | 2 | 1 | 1
select
  (select count(*) from information_schema.columns
    where table_schema = 'public'
      and ((table_name = 'profiles' and column_name = 'is_coordinator') or (table_name = 'events' and column_name in ('client_of', 'handed_over_at')))) as columns,
  (select count(*) from pg_constraint where conname = 'event_invites_role_check' and pg_get_constraintdef(oid) like '%owner%') as handover_invites,
  (select count(*) from pg_trigger where tgname in ('on_events_client_of_guard', 'on_events_free_limit')) as triggers,
  (select count(*) from pg_proc where proname = 'partner_revenue') as partner_revenue,
  (select count(*) from pg_proc where proname = 'lock_partner_rate_trg' and prosrc like '%v_self%') as rate_lock_rule;
