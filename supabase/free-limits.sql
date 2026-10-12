-- RSVP Studio — free-account limits (replaces "one free site at a time").
-- ADDITIVE, safe to re-run. Needs free-premium.sql and project-lifecycle.sql.
-- Run on LIVE before pushing the code that uses it.
--
--   • Up to 3 free projects at once, drafts included.
--   • Only 1 of them live (published) at a time.
--   Premium sites and studio projects never count. Deleted and ended ones don't either.
--   Staff are never limited.

-- A customer's free projects that still count: not deleted, not ended, not Premium.
create or replace function free_projects(p_owner uuid)
returns table (id uuid, name text, live boolean)
language sql stable security definer set search_path = public
as $$
  select e.id, e.name, ws.published_at is not null
  from events e
  left join wedding_sites ws on ws.event_id = e.id
  where e.owner_id = p_owner
    and not e.managed_by_studio
    and e.deleted_at is null
    and not event_is_premium(e.id)
    and (site_live_until(e.id) is null or site_live_until(e.id) > now())
  order by e.created_at;
$$;
revoke all on function free_projects(uuid) from public, anon, authenticated;
grant execute on function free_projects(uuid) to service_role;

-- What "New project" checks first. Staff: always empty.
create or replace function my_free_projects()
returns table (id uuid, name text, live boolean)
language sql stable security definer set search_path = public
as $$
  select f.id, f.name, f.live from free_projects(auth.uid()) f
  where auth.uid() is not null and not coalesce(is_staff(), false);
$$;
revoke all on function my_free_projects() from public, anon;
grant execute on function my_free_projects() to authenticated;

-- Kept for the code that's live until the push: only answers once the limit is reached.
create or replace function my_free_site()
returns table (id uuid, name text)
language sql stable security definer set search_path = public
as $$
  select f.id, f.name from my_free_projects() f
  where (select count(*) from my_free_projects()) >= 3
  limit 1;
$$;

-- New projects: refuse a 4th free one.
create or replace function events_free_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not coalesce(is_staff(), false) and not coalesce(new.managed_by_studio, false)
     and (select count(*) from free_projects(new.owner_id)) >= 3 then
    raise exception 'FREE_LIMIT: free accounts can have 3 projects at a time' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists on_events_free_limit on events;
create trigger on_events_free_limit before insert on events
  for each row execute function events_free_limit();

-- The owner's other free site that's live right now, if publishing p_event with
-- template p_template would make a second one. Null = fine to publish.
create or replace function free_live_conflict(p_event uuid, p_template text)
returns text
language sql stable security definer set search_path = public
as $$
  select o.name
  from events e
  join events o on o.owner_id = e.owner_id and o.id <> e.id
  join wedding_sites ows on ows.event_id = o.id and ows.published_at is not null
  where e.id = p_event
    and not e.managed_by_studio
    -- this site will be free: no Premium paid for, and not a Premium template
    and not exists (select 1 from payments p where p.event_id = e.id and p.kind = 'site_publish' and p.status = 'paid' and p.template_tier = 'premium')
    and not exists (select 1 from templates t where t.id = p_template and t.tier = 'premium')
    -- the other one is a live free site
    and not o.managed_by_studio
    and o.deleted_at is null
    and not event_is_premium(o.id)
    and (site_live_until(o.id) is null or site_live_until(o.id) > now())
  order by o.created_at
  limit 1;
$$;
revoke all on function free_live_conflict(uuid, text) from public, anon, authenticated;
grant execute on function free_live_conflict(uuid, text) to service_role;

-- For the builder, before it shows the publish steps. Null = fine.
create or replace function my_free_live_conflict(p_event uuid)
returns text
language sql stable security definer set search_path = public
as $$
  select free_live_conflict(p_event, (select draft_presentation->>'activeTemplateId' from wedding_sites where event_id = p_event))
  where auth.uid() is not null and not coalesce(is_staff(), false) and can_access_event(p_event);
$$;
revoke all on function my_free_live_conflict(uuid) from public, anon;
grant execute on function my_free_live_conflict(uuid) to authenticated;

-- Publishing: refuse a second live free site. (Runs before the payment check, so
-- nobody pays to publish a site that would then be refused.)
create or replace function wedding_sites_free_live_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare other text;
begin
  if new.published_at is null then return new; end if;
  if tg_op = 'UPDATE' and old.published_at is not null then return new; end if;   -- already live: edits are fine
  if auth.uid() is null or coalesce(is_staff(), false) then return new; end if;
  other := free_live_conflict(new.event_id, new.published_presentation->>'activeTemplateId');
  if other is not null then
    raise exception 'FREE_LIVE_LIMIT: %', other using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists on_wedding_sites_free_live_guard on wedding_sites;
create trigger on_wedding_sites_free_live_guard before insert or update on wedding_sites
  for each row execute function wedding_sites_free_live_guard();

-- Check: customers over the new limits (should be rare — they keep what they have).
select
  (select count(*) from (select e.owner_id from events e where not e.managed_by_studio and e.deleted_at is null group by e.owner_id) x) as diy_customers,
  (select count(*) from pg_trigger where tgname in ('on_events_free_limit', 'on_wedding_sites_free_live_guard')) as triggers_ok;
