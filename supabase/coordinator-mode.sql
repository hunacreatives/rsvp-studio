-- RSVP Studio — Coordinator mode, phase 1: roles, invites, permissions (Oct 25 2026).
-- ADDITIVE, safe to re-run. Run on LIVE (project ubonzkfflxqwcwlbemmy) before pushing.
-- The couple owns the event (events.owner_id). Others on it are event_members with a role:
--   cohost       the other half of the couple, family: can edit and pay (what every member
--                could do before this file; existing members become cohosts)
--   coordinator  their coordinator: can edit and publish, can't pay, upgrade or delete
--   viewer       can look, can't change anything
-- People join by an emailed invite (event_invites; only a hash of the link's token is kept)
-- or by a studio invite code, which can now say which role it gives.
--   event_role(e) · can_edit_event(e) · can_bill_event(e)
--   invite_to_event · accept_event_invite · cancel_event_invite · remove_event_member ·
--   event_people

create extension if not exists pgcrypto with schema extensions;

-- 1. Roles ----------------------------------------------------------------------
alter table event_members drop constraint if exists event_members_role_check;
-- Members could do everything before; they keep that as cohosts.
update event_members set role = 'cohost' where role = 'viewer';
alter table event_members add constraint event_members_role_check check (role in ('owner', 'cohost', 'coordinator', 'viewer'));
alter table event_members alter column role set default 'cohost';
alter table event_members add column if not exists added_by uuid references profiles (id) on delete set null;
alter table event_members add column if not exists created_at timestamptz not null default now();

-- Studio invite codes can say who they're for (null = as before: the first to use it owns the
-- event, later ones join as cohosts).
alter table invite_codes add column if not exists role text check (role is null or role in ('owner', 'cohost', 'coordinator', 'viewer'));

-- 2. Who someone is on an event -------------------------------------------------
create or replace function event_role(eid uuid)
returns text
language sql stable security definer set search_path = public
as $$
  select case
    when exists (select 1 from events where id = eid and owner_id = auth.uid() and deleted_at is null) then 'owner'
    else (select m.role from event_members m join events e on e.id = m.event_id
          where m.event_id = eid and m.profile_id = auth.uid() and e.deleted_at is null limit 1)
  end;
$$;
revoke all on function event_role(uuid) from public, anon;
grant execute on function event_role(uuid) to authenticated;

