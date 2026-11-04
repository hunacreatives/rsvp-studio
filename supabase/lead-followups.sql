-- Studio → Leads follow-ups: if a lead doesn't answer our first reply, up to four short follow-up emails
-- (api/_lib/lead-followups.ts, from the daily support-cron). They stop the moment the lead replies.
--   enquiries.reply_key        their own reply address, lead-<key>@reply.thersvpstudio.com, so a reply is seen
--   enquiries.replies_tracked  true when this lead's emails have used that address (only those get follow-ups,
--                              so nobody whose reply went straight to hello@ is ever nudged)
--   enquiries.replied_at       when they last wrote back (seen by api/_lib/support-inbound.ts, or "Mark replied")
--   enquiries.followups_stopped  why they stopped: replied | unsubscribed | stopped | finished
--   enquiry_replies.tracked    whether that reply of ours used their reply address
--   enquiry_followups          one row per follow-up sent (claimed before sending, so never twice)
--   support_inbound_emails.enquiry_id  which lead an incoming email was a reply from
-- Run once in the Supabase SQL editor, before pushing the code. Safe to run twice.

alter table enquiries add column if not exists reply_key text;
alter table enquiries add column if not exists replies_tracked boolean not null default false;
alter table enquiries add column if not exists replied_at timestamptz;
alter table enquiries add column if not exists followups_stopped text;
alter table enquiries drop constraint if exists enquiries_followups_stopped_check;
alter table enquiries add constraint enquiries_followups_stopped_check check (followups_stopped is null or followups_stopped in ('replied', 'unsubscribed', 'stopped', 'finished'));

-- every lead gets a reply key (new ones by default)
update enquiries set reply_key = substr(md5(random()::text || id::text || clock_timestamp()::text), 1, 16) where reply_key is null;
alter table enquiries alter column reply_key set default substr(md5(random()::text || clock_timestamp()::text), 1, 16);
create unique index if not exists enquiries_reply_key_idx on enquiries (reply_key);

alter table enquiry_replies add column if not exists tracked boolean not null default false;

create table if not exists enquiry_followups (
  enquiry_id uuid not null references enquiries (id) on delete cascade,
  step int not null,
  subject text not null,
  sent_at timestamptz not null default now(),
  primary key (enquiry_id, step)
);
alter table enquiry_followups enable row level security;
drop policy if exists "enquiry_followups_staff_read" on enquiry_followups;
create policy "enquiry_followups_staff_read" on enquiry_followups for select using (is_staff());

alter table support_inbound_emails add column if not exists enquiry_id uuid references enquiries (id) on delete set null;

-- Check: every lead has a key, nothing tracked yet (that starts with the next lead), no follow-ups sent.
select
  (select count(*) from enquiries) as leads,
  (select count(*) from enquiries where reply_key is null) as leads_without_key,
  (select count(*) from enquiries where replies_tracked) as tracked,
  (select count(*) from enquiry_followups) as followups_sent,
  (select count(*) from pg_policies where tablename = 'enquiry_followups') as policies;
