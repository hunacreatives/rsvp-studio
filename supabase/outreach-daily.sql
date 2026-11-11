-- Studio → Outreach, part 3 (Nov 11 2026): a daily list of 20, worked by hand, like Leads.
-- Run on LIVE (ubonzkfflxqwcwlbemmy) after outreach.sql and outreach-email.sql, before pushing the code
-- that uses it. Safe to run twice.
--
-- • No more automatic emails: everyone is contacted by someone on the team, by email (from Gmail),
--   Messenger or Instagram. The 30 Angela's job already emailed count as emailed.
-- • queued_on / queue_channel: the day a business was put on the daily list, and how to reach them.
--   outreach_today() fills today's list up to 20 (unfinished ones carry over and count toward it).
-- • followups: how many follow-ups they've had. Due 5 days after the first message, then 7 days after
--   the first follow-up; two at most.
-- • outreach_days(): earlier days' lists for the history.
alter table outreach_contacts add column if not exists followups int not null default 0;
alter table outreach_contacts add column if not exists queued_on date;
alter table outreach_contacts add column if not exists queue_channel text;
alter table outreach_contacts drop constraint if exists outreach_contacts_queue_channel_check;
alter table outreach_contacts add constraint outreach_contacts_queue_channel_check
  check (queue_channel is null or queue_channel in ('email', 'messenger', 'instagram'));
create index if not exists outreach_queued_idx on outreach_contacts (queued_on);
create index if not exists outreach_pool_idx on outreach_contacts (kind, created_at) where status = 'to_message' and queued_on is null;
-- the emails the old daily job sent are just emails now; one follow-up recorded for anyone who had one
update outreach_contacts set channel = 'email' where channel = 'email_auto';
update outreach_contacts set followups = 1 where followed_up_at is not null and followups = 0;
-- and the job's switch stays off for good
update outreach_settings set auto_email = false where id = 1;

-- Today's list: yesterday's unfinished ones carry over, then it's topped up to p_size: about half by
-- email, half by Messenger / Instagram (those without a working email first), coordinators and caterers
-- first, venues last, one per town before a second. Returns how many are on today's list.
create or replace function outreach_today(p_size int default 20)
returns int
language plpgsql security definer set search_path = public
as $$
declare
  today date := (now() at time zone 'Asia/Manila')::date;
  kinds text[] := array['coordinator', 'caterer', 'stylist', 'photo_video', 'beauty', 'cakes', 'attire', 'entertainment', 'party', 'rentals', 'stationery', 'other', 'venue'];
  have int;
  need int;
  got int := 0;
  n int;
begin
  if not is_staff() then raise exception 'staff only'; end if;
  perform pg_advisory_xact_lock(hashtext('outreach_today'));
  update outreach_contacts set queued_on = today where status = 'to_message' and queued_on < today;
  select count(*) into have from outreach_contacts where queued_on = today;
  need := greatest(0, least(coalesce(p_size, 20), 100) - have);
  if need = 0 then return have; end if;
  -- about half by email
  with pool as (
    select id, array_position(kinds, kind) as k, row_number() over (partition by lower(coalesce(city, '')) order by created_at, id) as rn
    from outreach_contacts
    where status = 'to_message' and queued_on is null and email is not null and bounced_at is null
  ), picked as (select id from pool order by k, rn, id limit ceil(need / 2.0))
  update outreach_contacts c set queued_on = today, queue_channel = 'email' from picked where c.id = picked.id;
  get diagnostics n = row_count;
  got := n;
  -- the rest on Messenger or Instagram
  with pool as (
    select id, case when fb_key is not null then 'messenger' else 'instagram' end as ch,
      (email is not null and bounced_at is null) as has_email,
      array_position(kinds, kind) as k, row_number() over (partition by lower(coalesce(city, '')) order by created_at, id) as rn
    from outreach_contacts
    where status = 'to_message' and queued_on is null and (fb_key is not null or ig_key is not null)
  ), picked as (select id, ch from pool order by has_email, k, rn, id limit need - got)
  update outreach_contacts c set queued_on = today, queue_channel = picked.ch from picked where c.id = picked.id;
  get diagnostics n = row_count;
  got := got + n;
  -- not enough on Messenger / Instagram: more by email
  if got < need then
    with pool as (
      select id, array_position(kinds, kind) as k, row_number() over (partition by lower(coalesce(city, '')) order by created_at, id) as rn
      from outreach_contacts
      where status = 'to_message' and queued_on is null and email is not null and bounced_at is null
    ), picked as (select id from pool order by k, rn, id limit need - got)
    update outreach_contacts c set queued_on = today, queue_channel = 'email' from picked where c.id = picked.id;
  end if;
  select count(*) into have from outreach_contacts where queued_on = today;
  return have;
