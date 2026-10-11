-- RSVP Studio — project lifecycle: one free site at a time, delete/restore,
-- how long sites stay online, and when guest data is removed.
-- ADDITIVE, safe to re-run. Run on LIVE before pushing the code that uses it.
-- Needs payments.sql and free-premium.sql.
--
--   1. Payments and invoices are NEVER removed with a project (FK → set null).
--   2. events.deleted_at: a deleted project is hidden at once and its site goes
--      offline; staff can restore it for 30 days, then the daily job removes it.
--   3. site_live_until(): how long a DIY site stays online —
--        Free: 30 days after the event · Premium: 1 year after the event ·
--        no event date: 1 year after publishing · studio projects: staff decide.
--      Guest RSVPs and photos are removed 30 days after a site goes offline.
--   4. One free site at a time per customer (enforced on insert). A deleted or
--      ended site frees the slot; Premium sites and studio projects never count.
--   5. get_public_site() says whether a site is live, ended or deleted.
--   6. A deleted site's link is never reused (retired_slugs).

-- ---------------------------------------------------------------------
-- 1. Money records outlive projects
-- ---------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select c.conname, c.conrelid::regclass as tbl
    from pg_constraint c
    where c.contype = 'f' and c.confrelid = 'events'::regclass
      and c.conrelid in ('payments'::regclass, 'invoices'::regclass)
  loop
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
  end loop;
end $$;
alter table invoices alter column event_id drop not null;
alter table payments add constraint payments_event_id_fkey foreign key (event_id) references events (id) on delete set null;
alter table invoices add constraint invoices_event_id_fkey foreign key (event_id) references events (id) on delete set null;

-- ---------------------------------------------------------------------
-- 2. Lifecycle columns
-- ---------------------------------------------------------------------
alter table events add column if not exists deleted_at timestamptz;
alter table events add column if not exists deleted_by uuid references profiles (id) on delete set null;
alter table events add column if not exists end_notice_sent_at timestamptz;   -- "your site goes offline soon" email
alter table events add column if not exists guests_purged_at timestamptz;     -- guest RSVPs + photos removed

create table if not exists retired_slugs (
  slug text primary key,
  retired_at timestamptz not null default now()
);
alter table retired_slugs enable row level security;   -- no policies: server only

-- ---------------------------------------------------------------------
-- 3. How long a site stays online
-- ---------------------------------------------------------------------
-- The event date: the event's own, else the date on the published site.
create or replace function event_day(p_event uuid)
returns date
language sql stable security definer set search_path = public
as $$
  select coalesce(
    e.event_date,
    case when ws.published_content->>'eventDate' ~ '^\d{4}-\d{2}-\d{2}' then left(ws.published_content->>'eventDate', 10)::date end)
  from events e left join wedding_sites ws on ws.event_id = e.id
  where e.id = p_event;
$$;

-- NULL = no end (studio projects, and drafts with no date that were never published).
create or replace function site_live_until(p_event uuid)
returns timestamptz
language sql stable security definer set search_path = public
as $$
  select case
    when e.managed_by_studio then null
    when event_day(e.id) is not null then
      ((event_day(e.id) + case when event_is_premium(e.id) then interval '1 year' else interval '30 days' end + interval '1 day')::timestamp)
        at time zone 'Asia/Manila'
    else ws.published_at + interval '1 year'
  end
  from events e left join wedding_sites ws on ws.event_id = e.id
  where e.id = p_event;
$$;
revoke all on function event_day(uuid) from public, anon, authenticated;
revoke all on function site_live_until(uuid) from public, anon, authenticated;
grant execute on function event_day(uuid) to service_role;
grant execute on function site_live_until(uuid) to service_role;

