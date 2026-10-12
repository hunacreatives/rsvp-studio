-- RSVP Studio — follow-up emails (run by the daily job, api/_lib/followups.ts).
--   draft_1 / draft_4 / draft_10 — a DIY website still unpublished 1, 4 and 10 days
--                                  after the project was made. Stops once it's
--                                  published or deleted.
--   rsvp_10   — a free site reaches 10 RSVPs: what Premium adds.
--   headcount — the event is a week away: the RSVP count so far.
--   after     — 2 days after the event: thank you, thank-you cards, how did we do.
-- One of each per project, ever (followup_log). Only to the project's owner, and
-- only while profiles.notify_tips is on (Account → Notifications, or the
-- unsubscribe link in each email) and project updates aren't switched off.
-- Studio-built projects never get these.

alter table profiles add column if not exists notify_tips boolean not null default true;

create table if not exists followup_log (
  event_id uuid not null references events (id) on delete cascade,
  kind text not null check (kind in ('draft_1', 'draft_4', 'draft_10', 'rsvp_10', 'headcount', 'after')),
  sent_at timestamptz not null default now(),
  primary key (event_id, kind)
);
alter table followup_log enable row level security;
drop policy if exists "followup_log_staff" on followup_log;
create policy "followup_log_staff" on followup_log for select using (is_staff());

-- What's due today. Each window is a few days wide, so a missed daily run catches
-- up the next day; old projects that are already past a window never get it.
create or replace function followups_due()
returns table (event_id uuid, kind text, rsvps int, guests int, declined int)
language sql stable security definer set search_path = public
as $$
  with today as (select (now() at time zone 'Asia/Manila')::date as d),
  base as (
    select e.id, e.created_at, e.event_date, ws.published_at, ws.updated_at as site_updated_at
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
  )
  select d.id, d.kind, coalesce(c.rsvps, 0), coalesce(c.guests, 0), coalesce(c.declined, 0)
  from due d
  left join counts c on c.event_id = d.id
  where not exists (select 1 from followup_log l where l.event_id = d.id and l.kind = d.kind);
$$;
revoke all on function followups_due() from public, anon, authenticated;
grant execute on function followups_due() to service_role;

-- Check: should print notify_tips | followup_log | followups_due
select
  (select count(*) from information_schema.columns where table_name = 'profiles' and column_name = 'notify_tips') as notify_tips,
  (select count(*) from information_schema.tables where table_name = 'followup_log') as followup_log,
  (select count(*) from pg_proc where proname = 'followups_due') as followups_due;
