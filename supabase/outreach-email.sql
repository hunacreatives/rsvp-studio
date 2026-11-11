-- Studio → Outreach, part 2 (Nov 11 2026): Angela's automatic emails next to the team's own messages.
-- Run on LIVE (ubonzkfflxqwcwlbemmy) after outreach.sql, before pushing the code that uses it. Safe to run twice.
--
-- • channel: how we first reached them. 'email_auto' = the daily email job (api/_lib/outreach-mail.ts);
--   'messenger' / 'instagram' / 'viber' / 'email' / 'website' / 'call' = someone on the team.
-- • bounced_at / stop_reason: an email that bounced, a "stop" reply, a spam report.
-- • outreach_settings: the Start / Pause switch and how many first emails go out each morning.
-- • The Messenger / Viber messages, signed by Angela, with a caterer set.
-- • outreach_refresh(): counts for the two lanes (emailed automatically / your turn).

alter table outreach_contacts add column if not exists channel text;
alter table outreach_contacts add column if not exists bounced_at timestamptz;
alter table outreach_contacts add column if not exists stop_reason text;
alter table outreach_contacts drop constraint if exists outreach_contacts_channel_check;
alter table outreach_contacts add constraint outreach_contacts_channel_check
  check (channel is null or channel in ('email_auto', 'messenger', 'instagram', 'viber', 'email', 'website', 'call'));
create index if not exists outreach_channel_idx on outreach_contacts (channel, messaged_at);
create index if not exists outreach_email_queue_idx on outreach_contacts (kind, created_at) where status = 'to_message' and email is not null and bounced_at is null;

alter table support_inbound_emails add column if not exists outreach_id uuid references outreach_contacts (id) on delete set null;

create table if not exists outreach_settings (
  id int primary key default 1 check (id = 1),
  auto_email boolean not null default false,
  daily_limit int not null default 30 check (daily_limit between 1 and 200),
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles (id) on delete set null
);
insert into outreach_settings (id) values (1) on conflict (id) do nothing;
alter table outreach_settings enable row level security;
drop policy if exists "outreach_settings_staff" on outreach_settings;
create policy "outreach_settings_staff" on outreach_settings for all using (is_staff()) with check (is_staff());

alter table outreach_messages drop constraint if exists outreach_messages_key_check;
alter table outreach_messages add constraint outreach_messages_key_check
  check (key in ('opener', 'followup', 'opener_venue', 'followup_venue', 'opener_caterer', 'followup_caterer', 'opener_supplier', 'followup_supplier'));
insert into outreach_messages (key, body) values
  ('opener', E'Hi {name}, I''m Angela from The RSVP Studio. We make event websites for weddings, debuts and birthdays, so guests can see the details and RSVP from one link.\n\nYou already keep every celebration running, so we''d love to make the guest list part easier. Our coordinator dashboard is free: set up each client''s site and guest list, and see who''s coming, plus-ones and dietary notes in one place. Your clients get 10% off with your code, and you earn 10% to 20% of every booking.\n\nJust reply "yes" and I''ll set everything up. Here''s how it works: {link}'),
  ('followup', E'Hi {name}, just bringing this back up. If partnering sounds good, reply "yes" and I''ll set it up for you. It only takes a minute. If now isn''t the right time, no worries at all. Here''s the link again: {link}'),
  ('opener_venue', E'Hi {name}, I''m Angela from The RSVP Studio. We make event websites for weddings, debuts and birthdays, so guests can see the details and RSVP from one link.\n\nA lot of celebrations start at places like yours, so we''d love to partner with you. Your clients get 10% off with your code, and you earn 10% to 20% of every booking.\n\nJust reply "yes" and I''ll set everything up. Here''s how it works: {link}'),
  ('followup_venue', E'Hi {name}, just bringing this back up. If partnering sounds good, reply "yes" and I''ll set it up for you. It only takes a minute. If now isn''t the right time, no worries at all. Here''s the link again: {link}'),
  ('opener_caterer', E'Hi {name}, I''m Angela from The RSVP Studio. We make event websites for weddings, debuts and birthdays, so guests can see the details and RSVP from one link.\n\nGood food is half the celebration, so we''d love to partner with you. Guests share their dietary notes when they RSVP, so you get a firm headcount early. Your clients get 10% off with your code, and you earn 10% to 20% of every booking.\n\nJust reply "yes" and I''ll set everything up. Here''s how it works: {link}'),
  ('followup_caterer', E'Hi {name}, just bringing this back up. If partnering sounds good, reply "yes" and I''ll set it up for you. It only takes a minute. If now isn''t the right time, no worries at all. Here''s the link again: {link}'),
  ('opener_supplier', E'Hi {name}, I''m Angela from The RSVP Studio. We make event websites for weddings, debuts and birthdays, so guests can see the details and RSVP from one link.\n\nWe''re partnering with event suppliers in {city}, and we''d love to have you. Your clients get 10% off with your code, and you earn 10% to 20% of every booking.\n\nJust reply "yes" and I''ll set everything up. Here''s how it works: {link}'),
  ('followup_supplier', E'Hi {name}, just bringing this back up. If partnering sounds good, reply "yes" and I''ll set it up for you. It only takes a minute. If now isn''t the right time, no worries at all. Here''s the link again: {link}')
