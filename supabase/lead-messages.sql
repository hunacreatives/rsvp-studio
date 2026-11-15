-- RSVP Studio — Studio → Leads → Message (Nov 15 2026). ADDITIVE, safe to re-run.
-- Run on LIVE (project ubonzkfflxqwcwlbemmy) BEFORE the push.
--
-- Chat messages we send a lead outside email (Viber, SMS, Instagram), logged from Studio
-- so the whole team sees what was said and when. The message itself is sent from the
-- staff member's own app; this is only the record. Email replies stay in enquiry_replies.

create table if not exists enquiry_messages (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references enquiries (id) on delete cascade,
  channel text not null check (channel in ('viber', 'sms', 'instagram')),
  body text not null,
  sender_name text,
  sent_by uuid default auth.uid() references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists enquiry_messages_enquiry_idx on enquiry_messages (enquiry_id, created_at);
alter table enquiry_messages enable row level security;
drop policy if exists "enquiry_messages_staff_read" on enquiry_messages;
create policy "enquiry_messages_staff_read" on enquiry_messages for select using (coalesce(is_staff(), false));
drop policy if exists "enquiry_messages_staff_insert" on enquiry_messages;
create policy "enquiry_messages_staff_insert" on enquiry_messages for insert with check (coalesce(is_staff(), false));

-- Check: should print 2 | 0
select
  (select count(*) from pg_policies where tablename = 'enquiry_messages') as policies,
  (select count(*) from enquiry_messages) as messages;
