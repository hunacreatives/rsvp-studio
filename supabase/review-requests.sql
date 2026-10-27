-- RSVP Studio — asking for a Facebook recommendation after the event (Oct 27 2026). ADDITIVE, safe to re-run.
-- Run on LIVE (ubonzkfflxqwcwlbemmy) before pushing.
--   Day 2 ("after", already sent): now leads with "Recommend us on Facebook". The button goes
--   through thersvpstudio.com/go/review/<token>, which notes the click (followup_log kind
--   review_click) and opens the Facebook Reviews tab.
--   Day 10 (review_10): one short reminder, only if "after" went out and they never pressed it.
--   Same rules as every follow-up: the owner only, notify_tips on, never Studio-built projects.

-- 1. The two new kinds
alter table followup_log drop constraint if exists followup_log_kind_check;
alter table followup_log add constraint followup_log_kind_check
  check (kind in ('draft_1', 'draft_4', 'draft_10', 'rsvp_10', 'headcount', 'after', 'guest_reminder', 'site_live', 'deadline_3', 'checkin_1', 'review_10', 'review_click'));

-- 2. What's due today (seating-checkin-mail.sql, plus review_10)
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
    -- Ten days after: the Facebook recommendation, once more, if the day-2 email went out and
    -- they never pressed its button.
    select b.id, 'review_10'
    from base b, today t
    where b.published_at is not null
      and b.event_date between t.d - 14 and t.d - 10
      and exists (select 1 from followup_log l where l.event_id = b.id and l.kind = 'after')
      and not exists (select 1 from followup_log l where l.event_id = b.id and l.kind = 'review_click')
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

-- Check: should print 1 | 1
select (select count(*) from pg_constraint where conname = 'followup_log_kind_check' and pg_get_constraintdef(oid) like '%review_click%') as kinds,
       (select count(*) from pg_proc where proname = 'followups_due' and prosrc like '%review_10%') as due;
