-- RSVP Studio — new emails (Oct 24 2026). ADDITIVE, safe to re-run.
-- Run on LIVE (project ubonzkfflxqwcwlbemmy) before pushing.
--   1. followup_log kinds: + site_live ("Your website is live", once per event) and
--      deadline_3 ("Replies close in 3 days", for the host).
--   2. followups_due(): + deadline_3 — a published site whose "Replies close on" (the
--      published content's rsvpDeadline) is 1–3 days away. Same rules as the other
--      follow-ups (owner only, tips and event updates on, not studio projects).
--   3. invitees.std_invited_at: when the host sent "The invitation is ready" to someone who
--      signed up on their Save the Date (each person gets it once).
--   4. lifecycle_due(): + last_call — a week before a site's guest list and photos are
--      deleted (30 days after it went offline), if there's anything to lose.
--      events.last_call_sent_at keeps it to one.
--   5. site_domains.final_notice_sent_at: the 7-day "stops working" warning, once.

-- 1. Follow-up kinds
alter table followup_log drop constraint if exists followup_log_kind_check;
alter table followup_log add constraint followup_log_kind_check
  check (kind in ('draft_1', 'draft_4', 'draft_10', 'rsvp_10', 'headcount', 'after', 'guest_reminder', 'site_live', 'deadline_3'));

-- 2. What's due today (followups.sql, plus deadline_3)
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
  )
  select d.id, d.kind, coalesce(c.rsvps, 0), coalesce(c.guests, 0), coalesce(c.declined, 0)
  from due d
  left join counts c on c.event_id = d.id
  where not exists (select 1 from followup_log l where l.event_id = d.id and l.kind = d.kind);
$$;
revoke all on function followups_due() from public, anon, authenticated;
grant execute on function followups_due() to service_role;

-- 3. Save the Date sign-ups: invitation sent
alter table invitees add column if not exists std_invited_at timestamptz;

-- 4. Last call before guest data is deleted (media-r2.sql's lifecycle_due, plus last_call)
alter table events add column if not exists last_call_sent_at timestamptz;
create or replace function lifecycle_due()
returns table (event_id uuid, action text, live_until timestamptz)
language sql stable security definer set search_path = public
as $$
  select e.id, 'notice', site_live_until(e.id) from events e
    where e.deleted_at is null and not e.managed_by_studio
      and site_live_until(e.id) between now() and now() + interval '14 days'
      and (e.end_notice_sent_at is null or e.end_notice_sent_at < site_live_until(e.id) - interval '15 days')
  union all
  select e.id, 'last_call', site_live_until(e.id) from events e
    where e.deleted_at is null and not e.managed_by_studio
      and site_live_until(e.id) + interval '30 days' between now() + interval '1 day' and now() + interval '8 days'
      and (e.guests_purged_at is null or e.guests_purged_at < site_live_until(e.id))
      and (e.last_call_sent_at is null or e.last_call_sent_at < site_live_until(e.id))
      and exists (select 1 from rsvps r where r.event_id = e.id)
  union all
  select e.id, 'photos', site_live_until(e.id) from events e
    where (e.deleted_at < now() - interval '30 days')
       or (e.deleted_at is null and not e.managed_by_studio
           and site_live_until(e.id) < now() - interval '30 days'
           and (e.photos_purged_at is null or e.photos_purged_at < site_live_until(e.id)))
  union all
  select e.id, 'guests', site_live_until(e.id) from events e
    where e.deleted_at is null and not e.managed_by_studio
      and site_live_until(e.id) < now() - interval '30 days'
      and (e.guests_purged_at is null or e.guests_purged_at < site_live_until(e.id))
  union all
  select e.id, 'purge', null::timestamptz from events e
    where e.deleted_at < now() - interval '30 days';
$$;
revoke all on function lifecycle_due() from public, anon, authenticated;
grant execute on function lifecycle_due() to service_role;

-- 5. Domains: the 7-day warning
alter table site_domains add column if not exists final_notice_sent_at timestamptz;

-- Check: expect 9 kinds, then 3 new columns.
select pg_get_constraintdef(oid) as followup_kinds from pg_constraint where conname = 'followup_log_kind_check';
select
  (select count(*) from information_schema.columns where table_name = 'invitees' and column_name = 'std_invited_at') as std_invited_at,
  (select count(*) from information_schema.columns where table_name = 'events' and column_name = 'last_call_sent_at') as last_call_sent_at,
  (select count(*) from information_schema.columns where table_name = 'site_domains' and column_name = 'final_notice_sent_at') as final_notice_sent_at;