-- Change the website, guests, replies, photos and seating: the couple, cohosts, coordinators, staff.
create or replace function can_edit_event(eid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(is_staff(), false) or coalesce(event_role(eid) in ('owner', 'cohost', 'coordinator'), false);
$$;
revoke all on function can_edit_event(uuid) from public, anon;
grant execute on function can_edit_event(uuid) to authenticated;

-- Pay, upgrade, domains, SMS, invite and remove people: the couple and cohosts (and staff).
create or replace function can_bill_event(eid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(is_staff(), false) or coalesce(event_role(eid) in ('owner', 'cohost'), false);
$$;
revoke all on function can_bill_event(uuid) from public, anon;
grant execute on function can_bill_event(uuid) to authenticated;

-- 3. Viewers can look but not change ---------------------------------------------
drop policy if exists "invitees_members" on invitees;
drop policy if exists "invitees_members_select" on invitees;
drop policy if exists "invitees_members_write" on invitees;
create policy "invitees_members_select" on invitees for select using (can_access_event(event_id));
create policy "invitees_members_write" on invitees for all using (can_edit_event(event_id)) with check (can_edit_event(event_id));

drop policy if exists "rsvps_members_insert" on rsvps;
create policy "rsvps_members_insert" on rsvps for insert with check (added_by_host and can_edit_event(event_id));
drop policy if exists "rsvps_members_update" on rsvps;
create policy "rsvps_members_update" on rsvps for update using (can_edit_event(event_id)) with check (can_edit_event(event_id));
drop policy if exists "rsvps_members_delete" on rsvps;
create policy "rsvps_members_delete" on rsvps for delete using (can_edit_event(event_id));

drop policy if exists "wedding_sites_update_own" on wedding_sites;
create policy "wedding_sites_update_own" on wedding_sites for update using (can_edit_event(event_id)) with check (can_edit_event(event_id));
drop policy if exists "wedding_sites_insert_own" on wedding_sites;
create policy "wedding_sites_insert_own" on wedding_sites for insert with check (can_edit_event(event_id));

drop policy if exists "guest_photos_members_update" on guest_photos;
create policy "guest_photos_members_update" on guest_photos for update using (can_edit_event(event_id)) with check (can_edit_event(event_id));
drop policy if exists "guest_photos_members_delete" on guest_photos;
create policy "guest_photos_members_delete" on guest_photos for delete using (can_edit_event(event_id));

-- 3b. Money is the couple's: invoices and payments, the couple and cohosts (and staff, as
--     before; payments still leave staff out, as in money-owner-only.sql).
drop policy if exists "invoices_select" on invoices;
create policy "invoices_select" on invoices for select using (can_bill_event(event_id));
drop policy if exists "payments_select" on payments;
create policy "payments_select" on payments
  for select using (
    coalesce(is_owner(), false)
    or (not coalesce(is_staff(), false)
        and (profile_id = auth.uid() or (event_id is not null and coalesce(can_bill_event(event_id), false))))
  );

-- 4. Invites by email -----------------------------------------------------------
create table if not exists event_invites (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  email text not null check (char_length(email) between 3 and 254),
  role text not null check (role in ('cohost', 'coordinator', 'viewer')),
  token_hash text not null unique,               -- sha256 of the emailed token, never the token
  invited_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  accepted_by uuid references profiles (id) on delete set null,
  cancelled_at timestamptz
);
create unique index if not exists event_invites_one_open on event_invites (event_id, lower(email)) where accepted_at is null and cancelled_at is null;
alter table event_invites enable row level security;
drop policy if exists "event_invites_select" on event_invites;
create policy "event_invites_select" on event_invites for select using (can_bill_event(event_id));

-- Invite someone. The couple and cohosts invite anyone; a coordinator invites viewers (their
-- day-of crew). Returns the token, once, for the email; only its hash is stored.
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
  if p_role not in ('cohost', 'coordinator', 'viewer') then raise exception 'ROLE'; end if;
  if not (coalesce(v_me in ('owner', 'cohost'), false) or (v_me = 'coordinator' and p_role = 'viewer') or coalesce(is_staff(), false)) then raise exception 'NOT_ALLOWED'; end if;
  if exists (select 1 from events e join profiles p on p.id = e.owner_id where e.id = p_event and lower(p.email) = v_email)
     or exists (select 1 from event_members m join profiles p on p.id = m.profile_id where m.event_id = p_event and lower(p.email) = v_email) then
    raise exception 'ALREADY';
  end if;
  if (select count(*) from event_invites where event_id = p_event and accepted_at is null and cancelled_at is null) >= 30 then raise exception 'TOO_MANY'; end if;
  -- A new invite to the same person replaces the open one.
  update event_invites set cancelled_at = now() where event_id = p_event and lower(email) = v_email and accepted_at is null and cancelled_at is null;
  insert into event_invites (event_id, email, role, token_hash, invited_by)
  values (p_event, v_email, p_role, encode(digest(v_token, 'sha256'), 'hex'), auth.uid())
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'token', v_token);
end;
$$;
revoke all on function invite_to_event(uuid, text, text) from public, anon;
grant execute on function invite_to_event(uuid, text, text) to authenticated;

-- Accept an invite: only the person it was sent to (their sign-in email), while it's open.
create or replace function accept_event_invite(p_token text)
returns jsonb
language plpgsql security definer set search_path = public, extensions
as $$
declare
  i event_invites%rowtype;
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
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
  -- The couple accepting an invite to their own event: nothing to add.
  if not exists (select 1 from events where id = i.event_id and owner_id = auth.uid()) then
    insert into event_members (event_id, profile_id, role, added_by)
    values (i.event_id, auth.uid(), i.role, i.invited_by)
    on conflict (event_id, profile_id) do update set role = excluded.role;
  end if;
  update event_invites set accepted_at = now(), accepted_by = auth.uid() where id = i.id;
  return jsonb_build_object('event_id', i.event_id, 'role', i.role);
