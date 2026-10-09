-- RSVP Studio — Team & roles (Phase 0). ADDITIVE, safe to re-run.
-- Run on STAGING first, test, then on LIVE, before the code that uses it
-- is pushed.
--
-- What this adds:
--   1. profiles.staff_role: 'owner' | 'admin' | null (customer).
--      profiles.is_staff stays and now simply means "has a role", so every
--      existing access rule (is_staff()) keeps working unchanged.
--   2. Exactly one owner, enforced by a unique index.
--   3. Roles can't be changed by editing a profile (not even by staff);
--      only through the team functions below, which check who is asking.
--   4. staff_invites: admins invited by email before they have an account.
--      The role is applied when that email is confirmed.
--   5. staff_role_events: a log of every role change (who, what, when).
--   6. Functions for the Studio → Team page: invite_admin, cancel_staff_invite,
--      remove_admin, transfer_ownership. Owner only.
--   7. Setup: hello@thersvpstudio.com = owner, hunacreatives@gmail.com = admin
--      (invited if they have no account yet). Anyone else who is staff today
--      becomes an admin, so nobody is locked out; the owner can remove them.

-- ---------------------------------------------------------------------
-- 1. Role column
-- ---------------------------------------------------------------------
alter table profiles add column if not exists staff_role text;
alter table profiles drop constraint if exists profiles_staff_role_check;
alter table profiles add constraint profiles_staff_role_check check (staff_role in ('owner', 'admin'));

-- Today's staff keep their access (as admins) before is_staff follows the role.
update profiles set staff_role = 'admin' where is_staff and staff_role is null;

-- 2. One owner, ever.
create unique index if not exists profiles_one_owner on profiles ((true)) where staff_role = 'owner';

create or replace function is_owner()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select staff_role = 'owner' from profiles where id = auth.uid()), false);
$$;

-- ---------------------------------------------------------------------
-- 3. Guard: roles change only through the team functions (or the SQL
--    editor, where there is no signed-in user). is_staff follows the role.
-- ---------------------------------------------------------------------
create or replace function profiles_guard_staff_flag()
returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE'
     and (new.staff_role is distinct from old.staff_role or new.is_staff is distinct from old.is_staff)
     and auth.uid() is not null
     and coalesce(current_setting('rsvp.team_change', true), '') <> 'on' then
    new.staff_role := old.staff_role;
  end if;
  if tg_op = 'INSERT' and auth.uid() is not null
     and coalesce(current_setting('rsvp.team_change', true), '') <> 'on' then
    new.staff_role := null;
  end if;
  new.is_staff := new.staff_role is not null;
  return new;
end;
$$;
drop trigger if exists on_profiles_guard_staff on profiles;
create trigger on_profiles_guard_staff before insert or update on profiles
  for each row execute function profiles_guard_staff_flag();

-- ---------------------------------------------------------------------
-- 4. Invites + 5. log
-- ---------------------------------------------------------------------
create table if not exists staff_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null default 'admin' check (role in ('admin')),
  invited_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  last_sent_at timestamptz not null default now(),
  accepted_at timestamptz,
  accepted_by uuid references profiles (id) on delete set null,
  cancelled_at timestamptz
);
create unique index if not exists staff_invites_one_pending on staff_invites (lower(email))
  where accepted_at is null and cancelled_at is null;

create table if not exists staff_role_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles (id) on delete set null,
  email text,
  action text not null check (action in ('invited', 'invite_cancelled', 'invite_accepted', 'added', 'removed', 'ownership_received', 'ownership_given', 'setup')),
  from_role text,
  to_role text,
  actor_id uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists staff_role_events_recent on staff_role_events (created_at desc);

alter table staff_invites enable row level security;
alter table staff_role_events enable row level security;
-- Staff can see the team, its invites and its history; changes go through the functions.
drop policy if exists "staff_invites_staff_select" on staff_invites;
create policy "staff_invites_staff_select" on staff_invites for select using (is_staff());
drop policy if exists "staff_role_events_staff_select" on staff_role_events;
create policy "staff_role_events_staff_select" on staff_role_events for select using (is_staff());

-- ---------------------------------------------------------------------
-- 6. Team functions (owner only)
-- ---------------------------------------------------------------------

-- Add an admin by email. Someone with an account becomes admin now
-- ('added'); anyone else gets a pending invite ('invited').
create or replace function invite_admin(p_email text)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_profile profiles;
  v_invite staff_invites;
begin
  if not is_owner() then raise exception 'Only the owner can add admins.'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'That doesn''t look like an email address.'; end if;

  select * into v_profile from profiles where lower(email) = v_email limit 1;
  if found then
    if v_profile.staff_role is not null then raise exception '% is already on the team.', v_email; end if;
    perform set_config('rsvp.team_change', 'on', true);
    update profiles set staff_role = 'admin' where id = v_profile.id;
    insert into staff_role_events (profile_id, email, action, from_role, to_role, actor_id)
      values (v_profile.id, v_email, 'added', null, 'admin', auth.uid());
    return json_build_object('status', 'added', 'profile_id', v_profile.id);
  end if;

  select * into v_invite from staff_invites where lower(email) = v_email and accepted_at is null and cancelled_at is null;
  if found then
    update staff_invites set last_sent_at = now() where id = v_invite.id;
    return json_build_object('status', 'invited', 'invite_id', v_invite.id, 'resent', true);
  end if;
  insert into staff_invites (email, role, invited_by) values (v_email, 'admin', auth.uid()) returning * into v_invite;
  insert into staff_role_events (email, action, to_role, actor_id) values (v_email, 'invited', 'admin', auth.uid());
  return json_build_object('status', 'invited', 'invite_id', v_invite.id, 'resent', false);
