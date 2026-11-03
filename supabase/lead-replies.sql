-- Studio → Leads → Reply: branded replies to inquiry-form leads, sent from Studio
-- (api/notify.ts → lead_reply). Each one is kept on the lead so the whole team sees
-- what was said. Written by the server with the service key; staff read.
-- Run once in the Supabase SQL editor, before pushing the code.

create table if not exists enquiry_replies (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references enquiries (id) on delete cascade,
  sent_by uuid references profiles (id) on delete set null,
  sender_name text,
  subject text not null,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists enquiry_replies_enquiry_idx on enquiry_replies (enquiry_id, created_at);
alter table enquiry_replies enable row level security;
drop policy if exists "enquiry_replies_staff_read" on enquiry_replies;
create policy "enquiry_replies_staff_read" on enquiry_replies for select using (is_staff());

-- Check:
select (select count(*) from pg_policies where tablename = 'enquiry_replies') as policies, (select count(*) from enquiry_replies) as replies;
