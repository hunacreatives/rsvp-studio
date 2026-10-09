-- RSVP Studio — Support team tools (Phase 2). ADDITIVE, safe to re-run.
-- Run on LIVE before the code that uses it is pushed. Needs support-tickets.sql.
--
--   1. Internal notes: messages.internal. Customers never see them (enforced
--      here, not just hidden on screen), can't write them, and notes don't
--      move a request's status or send emails.
--   2. Assignment: message_threads.assigned_to (a team member).
--   3. Saved replies: support_saved_replies, shared by the team.

-- ---------------------------------------------------------------------
-- 1. Internal notes
-- ---------------------------------------------------------------------
alter table messages add column if not exists internal boolean not null default false;

-- Customers: only messages that aren't notes. Staff: everything.
drop policy if exists "messages_select" on messages;
create policy "messages_select" on messages
  for select using (can_access_thread(thread_id) and (not internal or is_staff()));

-- Only staff can write a note.
create or replace function messages_guard_internal()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.internal and not coalesce((select is_staff from profiles where id = new.sender_id), false) then
    new.internal := false;
  end if;
  return new;
end;
$$;
drop trigger if exists on_messages_guard_internal on messages;
create trigger on_messages_guard_internal before insert on messages
  for each row execute function messages_guard_internal();

-- Notes don't count as a reply (status, first response stay as they are).
create or replace function support_after_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare th message_threads; staff boolean;
begin
  if new.internal then return new; end if;
  select * into th from message_threads where id = new.thread_id;
  if th.kind is distinct from 'support' then return new; end if;
  select coalesce(is_staff, false) into staff from profiles where id = new.sender_id;
  if staff then
    update message_threads
      set status = case when status = 'resolved' then 'resolved' else 'waiting' end,
          first_response_at = coalesce(first_response_at, new.created_at)
      where id = th.id;
  else
    update message_threads
      set status = 'needs_reply', last_customer_at = new.created_at
      where id = th.id;
  end if;
  return new;
end;
$$;

-- Same as before (client-dashboard-schema.sql), except a note doesn't bump the
-- conversation up the customer's inbox or post its files to their activity feed.
create or replace function messages_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare th message_threads;
begin
  if new.internal then
    select * into th from message_threads where id = new.thread_id;
  else
    update message_threads set last_message_at = new.created_at where id = new.thread_id
      returning * into th;
  end if;
  -- the sender has obviously read their own message
  insert into thread_reads (thread_id, profile_id, last_read_at)
    values (new.thread_id, new.sender_id, new.created_at)
    on conflict (thread_id, profile_id) do update set last_read_at = excluded.last_read_at;
  -- files the studio shares on a project show up in Recent Activity (not a note's files)
  if not new.internal
     and th.event_id is not null
     and jsonb_array_length(new.attachments) > 0
     and (select is_staff from profiles where id = new.sender_id) then
    perform log_activity(th.event_id, 'file', 'New file shared',
      (select string_agg(a ->> 'name', ', ') from jsonb_array_elements(new.attachments) a));
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Assignment
-- ---------------------------------------------------------------------
alter table message_threads add column if not exists assigned_to uuid references profiles (id) on delete set null;
create index if not exists message_threads_assigned on message_threads (assigned_to) where kind = 'support';

-- ---------------------------------------------------------------------
-- 3. Saved replies
-- ---------------------------------------------------------------------
create table if not exists support_saved_replies (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 80),
  body text not null check (length(body) between 1 and 4000),
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table support_saved_replies enable row level security;
drop policy if exists "saved_replies_staff_all" on support_saved_replies;
create policy "saved_replies_staff_all" on support_saved_replies for all using (is_staff()) with check (is_staff());

-- A few to start with (edit or delete them on the Support page).
insert into support_saved_replies (title, body)
select * from (values
  ('Thanks — looking into it', 'Hi {name}, thanks for letting us know. We’re looking into this now and will get back to you shortly.'),
  ('How to pay an invoice', 'Hi {name}, you can pay from Billing in your dashboard: open the invoice and follow the payment details there. Once it’s confirmed, it’s marked Paid and you can download the receipt.'),
  ('Change the RSVP deadline', 'Hi {name}, you can change your RSVP deadline yourself: open your project, go to Website → Edit website, and update the date in the RSVP section. Publish to make it live.'),
  ('Anything else?', 'Hi {name}, glad that’s sorted. I’ll mark this request as resolved — just reply here within 7 days if anything else comes up.')
) as v(title, body)
where not exists (select 1 from support_saved_replies);

-- Check:
select (select count(*) from messages where internal) as notes, (select count(*) from support_saved_replies) as saved_replies;