end;
$$;

create or replace function cancel_staff_invite(p_invite uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_invite staff_invites;
begin
  if not is_owner() then raise exception 'Only the owner can cancel invites.'; end if;
  update staff_invites set cancelled_at = now()
    where id = p_invite and accepted_at is null and cancelled_at is null
    returning * into v_invite;
  if not found then raise exception 'That invite is no longer pending.'; end if;
  insert into staff_role_events (email, action, from_role, actor_id) values (v_invite.email, 'invite_cancelled', v_invite.role, auth.uid());
end;
$$;

create or replace function remove_admin(p_profile uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_profile profiles;
begin
  if not is_owner() then raise exception 'Only the owner can remove admins.'; end if;
  select * into v_profile from profiles where id = p_profile;
  if not found or v_profile.staff_role is null then raise exception 'That person isn''t on the team.'; end if;
  if v_profile.staff_role = 'owner' then raise exception 'The owner can''t be removed. Transfer ownership first.'; end if;
  perform set_config('rsvp.team_change', 'on', true);
  update profiles set staff_role = null where id = p_profile;
  insert into staff_role_events (profile_id, email, action, from_role, to_role, actor_id)
    values (p_profile, v_profile.email, 'removed', 'admin', null, auth.uid());
end;
$$;

-- Hand ownership to an admin; the old owner becomes an admin.
create or replace function transfer_ownership(p_profile uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_target profiles; v_me uuid := auth.uid();
begin
  if not is_owner() then raise exception 'Only the owner can transfer ownership.'; end if;
  select * into v_target from profiles where id = p_profile;
  if not found or v_target.staff_role is distinct from 'admin' then raise exception 'Ownership can only go to an admin.'; end if;
  perform set_config('rsvp.team_change', 'on', true);
  update profiles set staff_role = 'admin' where id = v_me;      -- free the single owner slot first
  update profiles set staff_role = 'owner' where id = p_profile;
  insert into staff_role_events (profile_id, email, action, from_role, to_role, actor_id) values
    (p_profile, v_target.email, 'ownership_received', 'admin', 'owner', v_me),
    (v_me, (select email from profiles where id = v_me), 'ownership_given', 'owner', 'admin', v_me);
end;
$$;

revoke all on function invite_admin(text), cancel_staff_invite(uuid), remove_admin(uuid), transfer_ownership(uuid) from public, anon;
grant execute on function invite_admin(text), cancel_staff_invite(uuid), remove_admin(uuid), transfer_ownership(uuid) to authenticated;

-- An invited email becomes admin once it's confirmed (sign-up link clicked,
-- or Google sign-in). Runs after handle_new_user has created the profile
-- (triggers on the same table fire in name order: "on_…" before "zz_…").
create or replace function apply_staff_invite()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare v_invite staff_invites;
begin
  if new.email_confirmed_at is null then return new; end if;
  if tg_op = 'UPDATE' and old.email_confirmed_at is not null then return new; end if;
  select * into v_invite from staff_invites
    where lower(email) = lower(new.email) and accepted_at is null and cancelled_at is null
    order by created_at desc limit 1;
  if not found then return new; end if;
  perform set_config('rsvp.team_change', 'on', true);
  update profiles set staff_role = v_invite.role where id = new.id and staff_role is null;
  update staff_invites set accepted_at = now(), accepted_by = new.id where id = v_invite.id;
  insert into staff_role_events (profile_id, email, action, to_role, actor_id)
    values (new.id, lower(new.email), 'invite_accepted', v_invite.role, new.id);
  return new;
end;
$$;
drop trigger if exists zz_apply_staff_invite on auth.users;
create trigger zz_apply_staff_invite after insert or update of email_confirmed_at on auth.users
  for each row execute function apply_staff_invite();

-- ---------------------------------------------------------------------
-- 7. Setup: owner + first admin
-- ---------------------------------------------------------------------
do $$
declare
  owner_email constant text := 'hello@thersvpstudio.com';
  admin_email constant text := 'hunacreatives@gmail.com';
  v_owner uuid;
  v_admin uuid;
begin
  perform set_config('rsvp.team_change', 'on', true);

  select id into v_owner from profiles where lower(email) = owner_email limit 1;
  if v_owner is null then
    raise notice 'No account for % yet: sign up with it, then run this file again.', owner_email;
  elsif not exists (select 1 from profiles where staff_role = 'owner') then
    update profiles set staff_role = 'owner' where id = v_owner;
    insert into staff_role_events (profile_id, email, action, to_role) values (v_owner, owner_email, 'setup', 'owner');
  end if;

  select id into v_admin from profiles where lower(email) = admin_email limit 1;
  if v_admin is not null then
    update profiles set staff_role = 'admin' where id = v_admin and staff_role is null;
    if found then
      insert into staff_role_events (profile_id, email, action, to_role) values (v_admin, admin_email, 'setup', 'admin');
    end if;
  elsif not exists (select 1 from staff_invites where lower(email) = admin_email and accepted_at is null and cancelled_at is null) then
    insert into staff_invites (email, role, invited_by) values (admin_email, 'admin', v_owner);
    insert into staff_role_events (email, action, to_role, actor_id) values (admin_email, 'invited', 'admin', v_owner);
  end if;
end;
$$;

-- Check the result:
select email, staff_role from profiles where staff_role is not null order by staff_role desc, email;
