-- RSVP Studio — Mesa day-of check-in emails (Oct 25 2026). ADDITIVE, safe to re-run.
-- Run on LIVE (project ubonzkfflxqwcwlbemmy) before pushing. Needs seating-checkin.sql and
-- email-additions.sql.
--   1. seating_charts.checkin_contact: the coordinator the couple emailed the check-in link to
--      (they get the day-before reminder too). checkin_mail_day / checkin_mail_count keep it to
--      5 sends a day per plan, since it emails someone who isn't a user.
--   2. followup_log kinds: + checkin_1 ("Tomorrow: your check-in link").
--   3. followups_due(): + checkin_1 — the event is tomorrow (or today, if a run was missed), it's
--      Premium, and its seating plan has a check-in link that's on. Everything else is as in
--      email-additions.sql.

-- 1. The coordinator, and the daily limit
alter table seating_charts add column if not exists checkin_contact text check (checkin_contact is null or char_length(checkin_contact) <= 254);
alter table seating_charts add column if not exists checkin_mail_day date;
alter table seating_charts add column if not exists checkin_mail_count int not null default 0;

-- 2. Follow-up kinds
alter table followup_log drop constraint if exists followup_log_kind_check;
alter table followup_log add constraint followup_log_kind_check
  check (kind in ('draft_1', 'draft_4', 'draft_10', 'rsvp_10', 'headcount', 'after', 'guest_reminder', 'site_live', 'deadline_3', 'checkin_1'));

-- 3. What's due today (email-additions.sql, plus checkin_1)
create or replace function followups_due()
returns table (event_id uuid, kind text, rsvps int, guests int, declined int)
language sql stable security definer set search_path = public
as $$
  with today as (select (now() at time zone 'Asia/Manila')::date as d),
  base as (
    select e.id, e.created_at, e.event_date, ws.published_at, ws.updated_at as site_updated_at,
           ws.published_content->>'rsvpDeadline' as deadline
    from events e
    join profiles o on o.id = e.owner_id
    left join wedding_sites ws on ws.event_id = e.id
    where e.deleted_at is null
      and not e.managed_by_studio
      and not o.is_staff
      and o.notify_tips
      and coalesce(o.notify_project_updates, true)
      and o.email is not null
  ),
  counts as (
    select r.event_id,
           count(*)::int as rsvps,
           coalesce(sum(case when r.attending is distinct from false then coalesce(r.guest_count, 1) else 0 end), 0)::int as guests,
           count(*) filter (where r.attending = false)::int as declined
    from rsvps r
    where r.event_id in (select id from base)
    group by r.event_id
  ),
  due as (
    -- Unfinished drafts (not while they're still working on it today).
    select b.id, k.kind
    from base b, today t,
      (values ('draft_1', 1, 3), ('draft_4', 4, 7), ('draft_10', 10, 14)) as k(kind, from_days, to_days)
    where b.published_at is null
      and (b.event_date is null or b.event_date >= t.d)
      and b.created_at <= now() - make_interval(days => k.from_days)
      and b.created_at > now() - make_interval(days => k.to_days)
      and (b.site_updated_at is null or b.site_updated_at < now() - interval '20 hours')
    union all
    -- 10 RSVPs on a free site, before the event.
    select b.id, 'rsvp_10'
    from base b join counts c on c.event_id = b.id, today t
    where b.published_at is not null
      and c.rsvps >= 10
      and (b.event_date is null or b.event_date >= t.d)
      and not event_is_premium(b.id)
    union all
    -- A week before: at least one reply in.
    select b.id, 'headcount'
    from base b join counts c on c.event_id = b.id, today t
    where b.published_at is not null
      and b.event_date between t.d + 5 and t.d + 7
    union all
    -- Two days after.
    select b.id, 'after'
    from base b, today t
    where b.published_at is not null
      and b.event_date between t.d - 5 and t.d - 2
    union all
    -- Replies close in 1–3 days (a missed run still catches it).
    select b.id, 'deadline_3'
    from base b, today t
    where b.published_at is not null
      and b.deadline ~ '^\d{4}-\d{2}-\d{2}$'
      and b.deadline::date between t.d + 1 and t.d + 3
      and (b.event_date is null or b.event_date >= t.d)
    union all
    -- The day before (or the morning of, if a run was missed): their check-in link is on.
    select b.id, 'checkin_1'
    from base b, today t
    where b.event_date between t.d and t.d + 1
      and event_is_premium(b.id)
      and exists (
        select 1 from seating_charts s
        where s.event_id = b.id and s.checkin_token is not null and coalesce(s.checkin_until > now(), false))
  )
  select d.id, d.kind, coalesce(c.rsvps, 0), coalesce(c.guests, 0), coalesce(c.declined, 0)
  from due d
  left join counts c on c.event_id = d.id
  where not exists (select 1 from followup_log l where l.event_id = d.id and l.kind = d.kind);
$$;
revoke all on function followups_due() from public, anon, authenticated;
grant execute on function followups_due() to service_role;

-- Check: should print 3 | true
select
  (select count(*) from information_schema.columns where table_name = 'seating_charts' and column_name in ('checkin_contact', 'checkin_mail_day', 'checkin_mail_count')) as new_cols,
  (select pg_get_constraintdef(oid) like '%checkin_1%' from pg_constraint where conname = 'followup_log_kind_check') as checkin_kind;
