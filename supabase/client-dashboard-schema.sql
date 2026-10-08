-- RSVP Studio — client dashboard schema (ADDITIVE)
-- Paste into the SQL editor for the-rsvp-studio project, AFTER
-- portal-schema.sql, wedding-sites-schema.sql, self-serve-events-schema.sql
-- and event-site-images-storage.sql have been run. Safe to re-run.
--
-- What this adds:
--   1. Studio staff flag on profiles + is_staff() helper. Staff get full
--      access to every portal table through the /studio console.
--   2. Profile fields the Account page edits (phone, location, avatar,
--      billing details, notification preferences).
--   3. "Projects" = the existing `events` rows, extended with progress /
--      next step / services / cover so the site builder and RSVP guest
--      list stay attached to the same row.
--   4. project_tasks, project_activity, invoices, message_threads,
--      messages, thread_reads.
--   5. Storage buckets: `avatars` (public), `project-covers` (public,
--      staff-write), `message-files` (private, thread members only).
--
-- Does NOT touch any legacy per-event RSVP table (francesjash_rsvps, ...).
--
-- After running: make your own login a staff account (last statement,
-- commented out — put your login email in and run it once).

-- ---------------------------------------------------------------------
-- 1. Staff + profile fields
-- ---------------------------------------------------------------------
alter table profiles add column if not exists is_staff boolean not null default false;
alter table profiles add column if not exists phone text;
alter table profiles add column if not exists location text;
alter table profiles add column if not exists avatar_url text;
alter table profiles add column if not exists billing_name text;
alter table profiles add column if not exists billing_email text;
alter table profiles add column if not exists billing_address text;
alter table profiles add column if not exists notify_project_updates boolean not null default true;
alter table profiles add column if not exists notify_billing_updates boolean not null default true;
alter table profiles add column if not exists password_changed_at timestamptz;

create or replace function is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select is_staff from profiles where id = auth.uid()), false);
$$;

-- Clients can't promote themselves: is_staff only changes via staff/SQL.
create or replace function profiles_guard_staff_flag()
returns trigger language plpgsql as $$
begin
  if new.is_staff is distinct from old.is_staff and not is_staff() and auth.uid() is not null then
    new.is_staff := old.is_staff;
  end if;
  return new;
end;
$$;
drop trigger if exists on_profiles_guard_staff on profiles;
create trigger on_profiles_guard_staff before update on profiles
  for each row execute function profiles_guard_staff_flag();

drop policy if exists "profiles_staff_all" on profiles;
create policy "profiles_staff_all" on profiles
  for all using (is_staff()) with check (is_staff());

-- Clients see the studio team's name/photo on messages.
drop policy if exists "profiles_select_staff_public" on profiles;
create policy "profiles_select_staff_public" on profiles
  for select using (is_staff = true and auth.uid() is not null);

-- ---------------------------------------------------------------------
-- 2. Projects (extend events)
-- ---------------------------------------------------------------------
alter table events add column if not exists project_status text not null default 'in_progress';
alter table events drop constraint if exists events_project_status_check;
alter table events add constraint events_project_status_check
  check (project_status in ('in_progress', 'completed'));
alter table events add column if not exists services text[] not null default '{}';
alter table events add column if not exists progress int not null default 0;
alter table events drop constraint if exists events_progress_check;
alter table events add constraint events_progress_check check (progress between 0 and 100);
alter table events add column if not exists next_step text;
alter table events add column if not exists next_step_due date;
alter table events add column if not exists cover_image_url text;
alter table events add column if not exists site_url text; -- live URL for studio-built sites
alter table events add column if not exists completed_at timestamptz;
alter table events add column if not exists updated_at timestamptz not null default now();

create or replace function events_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  if new.project_status = 'completed' and old.project_status is distinct from 'completed' then
    new.completed_at := coalesce(new.completed_at, now());
    new.progress := 100;
  end if;
  return new;
end;
$$;
drop trigger if exists on_events_touch on events;
create trigger on_events_touch before update on events
  for each row execute function events_touch();