end;
$$;
revoke all on function accept_event_invite(text) from public, anon;
grant execute on function accept_event_invite(text) to authenticated;

create or replace function cancel_event_invite(p_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update event_invites set cancelled_at = now()
  where id = p_id and accepted_at is null and cancelled_at is null
    and (coalesce(can_bill_event(event_id), false) or invited_by = auth.uid());
end;
$$;
revoke all on function cancel_event_invite(uuid) from public, anon;
grant execute on function cancel_event_invite(uuid) to authenticated;

-- Take someone off the event (the couple or a cohost; anyone can take themselves off; a
-- coordinator can take off the viewers they added, their crew). The
-- couple can't be removed. Their check-in access goes with them: plans they made for this
-- event pass to the couple, those plans get a new check-in link, and if they were the
-- coordinator the day-before email stops going to them.
create or replace function remove_event_member(p_event uuid, p_profile uuid)
returns void
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_owner uuid;
  v_email text;
begin
  select owner_id into v_owner from events where id = p_event;
  if p_profile = v_owner then raise exception 'OWNER'; end if;
  if not (p_profile = auth.uid() or coalesce(can_bill_event(p_event), false)
          or (event_role(p_event) = 'coordinator' and exists (
                select 1 from event_members where event_id = p_event and profile_id = p_profile and role = 'viewer' and added_by = auth.uid()))) then
    raise exception 'NOT_ALLOWED';
  end if;
  select lower(email) into v_email from profiles where id = p_profile;
  delete from event_members where event_id = p_event and profile_id = p_profile;
  update seating_charts set
    owner_id = coalesce(v_owner, owner_id),
    checkin_token = case when checkin_token is not null then encode(gen_random_bytes(12), 'hex') end
  where event_id = p_event and owner_id = p_profile and v_owner is not null;
  update seating_charts set checkin_contact = null
  where event_id = p_event and lower(coalesce(checkin_contact, '')) = coalesce(v_email, '-');
end;
$$;
revoke all on function remove_event_member(uuid, uuid) from public, anon;
grant execute on function remove_event_member(uuid, uuid) to authenticated;

-- The people on an event and the open invites, for the "People" card. Open invites: the couple
-- and cohosts see them all, a coordinator the ones they sent.
drop function if exists event_people(uuid);
create or replace function event_people(p_event uuid)
returns table (kind text, id uuid, name text, email text, role text, since timestamptz, added_by uuid)
language sql stable security definer set search_path = public
as $$
  select 'person', p.id, p.full_name, p.email, 'owner', e.created_at, null::uuid
  from events e join profiles p on p.id = e.owner_id
  where e.id = p_event and can_access_event(p_event)
  union all
  select 'person', p.id, p.full_name, p.email, m.role, m.created_at, m.added_by
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

-- Check: should print 4 | 6 | 1 | 2
select
  (select count(*) from pg_constraint where conname = 'event_members_role_check' and pg_get_constraintdef(oid) like '%coordinator%') +
  (select count(*) from information_schema.columns where table_name = 'invite_codes' and column_name = 'role') +
  (select count(*) from information_schema.columns where table_name = 'event_members' and column_name in ('added_by', 'created_at')) as role_parts,
  (select count(*) from pg_proc where proname in ('event_role', 'can_edit_event', 'can_bill_event', 'invite_to_event', 'accept_event_invite', 'remove_event_member')) as functions,
  (select count(*) from information_schema.tables where table_name = 'event_invites') as invites_table,
  (select count(*) from pg_policies where policyname in ('invoices_select', 'payments_select') and qual like '%can_bill_event%') as money_couple_only;