end;
$$;
revoke all on function outreach_today(int) from public, anon;
grant execute on function outreach_today(int) to authenticated;

-- Earlier days' lists, newest first: how many were on it, contacted, replied, signed up.
create or replace function outreach_days(p_days int default 14)
returns table (day date, total bigint, contacted bigint, replied bigint, signed_up bigint)
language sql stable security definer set search_path = public
as $$
  select queued_on, count(*), count(*) filter (where messaged_at is not null), count(*) filter (where status = 'replied'), count(*) filter (where status = 'signed_up')
  from outreach_contacts
  where is_staff() and queued_on is not null and queued_on < (now() at time zone 'Asia/Manila')::date
  group by queued_on order by queued_on desc limit least(coalesce(p_days, 14), 60);
$$;
revoke all on function outreach_days(int) from public, anon;
grant execute on function outreach_days(int) to authenticated;

create or replace function outreach_refresh()
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  today date := (now() at time zone 'Asia/Manila')::date;
  day_start timestamptz := (date_trunc('day', now() at time zone 'Asia/Manila')) at time zone 'Asia/Manila';
  due1 timestamptz := now() - interval '5 days';
  due2 timestamptz := now() - interval '7 days';
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
    select status, channel, queued_on, messaged_at, followed_up_at,
      (status = 'messaged' and ((followups = 0 and messaged_at < due1) or (followups = 1 and followed_up_at < due2))) as due,
      (coalesce(channel, '') in ('email', 'email_auto')) as by_email
    from outreach_contacts
  )
  select jsonb_build_object(
    'today_total',    count(*) filter (where queued_on = today),
    'today_done',     count(*) filter (where queued_on = today and status <> 'to_message'),
    'follow_up',      count(*) filter (where due),
    'waiting',        count(*) filter (where status = 'messaged' and not due),
    'replied',        count(*) filter (where status = 'replied'),
    'signed_up',      count(*) filter (where status = 'signed_up'),
    'closed',         count(*) filter (where status in ('not_interested', 'skipped')),
    'not_contacted',  count(*) filter (where status = 'to_message'),
    'total',          count(*),
    'emailed_today',  count(*) filter (where by_email and (messaged_at >= day_start or followed_up_at >= day_start)),
    'messaged_today', count(*) filter (where not by_email and (messaged_at >= day_start or followed_up_at >= day_start))
  ) into r
  from c;
  return r;
end;
$$;
revoke all on function outreach_refresh() from public, anon;
grant execute on function outreach_refresh() to authenticated;

-- Check: expect 3 | 0 | false | 3
select
  (select count(*) from information_schema.columns where table_name = 'outreach_contacts' and column_name in ('followups', 'queued_on', 'queue_channel')) as new_columns,
  (select count(*) from outreach_contacts where channel = 'email_auto') as old_job_left,
  (select auto_email from outreach_settings where id = 1) as auto_email,
  (select count(*) from pg_proc where proname in ('outreach_today', 'outreach_days', 'outreach_refresh')) as functions;
