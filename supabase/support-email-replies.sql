-- RSVP Studio — Support email replies (Phase 3B). ADDITIVE, safe to re-run.
-- Run on LIVE before the code that uses it is pushed. Needs support-lifecycle.sql.
-- Replies only start arriving once it's switched on at launch (see the Report tab card):
-- Resend receiving on reply.thersvpstudio.com + the webhook + SUPPORT_EMAIL_REPLIES=on.
--
--   1. Each request gets a private reply key: emails about SUP-1042 come from
--      Reply-To sup-1042.<key>@reply.thersvpstudio.com, so a reply lands on the
--      right request. Staff can reset a key (old address stops working).
--   2. messages.via = 'email' for messages that arrived by email.
--   3. support_inbound_emails: one row per received email (never processed twice),
--      what happened to it, and the full original text for staff.
--   4. Split: staff move a customer message into a new request.

-- ---------------------------------------------------------------------
-- 1. Reply keys
-- ---------------------------------------------------------------------
alter table message_threads add column if not exists reply_key text;
create unique index if not exists message_threads_reply_key_idx on message_threads (reply_key) where reply_key is not null;

create or replace function support_new_reply_key()
returns text language sql volatile as $$
  select substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
$$;

-- Same as support-lifecycle.sql, plus the reply key on insert.
create or replace function support_thread_defaults()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.kind <> 'support' then return new; end if;
  if tg_op = 'INSERT' then
    new.ticket_number := nextval('support_ticket_seq');
    new.reply_key := support_new_reply_key();
    new.status := 'needs_reply';
    new.first_response_at := null;
    new.resolved_at := null;
    new.auto_reply_at := null;
    new.waiting_since := null;
    new.reminder_sent_at := null;
    new.auto_closed_at := null;
    new.rating := null;
    new.rating_comment := null;
    new.rated_at := null;
    new.rating_meta := null;
    new.hold_until := null;
    new.last_customer_at := now();
    new.urgent := new.event_id is not null and support_event_soon(new.event_id);
    if new.category is null then new.category := 'other'; end if;
  elsif new.status is distinct from old.status then
    new.resolved_at := case when new.status = 'resolved' then now() else null end;
    -- the waiting clock starts when we hand it to the customer
    new.waiting_since := case when new.status = 'waiting' then now() else null end;
    -- a customer reply (or reopen) resets the reminder and any auto-close
    if new.status <> 'waiting' and new.status <> 'resolved' then new.reminder_sent_at := null; end if;
    if new.status <> 'resolved' then new.auto_closed_at := null; end if;
  end if;
  return new;
end;
$$;

update message_threads set reply_key = support_new_reply_key()
  where kind = 'support' and reply_key is null;

-- Staff: a new reply address for a request (e.g. an email was forwarded to someone it shouldn't have been).
create or replace function support_rotate_reply_key(p_thread uuid)
returns text language plpgsql security definer set search_path = public as $$
declare k text;
begin
  if not is_staff() then raise exception 'Staff only'; end if;
  update message_threads set reply_key = support_new_reply_key()
    where id = p_thread and kind = 'support' returning reply_key into k;
  return k;
end;
$$;
revoke all on function support_rotate_reply_key(uuid) from public, anon;
grant execute on function support_rotate_reply_key(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 2. Messages that came in by email
-- ---------------------------------------------------------------------
alter table messages add column if not exists via text;
alter table messages drop constraint if exists messages_via_check;
alter table messages add constraint messages_via_check check (via is null or via = 'email');

-- ---------------------------------------------------------------------
-- 3. Received emails (written by the server with the service key; staff read)
-- ---------------------------------------------------------------------
create table if not exists support_inbound_emails (
  email_id text primary key,            -- Resend's id: the same email is never processed twice
  received_at timestamptz,
  from_address text,
  subject text,
  -- processing | posted | new_request | note | unmatched | ignored | error
  outcome text not null default 'processing',
  reason text,
  matched_by text,                      -- reply_address | headers | subject | sender
  thread_id uuid references message_threads (id) on delete set null,
  message_id uuid references messages (id) on delete set null,
  body_full text,
  attempts int not null default 1,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create index if not exists support_inbound_emails_created_idx on support_inbound_emails (created_at desc);
alter table support_inbound_emails enable row level security;
drop policy if exists "support_inbound_staff_read" on support_inbound_emails;
create policy "support_inbound_staff_read" on support_inbound_emails for select using (is_staff());

-- ---------------------------------------------------------------------
-- 4. Split: move one customer message into a new request (same customer,
--    topic and project). Both requests get a note saying where it went.
-- ---------------------------------------------------------------------
create or replace function support_split_message(p_message uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare m messages; th message_threads; nt message_threads;
begin
  if not is_staff() then raise exception 'Staff only'; end if;
  select * into m from messages where id = p_message;
  select * into th from message_threads where id = m.thread_id;
  if th.kind is distinct from 'support' then raise exception 'Not a support request'; end if;
  if m.internal or m.sender_id <> th.profile_id then raise exception 'Only a customer message can be split off'; end if;

  insert into message_threads (profile_id, event_id, kind, subject, category)
    values (th.profile_id, th.event_id, 'support', 'Split from SUP-' || th.ticket_number, th.category)
    returning * into nt;
  update messages set thread_id = nt.id where id = p_message;
  update message_threads set last_message_at = m.created_at, last_customer_at = m.created_at where id = nt.id;

  insert into messages (thread_id, sender_id, body, internal)
    values (th.id, auth.uid(), 'Moved a message to its own request: SUP-' || nt.ticket_number || '.', true),
           (nt.id, auth.uid(), 'Split from SUP-' || th.ticket_number || '.', true);
  return nt.id;
end;
$$;
revoke all on function support_split_message(uuid) from public, anon;
grant execute on function support_split_message(uuid) to authenticated;

-- Check:
select (select count(*) from message_threads where kind = 'support' and reply_key is null) as missing_keys,
       (select count(*) from support_inbound_emails) as inbound_rows;
