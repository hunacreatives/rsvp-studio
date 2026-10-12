-- RSVP Studio — event photos on Cloudflare R2, upload limits, and safe photo cleanup.
-- ADDITIVE, safe to re-run. Needs project-lifecycle.sql and custom-domains.sql.
-- Run on LIVE before pushing the code that uses it.
--
--   1. Who may upload a photo to an event (checked by api/_lib/media-handlers.ts).
--   2. Upload limits: 100 an hour / 300 a day per person, 200 photos / 500 MB per event.
--   3. When a site ends: the end date counts expired domains too (no snap-back), undated
--      drafts end a year after they were made, reminders re-arm for a new end date.
--   4. Photo cleanup: its own step ('photos'), re-armed if a site comes back, with a log.
--      Guest data cleanup no longer touches photos.
--   5. A project can only be restored within its 30 days.

-- ---------------------------------------------------------------------
-- 1. Upload permission (service role only — the API passes the user)
-- ---------------------------------------------------------------------
alter table events add column if not exists photos_purged_at timestamptz;
-- The old job already emptied these sites' photo folders along with their guest data.
update events set photos_purged_at = guests_purged_at where photos_purged_at is null and guests_purged_at is not null;

create or replace function media_upload_allowed(p_user uuid, p_event uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((
    select e.deleted_at is null
       -- not a site whose photos were cleaned up and that is still offline
       and not (e.photos_purged_at is not null and e.photos_purged_at >= coalesce(site_live_until(e.id), 'infinity'::timestamptz))
       and (e.owner_id = p_user
            or exists (select 1 from event_members m where m.event_id = e.id and m.profile_id = p_user)
            or coalesce((select p.is_staff from profiles p where p.id = p_user), false))
    from events e where e.id = p_event
  ), false);
$$;
revoke all on function media_upload_allowed(uuid, uuid) from public, anon, authenticated;
grant execute on function media_upload_allowed(uuid, uuid) to service_role;

-- ---------------------------------------------------------------------
-- 2. Upload limits
-- ---------------------------------------------------------------------
create table if not exists upload_log (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  event_id uuid,
  bytes bigint not null check (bytes >= 0),
  key text not null,
  created_at timestamptz not null default now()
);
create index if not exists upload_log_user_idx on upload_log (user_id, created_at);
create index if not exists upload_log_event_idx on upload_log (event_id, created_at);
alter table upload_log enable row level security;   -- no policies: service role only

create or replace function claim_upload(p_user uuid, p_event uuid, p_bytes bigint, p_key text)
returns void
language plpgsql security definer set search_path = public
as $$
declare staff boolean := coalesce((select is_staff from profiles where id = p_user), false);
declare since timestamptz := coalesce((select photos_purged_at from events where id = p_event), '-infinity'::timestamptz);
begin
  perform pg_advisory_xact_lock(hashtext('upload:' || p_user::text));
  if not staff then
    if (select count(*) from upload_log where user_id = p_user and created_at > now() - interval '1 hour') >= 100 then
      raise exception 'UPLOAD_LIMIT: hour' using errcode = 'P0001';
    end if;
    if (select count(*) from upload_log where user_id = p_user and created_at > now() - interval '1 day') >= 300 then
      raise exception 'UPLOAD_LIMIT: day' using errcode = 'P0001';
    end if;
    if (select count(*) from upload_log where event_id = p_event and created_at > since) >= 200
       or (select coalesce(sum(bytes), 0) from upload_log where event_id = p_event and created_at > since) + p_bytes > 500 * 1024 * 1024 then
      raise exception 'UPLOAD_LIMIT: event' using errcode = 'P0001';
    end if;
  end if;
  insert into upload_log (user_id, event_id, bytes, key) values (p_user, p_event, p_bytes, p_key);
end;
$$;
revoke all on function claim_upload(uuid, uuid, bigint, text) from public, anon, authenticated;
grant execute on function claim_upload(uuid, uuid, bigint, text) to service_role;

-- ---------------------------------------------------------------------
-- 3. When a site ends
-- ---------------------------------------------------------------------
create or replace function site_live_until(p_event uuid)
returns timestamptz
language sql stable security definer set search_path = public
as $$
  select case
    when e.managed_by_studio then null
    else greatest(
      case
        when event_day(e.id) is not null then
          ((event_day(e.id) + case when event_is_premium(e.id) then interval '1 year' else interval '30 days' end + interval '1 day')::timestamp)
            at time zone 'Asia/Manila'
        when ws.published_at is not null then ws.published_at + interval '1 year'
        else e.created_at + interval '1 year'          -- a draft with no date, never published
      end,
      -- a custom domain keeps it up until the domain ends — expired ones too, so the
      -- date doesn't jump back the day a domain lapses
      (select max(d.expires_at) from site_domains d where d.event_id = e.id and d.status in ('active', 'expired')))
  end
  from events e left join wedding_sites ws on ws.event_id = e.id
  where e.id = p_event;
$$;

-- What's due each day:
--   purge  = deleted 30+ days ago
--   photos = offline 30+ days (or deleted 30+ days), photos not yet removed for this end date
--   guests = offline 30+ days, RSVPs not yet removed for this end date
--   notice = goes offline within 14 days, owner not told about this end date
create or replace function lifecycle_due()
returns table (event_id uuid, action text, live_until timestamptz)
language sql stable security definer set search_path = public
as $$
  select e.id, 'notice', site_live_until(e.id) from events e
    where e.deleted_at is null and not e.managed_by_studio
      and site_live_until(e.id) between now() and now() + interval '14 days'
      and (e.end_notice_sent_at is null or e.end_notice_sent_at < site_live_until(e.id) - interval '15 days')
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

-- Guest data: RSVPs only. (Photos have their own step, which also clears their links.)
create or replace function purge_guest_data(p_event uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from rsvps where event_id = p_event;
  update events set guests_purged_at = now() where id = p_event;
end;
$$;
revoke all on function purge_guest_data(uuid) from public, anon, authenticated;
grant execute on function purge_guest_data(uuid) to service_role;

-- ---------------------------------------------------------------------
-- 4. Photo cleanup
-- ---------------------------------------------------------------------
create table if not exists photo_purge_log (
  id bigint generated always as identity primary key,
  event_id uuid,                                   -- no FK: the project may be gone
  reason text not null check (reason in ('ended', 'deleted')),
  store text not null check (store in ('supabase', 'r2')),
  found int not null default 0,
  deleted int not null default 0,
  kept_shared int not null default 0,
  dry_run boolean not null,
  error text,
  created_at timestamptz not null default now()
);
alter table photo_purge_log enable row level security;
drop policy if exists "photo_purge_log_staff" on photo_purge_log;
create policy "photo_purge_log_staff" on photo_purge_log for select using (is_staff());

-- Checked again right before deleting: 'deleted' | 'ended' | null (not due).
create or replace function photo_purge_ok(p_event uuid)
returns text
language sql stable security definer set search_path = public
as $$
  select case
    when e.deleted_at < now() - interval '30 days' then 'deleted'
    when e.deleted_at is null and not e.managed_by_studio
     and site_live_until(e.id) < now() - interval '30 days'
     and (e.photos_purged_at is null or e.photos_purged_at < site_live_until(e.id)) then 'ended'
  end
  from events e where e.id = p_event;
$$;
revoke all on function photo_purge_ok(uuid) from public, anon, authenticated;
grant execute on function photo_purge_ok(uuid) to service_role;

-- Links to this event's photos used anywhere else (another site, the blog, a project
-- cover): those files are kept.
create or replace function photo_refs_elsewhere(p_event uuid)
returns setof text
language sql stable security definer set search_path = public
as $$
  with blobs as (
    select concat_ws(' ', draft_content::text, published_content::text, draft_presentation::text, published_presentation::text) as t
      from wedding_sites where event_id is distinct from p_event
    union all select coalesce(cover_url, '') || ' ' || coalesce(body, '') from blog_posts
    union all select cover_image_url from events where id <> p_event and cover_image_url is not null
  )
  select distinct m[1] from blobs,
    regexp_matches(t, '(https://[^"\s)]*/(?:event-site-images|events)/' || p_event::text || '/[^"\s)]+)', 'g') m;
$$;
revoke all on function photo_refs_elsewhere(uuid) from public, anon, authenticated;
grant execute on function photo_refs_elsewhere(uuid) to service_role;

-- ---------------------------------------------------------------------
-- 5. Restore only within the 30 days
-- ---------------------------------------------------------------------
create or replace function restore_project(p_event uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not coalesce(is_staff(), false) then raise exception 'NOT_ALLOWED'; end if;
  update events set deleted_at = null, deleted_by = null
    where id = p_event and deleted_at is not null and deleted_at > now() - interval '30 days';
  if not found then raise exception 'RESTORE_WINDOW_PASSED'; end if;
end;
$$;
revoke all on function restore_project(uuid) from public, anon;
grant execute on function restore_project(uuid) to authenticated;

-- Check:
select
  (select count(*) from lifecycle_due() where action = 'photos') as photos_due,
  (select count(*) from lifecycle_due() where action = 'guests') as guests_due,
  (select count(*) from lifecycle_due() where action = 'notice') as notices_due,
  (select count(*) from events where photos_purged_at is not null) as already_cleaned;