-- One place for "can this user see this event": owner, member, or staff.
create or replace function can_access_event(eid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select is_staff()
    or exists (select 1 from events where id = eid and owner_id = auth.uid())
    or exists (select 1 from event_members where event_id = eid and profile_id = auth.uid());
$$;

drop policy if exists "events_staff_all" on events;
create policy "events_staff_all" on events
  for all using (is_staff()) with check (is_staff());

drop policy if exists "event_members_staff_all" on event_members;
create policy "event_members_staff_all" on event_members
  for all using (is_staff()) with check (is_staff());

drop policy if exists "invite_codes_staff_all" on invite_codes;
create policy "invite_codes_staff_all" on invite_codes
  for all using (is_staff()) with check (is_staff());

drop policy if exists "wedding_sites_staff_select" on wedding_sites;
create policy "wedding_sites_staff_select" on wedding_sites
  for select using (is_staff());

drop policy if exists "rsvps_staff_select" on rsvps;
create policy "rsvps_staff_select" on rsvps
  for select using (is_staff());

-- ---------------------------------------------------------------------
-- 3. Activity feed (written by triggers below and by staff)
-- ---------------------------------------------------------------------
create table if not exists project_activity (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  kind text not null default 'update'
    check (kind in ('update', 'file', 'invoice', 'payment', 'task', 'rsvp', 'status')),
  title text not null,
  detail text,
  count int not null default 1, -- rolls up bursts of RSVPs into one row
  created_at timestamptz not null default now()
);
create index if not exists project_activity_event_idx on project_activity (event_id, created_at desc);

alter table project_activity enable row level security;
drop policy if exists "activity_select" on project_activity;
create policy "activity_select" on project_activity
  for select using (can_access_event(event_id));
drop policy if exists "activity_staff_write" on project_activity;
create policy "activity_staff_write" on project_activity
  for all using (is_staff()) with check (is_staff());

create or replace function log_activity(eid uuid, k text, t text, d text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into project_activity (event_id, kind, title, detail) values (eid, k, t, d);
  update events set updated_at = now() where id = eid;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Tasks
-- ---------------------------------------------------------------------
create table if not exists project_tasks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  title text not null,
  due_date date,
  done_at timestamptz,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists project_tasks_event_idx on project_tasks (event_id);

alter table project_tasks enable row level security;
drop policy if exists "tasks_select" on project_tasks;
create policy "tasks_select" on project_tasks
  for select using (can_access_event(event_id));
drop policy if exists "tasks_staff_write" on project_tasks;
create policy "tasks_staff_write" on project_tasks
  for all using (is_staff()) with check (is_staff());

-- Clients can tick their own tasks on/off, nothing else.
create or replace function set_task_done(task_id uuid, done boolean)
returns void language plpgsql security definer set search_path = public as $$
declare t project_tasks;
begin
  select * into t from project_tasks where id = task_id;
  if t.id is null or not can_access_event(t.event_id) then
    raise exception 'not allowed';
  end if;
  update project_tasks set done_at = case when done then now() else null end where id = task_id;
  if done then
    perform log_activity(t.event_id, 'task', 'Task completed', t.title);
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Invoices (PHP)
-- ---------------------------------------------------------------------
create sequence if not exists invoice_number_seq start 1001;

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  number text not null unique default ('RSVP-' || nextval('invoice_number_seq')),
  event_id uuid not null references events (id) on delete cascade,
  description text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'PHP',
  status text not null default 'open' check (status in ('open', 'paid', 'void')),
  issued_at date not null default current_date,
  due_date date,
  paid_at timestamptz,
  payment_url text, -- e.g. a PayMongo / PayPal payment link
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists invoices_event_idx on invoices (event_id);

alter table invoices enable row level security;
drop policy if exists "invoices_select" on invoices;
create policy "invoices_select" on invoices
  for select using (can_access_event(event_id));
drop policy if exists "invoices_staff_write" on invoices;
create policy "invoices_staff_write" on invoices
  for all using (is_staff()) with check (is_staff());

create or replace function invoices_activity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform log_activity(new.event_id, 'invoice', 'Invoice issued', new.number);
  elsif new.status = 'paid' and old.status <> 'paid' then
    new.paid_at := coalesce(new.paid_at, now());
    perform log_activity(new.event_id, 'payment', 'Invoice paid', new.number);
  end if;
  return new;
end;
$$;
drop trigger if exists on_invoices_insert on invoices;
create trigger on_invoices_insert after insert on invoices
  for each row execute function invoices_activity();
drop trigger if exists on_invoices_update on invoices;
create trigger on_invoices_update before update on invoices
  for each row execute function invoices_activity();

-- ---------------------------------------------------------------------
-- 6. Messages
-- ---------------------------------------------------------------------
create table if not exists message_threads (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade, -- the client
  event_id uuid references events (id) on delete set null,
  kind text not null default 'project' check (kind in ('project', 'support', 'general')),
  subject text not null,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists message_threads_profile_idx on message_threads (profile_id, last_message_at desc);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references message_threads (id) on delete cascade,
  sender_id uuid not null references profiles (id) on delete cascade,
  body text not null default '',
  -- [{ name, path, size, type }] — files live in the message-files bucket
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists messages_thread_idx on messages (thread_id, created_at);

create table if not exists thread_reads (
  thread_id uuid not null references message_threads (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (thread_id, profile_id)
);

create or replace function can_access_thread(tid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select is_staff() or exists (
    select 1 from message_threads t
    where t.id = tid
      and (t.profile_id = auth.uid() or (t.event_id is not null and can_access_event(t.event_id)))
  );
$$;

alter table message_threads enable row level security;
alter table messages enable row level security;
alter table thread_reads enable row level security;

drop policy if exists "threads_select" on message_threads;
-- profile_id = auth.uid() first: on INSERT ... RETURNING the security-definer
-- lookup inside can_access_thread() can't see the row being inserted, so
-- without the direct check every new thread failed RLS.
create policy "threads_select" on message_threads
  for select using (profile_id = auth.uid() or can_access_thread(id));
drop policy if exists "threads_insert_own" on message_threads;
create policy "threads_insert_own" on message_threads
  for insert with check (
    (profile_id = auth.uid() and (event_id is null or can_access_event(event_id))) or is_staff()
  );
drop policy if exists "threads_staff_all" on message_threads;
create policy "threads_staff_all" on message_threads
  for all using (is_staff()) with check (is_staff());

drop policy if exists "messages_select" on messages;
create policy "messages_select" on messages
  for select using (can_access_thread(thread_id));
drop policy if exists "messages_insert" on messages;
create policy "messages_insert" on messages
  for insert with check (sender_id = auth.uid() and can_access_thread(thread_id));

drop policy if exists "thread_reads_own" on thread_reads;
create policy "thread_reads_own" on thread_reads
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid() and can_access_thread(thread_id));

create or replace function messages_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare th message_threads;
begin
  update message_threads set last_message_at = new.created_at where id = new.thread_id
    returning * into th;
  -- the sender has obviously read their own message
  insert into thread_reads (thread_id, profile_id, last_read_at)
    values (new.thread_id, new.sender_id, new.created_at)
    on conflict (thread_id, profile_id) do update set last_read_at = excluded.last_read_at;
  -- files the studio shares on a project show up in Recent Activity
  if th.event_id is not null
     and jsonb_array_length(new.attachments) > 0
     and (select is_staff from profiles where id = new.sender_id) then
    perform log_activity(th.event_id, 'file', 'New file shared',
      (select string_agg(a ->> 'name', ', ') from jsonb_array_elements(new.attachments) a));
  end if;
  return new;
end;
$$;
drop trigger if exists on_messages_insert on messages;
create trigger on_messages_insert after insert on messages
  for each row execute function messages_after_insert();

-- Live chat updates in the portal + studio inbox
do $$
begin
  alter publication supabase_realtime add table messages;
exception when duplicate_object or undefined_object then null;
end $$;

-- ---------------------------------------------------------------------
-- 7. Guest list activity (self-serve events' shared rsvps table).
-- Bursts within 24h roll up into one "N new RSVPs" row.
-- ---------------------------------------------------------------------
create or replace function rsvps_activity()
returns trigger language plpgsql security definer set search_path = public as $$
declare recent project_activity;
begin
  select * into recent from project_activity
    where event_id = new.event_id and kind = 'rsvp' and created_at > now() - interval '24 hours'
    order by created_at desc limit 1;
  if recent.id is not null then
    update project_activity
      set count = recent.count + 1,
          title = (recent.count + 1) || ' new RSVPs',
          detail = new.name,
          created_at = now()
      where id = recent.id;
    update events set updated_at = now() where id = new.event_id;
  else
    perform log_activity(new.event_id, 'rsvp', 'Guest list updated', new.name || ' responded');
  end if;
  return new;
end;
$$;
drop trigger if exists on_rsvps_activity on rsvps;
create trigger on_rsvps_activity after insert on rsvps
  for each row execute function rsvps_activity();

-- ---------------------------------------------------------------------
-- 8. Storage
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true), ('project-covers', 'project-covers', true), ('message-files', 'message-files', false)
on conflict (id) do nothing;

-- avatars: <user_id>/<file>
drop policy if exists "avatars_read" on storage.objects;
create policy "avatars_read" on storage.objects
  for select using (bucket_id = 'avatars');
drop policy if exists "avatars_write_own" on storage.objects;
create policy "avatars_write_own" on storage.objects
  for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects
  for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own" on storage.objects
  for delete using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- project-covers: <event_id>/<file>, staff only
drop policy if exists "covers_read" on storage.objects;
create policy "covers_read" on storage.objects
  for select using (bucket_id = 'project-covers');
drop policy if exists "covers_staff_write" on storage.objects;
create policy "covers_staff_write" on storage.objects
  for all using (bucket_id = 'project-covers' and is_staff())
  with check (bucket_id = 'project-covers' and is_staff());

-- message-files: <thread_id>/<uuid>/<file>
drop policy if exists "message_files_read" on storage.objects;
create policy "message_files_read" on storage.objects
  for select using (bucket_id = 'message-files' and can_access_thread(((storage.foldername(name))[1])::uuid));
drop policy if exists "message_files_write" on storage.objects;
create policy "message_files_write" on storage.objects
  for insert with check (bucket_id = 'message-files' and can_access_thread(((storage.foldername(name))[1])::uuid));

-- ---------------------------------------------------------------------
-- 9. Make yourself staff (edit the email, then run this line once)
-- ---------------------------------------------------------------------
-- update profiles set is_staff = true where email = 'YOUR-LOGIN-EMAIL';
