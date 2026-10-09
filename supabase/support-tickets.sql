-- RSVP Studio — Support requests (Phase 1). ADDITIVE, safe to re-run.
-- Run on STAGING first, test, then on LIVE, before the code is pushed.
-- Needs team-roles.sql (Phase 0) to have been run.
--
-- Support requests stay ordinary message threads (kind = 'support'), so the
-- chat, attachments, live updates and unread dots all keep working. This adds:
--   1. Request numbers (SUP-1001 onward), a topic, a status and an Urgent flag.
--   2. Automatic status changes: a studio reply → waiting on the customer;
--      a customer message → needs a reply (and reopens a resolved request).
--      Resolved requests close after 7 days: no more replies, start a new one.
--   3. Urgent = the customer's event is within 7 days.
--   4. resolve_my_request(): customers can mark their own request solved.
--   5. Existing support threads get numbers too.

-- ---------------------------------------------------------------------
-- 1. Columns
-- ---------------------------------------------------------------------
create sequence if not exists support_ticket_seq start 1001;

alter table message_threads add column if not exists ticket_number int;
alter table message_threads add column if not exists category text;
alter table message_threads add column if not exists status text;
alter table message_threads add column if not exists urgent boolean not null default false;
alter table message_threads add column if not exists first_response_at timestamptz;
alter table message_threads add column if not exists resolved_at timestamptz;
alter table message_threads add column if not exists last_customer_at timestamptz;
-- When the last auto-response went out (one per 10 minutes at most; set by the email API).
alter table message_threads add column if not exists auto_reply_at timestamptz;

alter table message_threads drop constraint if exists message_threads_status_check;
alter table message_threads add constraint message_threads_status_check check (status in ('needs_reply', 'waiting', 'resolved'));
alter table message_threads drop constraint if exists message_threads_category_check;
alter table message_threads add constraint message_threads_category_check
  check (category in ('website', 'invitations', 'stationery', 'billing', 'account', 'other'));
create unique index if not exists message_threads_ticket_number on message_threads (ticket_number) where ticket_number is not null;
create index if not exists message_threads_support_queue on message_threads (status, last_message_at desc) where kind = 'support';

-- Is the customer's event within the next 7 days?
create or replace function support_event_soon(p_event uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select event_date between current_date and current_date + 7 from events where id = p_event), false);
$$;

-- ---------------------------------------------------------------------
-- 2. New support requests: number, status, urgency. Customers can't set
--    these themselves (they're always filled in here).
-- ---------------------------------------------------------------------
create or replace function support_thread_defaults()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.kind <> 'support' then return new; end if;
  if tg_op = 'INSERT' then
    new.ticket_number := nextval('support_ticket_seq');
    new.status := 'needs_reply';
    new.first_response_at := null;
    new.resolved_at := null;
    new.auto_reply_at := null;
    new.last_customer_at := now();
    new.urgent := new.event_id is not null and support_event_soon(new.event_id);
    if new.category is null then new.category := 'other'; end if;
  else
    -- Staff change the status; resolved_at follows it.
    if new.status is distinct from old.status then
      new.resolved_at := case when new.status = 'resolved' then now() else null end;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists on_support_thread_defaults on message_threads;
create trigger on_support_thread_defaults before insert or update on message_threads
  for each row execute function support_thread_defaults();

-- ---------------------------------------------------------------------
-- 3. Each new message moves the status along.
-- ---------------------------------------------------------------------
create or replace function support_after_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare th message_threads; staff boolean;
begin
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
drop trigger if exists on_support_after_message on messages;
create trigger on_support_after_message after insert on messages
  for each row execute function support_after_message();

-- A request resolved more than 7 days ago is closed: no more customer replies.
create or replace function support_block_closed()
returns trigger language plpgsql security definer set search_path = public as $$
declare th message_threads;
begin
  select * into th from message_threads where id = new.thread_id;
  if th.kind = 'support' and th.status = 'resolved' and th.resolved_at < now() - interval '7 days'
     and not coalesce((select is_staff from profiles where id = new.sender_id), false) then
    raise exception 'This request is closed. Please start a new one and mention SUP-%.', th.ticket_number;
  end if;
  return new;
end;
$$;
drop trigger if exists on_support_block_closed on messages;
create trigger on_support_block_closed before insert on messages
  for each row execute function support_block_closed();

-- ---------------------------------------------------------------------
-- 4. Customers mark their own request solved.
-- ---------------------------------------------------------------------
create or replace function resolve_my_request(p_thread uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update message_threads set status = 'resolved'
    where id = p_thread and kind = 'support' and profile_id = auth.uid() and status <> 'resolved';
  if not found then raise exception 'That request can''t be marked solved.'; end if;
end;
$$;
revoke all on function resolve_my_request(uuid) from public, anon;
grant execute on function resolve_my_request(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 5. Existing support threads: numbers in the order they arrived, a topic
--    from their old "Support: …" subject, and a status from who spoke last.
-- ---------------------------------------------------------------------
do $$
declare t record; last_staff boolean;
begin
  for t in select * from message_threads where kind = 'support' and ticket_number is null order by created_at loop
    select coalesce(p.is_staff, false) into last_staff
      from messages m join profiles p on p.id = m.sender_id
      where m.thread_id = t.id order by m.created_at desc limit 1;
    update message_threads set
      ticket_number = nextval('support_ticket_seq'),
      category = coalesce(category, case
        when subject ~* 'website' then 'website'
        when subject ~* 'invitation|rsvp' then 'invitations'
        when subject ~* 'stationery' then 'stationery'
        when subject ~* 'billing|payment' then 'billing'
        when subject ~* 'account|login' then 'account'
        else 'other' end),
      status = coalesce(status, case when last_staff then 'waiting' else 'needs_reply' end),
      last_customer_at = coalesce(last_customer_at, t.last_message_at)
    where id = t.id;
  end loop;
end;
$$;

-- Check the result:
select ticket_number, category, status, urgent, subject from message_threads where kind = 'support' order by ticket_number;
