-- RSVP Studio — Support lifecycle (Phase 3A). ADDITIVE, safe to re-run.
-- Run on LIVE before the code that uses it is pushed. Needs support-team-tools.sql.
--
--   1. Request timing: waiting_since, reminder_sent_at, auto_closed_at, hold_until.
--   2. Ratings: rating (great / okay / not_good), comment, when, and how it arrived.
--   3. Philippine holidays for the business-hours clock (2026 seeded; editable in the Studio).
--   4. The daily job's claims: reminders and auto-close are claimed in one UPDATE each,
--      so a double run can never send twice. Plus a heartbeat the Studio shows.

-- ---------------------------------------------------------------------
-- 1. Timing columns
-- ---------------------------------------------------------------------
alter table message_threads add column if not exists waiting_since timestamptz;
alter table message_threads add column if not exists reminder_sent_at timestamptz;
alter table message_threads add column if not exists auto_closed_at timestamptz;
alter table message_threads add column if not exists hold_until date;

-- ---------------------------------------------------------------------
-- 2. Ratings
-- ---------------------------------------------------------------------
alter table message_threads add column if not exists rating text;
alter table message_threads drop constraint if exists message_threads_rating_check;
alter table message_threads add constraint message_threads_rating_check check (rating in ('great', 'okay', 'not_good'));
alter table message_threads add column if not exists rating_comment text;
alter table message_threads add column if not exists rated_at timestamptz;
-- user agent, ip, seconds after the email was sent (spotting automated clicks)
alter table message_threads add column if not exists rating_meta jsonb;

-- Status changes keep the timing columns right (extends support-tickets.sql's trigger).
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

-- A staff follow-up while already waiting restarts the waiting clock (and any reminder),
-- so the customer gets the full 3 days from our latest message.
-- Same as support-team-tools.sql otherwise.
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
          first_response_at = coalesce(first_response_at, new.created_at),
          waiting_since = case when status = 'resolved' then waiting_since else new.created_at end,
          reminder_sent_at = case when status = 'resolved' then reminder_sent_at else null end
      where id = th.id;
  else
    update message_threads
      set status = 'needs_reply', last_customer_at = new.created_at
      where id = th.id;
  end if;
  return new;
end;
$$;

-- Requests already waiting: start their clock from their last message.
update message_threads set waiting_since = last_message_at
  where kind = 'support' and status = 'waiting' and waiting_since is null;

-- Customers rate their own request (from the rating page, via the API with the service key).
-- Staff can see ratings; nobody edits them by hand.

-- ---------------------------------------------------------------------
-- 3. Holidays (business-hours clock). Proclamation No. 1006 (2026).
--    Eid'l Fitr / Eid'l Adha and 2027 are added in the Studio once proclaimed.
-- ---------------------------------------------------------------------
create table if not exists support_holidays (
  day date primary key,
  name text not null
);
alter table support_holidays enable row level security;
drop policy if exists "support_holidays_read" on support_holidays;
create policy "support_holidays_read" on support_holidays for select using (auth.uid() is not null);
drop policy if exists "support_holidays_staff_write" on support_holidays;
create policy "support_holidays_staff_write" on support_holidays for all using (is_staff()) with check (is_staff());

insert into support_holidays (day, name) values
  ('2026-01-01', 'New Year''s Day'),
  ('2026-02-17', 'Chinese New Year'),
  ('2026-04-02', 'Maundy Thursday'),
  ('2026-04-03', 'Good Friday'),
  ('2026-04-04', 'Black Saturday'),
  ('2026-04-09', 'Araw ng Kagitingan'),
  ('2026-05-01', 'Labor Day'),
  ('2026-06-12', 'Independence Day'),
  ('2026-08-21', 'Ninoy Aquino Day'),
  ('2026-08-31', 'National Heroes Day'),
  ('2026-11-01', 'All Saints'' Day'),
  ('2026-11-02', 'All Souls'' Day'),
  ('2026-11-30', 'Bonifacio Day'),
  ('2026-12-08', 'Feast of the Immaculate Conception'),
  ('2026-12-24', 'Christmas Eve'),
  ('2026-12-25', 'Christmas Day'),
  ('2026-12-30', 'Rizal Day'),
  ('2026-12-31', 'Last Day of the Year')
on conflict (day) do nothing;

-- ---------------------------------------------------------------------
-- 4. The daily job (api/support-cron.ts, Vercel Cron ~9 AM Manila)
-- ---------------------------------------------------------------------
create table if not exists support_job_runs (
  job text primary key,
  last_run_at timestamptz not null,
  details jsonb
);
alter table support_job_runs enable row level security;
drop policy if exists "support_job_runs_staff_read" on support_job_runs;
create policy "support_job_runs_staff_read" on support_job_runs for select using (is_staff());

-- Is this request's event close (within 14 days) or happening today/soon? Then never auto-close.
create or replace function support_event_guard(p_event uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select event_date between current_date and current_date + 14 from events where id = p_event), false);
$$;

-- Claim the reminders due now: 3 days waiting (1 day if urgent), not on hold, not yet reminded.
-- One UPDATE … RETURNING: a second run at the same time can't claim the same rows.
create or replace function support_claim_reminders()
returns setof message_threads
language sql volatile security definer set search_path = public
as $$
  update message_threads set reminder_sent_at = now()
  where kind = 'support' and status = 'waiting' and reminder_sent_at is null
    and (hold_until is null or hold_until < current_date)
    and waiting_since < now() - case when urgent then interval '1 day' else interval '3 days' end
  returning *;
$$;

-- A reminder couldn't be sent: release it so tomorrow's run tries again.
create or replace function support_release_reminder(p_thread uuid)
returns void
language sql volatile security definer set search_path = public
as $$
  update message_threads set reminder_sent_at = null where id = p_thread;
$$;

-- Claim the auto-closes due now: 7 days waiting, reminded at least 2 days ago, not urgent,
-- not on hold, and the event isn't within 14 days.
create or replace function support_claim_autoclose()
returns setof message_threads
language sql volatile security definer set search_path = public
as $$
  update message_threads set status = 'resolved', auto_closed_at = now()
  where kind = 'support' and status = 'waiting'
    and reminder_sent_at < now() - interval '2 days'
    and waiting_since < now() - interval '7 days'
    and not urgent
    and (hold_until is null or hold_until < current_date)
    and (event_id is null or not support_event_guard(event_id))
  returning *;
$$;

revoke all on function support_claim_reminders(), support_release_reminder(uuid), support_claim_autoclose() from public, anon, authenticated;
grant execute on function support_claim_reminders(), support_release_reminder(uuid), support_claim_autoclose() to service_role;

-- Check:
select (select count(*) from support_holidays) as holidays,
       (select count(*) from message_threads where kind = 'support' and status = 'waiting') as waiting_now;