on conflict (key) do update set body = excluded.body, updated_at = now();

create or replace function outreach_refresh()
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  today timestamptz := (date_trunc('day', now() at time zone 'Asia/Manila')) at time zone 'Asia/Manila';
  due timestamptz := now() - interval '5 days';
  r jsonb;
begin
  if not is_staff() then raise exception 'staff only'; end if;
  -- an account made through their link, or with their email / mobile
  update outreach_contacts c
  set status = 'signed_up', signed_up_at = coalesce(c.signed_up_at, p.created_at), matched_profile = p.id
  from profiles p
  where c.matched_profile is null and c.status <> 'signed_up' and not p.is_staff
    and (p.signup_source_detail = 'outreach · ' || c.code
         or (c.email is not null and lower(p.email) = c.email)
         or (c.phone_key is not null and right(regexp_replace(coalesce(p.phone, ''), '\D', '', 'g'), 10) = c.phone_key));
  -- a partner application through their link, or with their email / mobile / Instagram
  update outreach_contacts c
  set status = 'signed_up', signed_up_at = coalesce(c.signed_up_at, e.created_at), matched_enquiry = e.id
  from enquiries e
  where c.matched_enquiry is null and c.status <> 'signed_up' and e.form = 'partner-inquiry' and e.status <> 'spam'
    and (e.values ->> 'source_detail' = 'outreach · ' || c.code
         or (c.email is not null and lower(e.email) = c.email)
         or (c.phone_key is not null and right(regexp_replace(coalesce(e.phone, ''), '\D', '', 'g'), 10) = c.phone_key)
         or (c.ig_key is not null and lower(regexp_replace(regexp_replace(coalesce(e.values ->> 'instagram', e.values ->> 'ig_handle', ''),
               '^(https?://)?(www\.)?instagram\.com/|^@', '', 'i'), '[/?#].*$', '')) = c.ig_key));
  with c as (
    select status, channel, messaged_at, followed_up_at, fb_key, ig_key, phone_key,
      -- the team's list: no email (or it bounced), or a follow-up they owe
      (status = 'to_message' and (email is null or bounced_at is not null)) as yours,
      (status = 'messaged' and coalesce(channel, '') <> 'email_auto' and followed_up_at is null and messaged_at < due) as your_followup,
      (status = 'messaged' and coalesce(channel, '') <> 'email_auto' and not (followed_up_at is null and messaged_at < due)) as team_waiting,
      (email is not null and bounced_at is null and (status = 'to_message' or (status = 'messaged' and channel = 'email_auto'))) as emailing,
      length(regexp_replace(coalesce(phone, ''), '\D', '', 'g')) >= 7 as has_phone
    from outreach_contacts
  )
  select jsonb_build_object(
    'your_turn',      count(*) filter (where yours or your_followup),
    'your_followups', count(*) filter (where your_followup),
    'your_messenger', count(*) filter (where yours and fb_key is not null),
    'your_instagram', count(*) filter (where yours and fb_key is null and ig_key is not null),
    'your_viber',     count(*) filter (where yours and fb_key is null and ig_key is null and coalesce(phone_key, '') ~ '^9[0-9]{9}$'),
    'your_call',      count(*) filter (where yours and fb_key is null and ig_key is null and coalesce(phone_key, '') !~ '^9[0-9]{9}$' and has_phone),
    'team_waiting',   count(*) filter (where team_waiting),
    'team_today',     count(*) filter (where coalesce(channel, '') <> 'email_auto' and messaged_at >= today)
                      + count(*) filter (where coalesce(channel, '') <> 'email_auto' and followed_up_at >= today),
    'emailing',       count(*) filter (where emailing),
    'email_queue',    count(*) filter (where emailing and status = 'to_message'),
    'auto_today',     count(*) filter (where channel = 'email_auto' and messaged_at >= today),
    'auto_followups_today', count(*) filter (where channel = 'email_auto' and followed_up_at >= today),
    'auto_total',     count(*) filter (where channel = 'email_auto' and messaged_at is not null),
    'auto_replied',   count(*) filter (where channel = 'email_auto' and status in ('replied', 'signed_up')),
    'replied',        count(*) filter (where status = 'replied'),
    'signed_up',      count(*) filter (where status = 'signed_up'),
    'closed',         count(*) filter (where status in ('not_interested', 'skipped')),
    'total',          count(*),
    'auto_on',        coalesce((select auto_email from outreach_settings where id = 1), false),
    'daily_limit',    coalesce((select daily_limit from outreach_settings where id = 1), 30),
    'last_run',       (select last_run_at from support_job_runs where job = 'outreach-daily')
  ) into r
  from c;
  return r;
end;
$$;
revoke all on function outreach_refresh() from public, anon;
grant execute on function outreach_refresh() to authenticated;

-- Check: expect 3 | 8 | false | 0
select
  (select count(*) from information_schema.columns where table_name = 'outreach_contacts' and column_name in ('channel', 'bounced_at', 'stop_reason')) as new_columns,
  (select count(*) from outreach_messages) as messages,
  (select auto_email from outreach_settings where id = 1) as emailing_on,
  (select count(*) from outreach_messages where body ilike '%francis%') as still_francis;