-- The dashboard's view of each project's site.
create or replace function project_lifecycle(p_ids uuid[])
returns table (event_id uuid, premium boolean, live_until timestamptz, ended boolean, deleted_at timestamptz, guests_purged_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select e.id, event_is_premium(e.id), site_live_until(e.id),
         coalesce(site_live_until(e.id) < now(), false), e.deleted_at, e.guests_purged_at
  from events e
  where e.id = any(p_ids) and (coalesce(is_staff(), false) or can_access_event(e.id));
$$;
revoke all on function project_lifecycle(uuid[]) from public, anon;
grant execute on function project_lifecycle(uuid[]) to authenticated;

-- ---------------------------------------------------------------------
-- 4. One free site at a time
-- ---------------------------------------------------------------------
-- The customer's current free site, if any (not deleted, not ended, not Premium).
create or replace function active_free_site(p_owner uuid)
returns table (id uuid, name text)
language sql stable security definer set search_path = public
as $$
  select e.id, e.name from events e
  where e.owner_id = p_owner
    and not e.managed_by_studio
    and e.deleted_at is null
    and not event_is_premium(e.id)
    and (site_live_until(e.id) is null or site_live_until(e.id) > now())
  order by e.created_at
  limit 1;
$$;
revoke all on function active_free_site(uuid) from public, anon, authenticated;
grant execute on function active_free_site(uuid) to service_role;

-- What "New project" asks before showing the form. Staff are never limited.
create or replace function my_free_site()
returns table (id uuid, name text)
language sql stable security definer set search_path = public
as $$
  select f.id, f.name from active_free_site(auth.uid()) f
  where auth.uid() is not null and not coalesce(is_staff(), false);
$$;
revoke all on function my_free_site() from public, anon;
grant execute on function my_free_site() to authenticated;

create or replace function events_free_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not coalesce(is_staff(), false) and not coalesce(new.managed_by_studio, false)
     and exists (select 1 from active_free_site(new.owner_id)) then
    raise exception 'FREE_LIMIT: you already have a free website' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists on_events_free_limit on events;
create trigger on_events_free_limit before insert on events
  for each row execute function events_free_limit();

-- ---------------------------------------------------------------------
-- 5. Delete, restore, leave
-- ---------------------------------------------------------------------
-- Owner (their own DIY site) or staff (anything). Hidden at once; removed after 30 days.
create or replace function delete_project(p_event uuid)
returns void language plpgsql security definer set search_path = public as $$
declare ev events%rowtype;
begin
  select * into ev from events where id = p_event;
  if not found or ev.deleted_at is not null then raise exception 'NOT_FOUND'; end if;
  if not (coalesce(is_staff(), false) or (auth.uid() is not null and ev.owner_id = auth.uid() and not ev.managed_by_studio)) then
    raise exception 'NOT_ALLOWED';
  end if;
  update events set deleted_at = now(), deleted_by = auth.uid() where id = p_event;
end;
$$;
revoke all on function delete_project(uuid) from public, anon;
grant execute on function delete_project(uuid) to authenticated;

create or replace function restore_project(p_event uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not coalesce(is_staff(), false) then raise exception 'NOT_ALLOWED'; end if;
  update events set deleted_at = null, deleted_by = null where id = p_event and deleted_at is not null;
end;
$$;
revoke all on function restore_project(uuid) from public, anon;
grant execute on function restore_project(uuid) to authenticated;

-- A co-host removes themselves (the owner deletes instead).
create or replace function leave_project(p_event uuid)
returns void language sql security definer set search_path = public as $$
  delete from event_members where event_id = p_event and profile_id = auth.uid();
$$;
revoke all on function leave_project(uuid) from public, anon;
grant execute on function leave_project(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 6. The public page and the link
-- ---------------------------------------------------------------------
drop function if exists get_public_site(text);
create function get_public_site(p_slug text)
returns table (published_content jsonb, published_presentation jsonb, template_spec jsonb, is_premium boolean, state text)
language sql stable security definer set search_path = public
as $$
  select
    case when e.deleted_at is null then ws.published_content end,
    case when e.deleted_at is null then ws.published_presentation end,
    case when e.deleted_at is null then tv.spec end,
    event_is_premium(ws.event_id),
    case when e.deleted_at is not null then 'deleted'
         when site_live_until(ws.event_id) < now() then 'ended'
         else 'live' end
  from wedding_sites ws
  join events e on e.id = ws.event_id
  left join template_versions tv on tv.id = ws.published_template_version_id
  where ws.slug = lower(p_slug)
    and (ws.published_at is not null or e.deleted_at is not null)
  limit 1;
$$;
grant execute on function get_public_site(text) to anon, authenticated;

-- A retired link can't be taken again (the builder's "try the next suffix" kicks in).
create or replace function wedding_sites_retired_slug()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from retired_slugs where slug = new.slug) then
    raise exception 'That link was used before' using errcode = '23505';
  end if;
  return new;
end;
$$;
drop trigger if exists on_wedding_sites_retired_slug on wedding_sites;
create trigger on_wedding_sites_retired_slug before insert or update of slug on wedding_sites
  for each row execute function wedding_sites_retired_slug();

-- ---------------------------------------------------------------------
-- 7. The daily job (api/support-cron.ts, service role)
-- ---------------------------------------------------------------------
-- What's due: 'purge' = deleted 30+ days ago · 'guests' = offline 30+ days, guest data still here ·
-- 'notice' = goes offline within 14 days, host not told yet.
create or replace function lifecycle_due()
returns table (event_id uuid, action text, live_until timestamptz)
language sql stable security definer set search_path = public
as $$
  select e.id, 'purge', null::timestamptz from events e
    where e.deleted_at < now() - interval '30 days'
  union all
  select e.id, 'guests', site_live_until(e.id) from events e
    where e.deleted_at is null and e.guests_purged_at is null and not e.managed_by_studio
      and site_live_until(e.id) < now() - interval '30 days'
  union all
  select e.id, 'notice', site_live_until(e.id) from events e
    join wedding_sites ws on ws.event_id = e.id and ws.published_at is not null
    where e.deleted_at is null and e.end_notice_sent_at is null and not e.managed_by_studio
      and site_live_until(e.id) between now() and now() + interval '14 days';
$$;
revoke all on function lifecycle_due() from public, anon, authenticated;
grant execute on function lifecycle_due() to service_role;

-- Remove a deleted project for good (photos are removed from storage by the job first).
-- Payments and invoices stay (their event link becomes empty).
create or replace function purge_project(p_event uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into retired_slugs (slug)
    select slug from wedding_sites where event_id = p_event
    on conflict do nothing;
  delete from events where id = p_event and deleted_at < now() - interval '30 days';
end;
$$;
revoke all on function purge_project(uuid) from public, anon, authenticated;
grant execute on function purge_project(uuid) to service_role;

-- Remove an ended site's guest data: RSVPs, and its photos from the site content.
create or replace function purge_guest_data(p_event uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from rsvps where event_id = p_event;
  update wedding_sites set
    draft_content = jsonb_set(coalesce(draft_content, '{}'::jsonb), '{galleries}', '[]'::jsonb),
    published_content = case when published_content is null then null else jsonb_set(published_content, '{galleries}', '[]'::jsonb) end
  where event_id = p_event;
  update events set guests_purged_at = now() where id = p_event;
end;
$$;
revoke all on function purge_guest_data(uuid) from public, anon, authenticated;
grant execute on function purge_guest_data(uuid) to service_role;

-- Check:
select
  (select count(*) from events where not managed_by_studio and deleted_at is null) as diy_projects,
  (select count(*) from events e where not e.managed_by_studio and site_live_until(e.id) < now()) as ended_sites,
  (select count(*) from lifecycle_due()) as due_today,
  (select count(*) from retired_slugs) as retired_links;
