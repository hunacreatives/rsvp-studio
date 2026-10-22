-- RSVP Studio — the "Open Play" template (Oct 22 2026). ADDITIVE, safe to re-run.
-- Run on LIVE before pushing the Open Play code.
--   1. The gallery row: Premium, listed after Pickleball.
--   2. open_play_roster(): first names of the guests who said yes, for the open-play paddle
--      rack ("Who's playing"). Answers only for a published, unlocked, live Open Play site
--      whose host left "Who's playing" on (Look & Feel → Show on website). First names only,
--      at most 60, oldest reply first. Nothing else about any guest leaves the database.

-- 1. Gallery row -------------------------------------------------------------------
insert into templates (id, label, kind, tier, status, event_types, sort)
values ('open-play', 'Open Play', 'code', 'premium', 'listed', '{}', 65)
on conflict (id) do update set tier = 'premium', status = 'listed', updated_at = now();

-- 2. The paddle rack -----------------------------------------------------------------
create or replace function open_play_roster(p_slug text, p_password text default null)
returns table (first_name text)
language sql stable security definer set search_path = public
as $$
  with s as (
    select ws.event_id
    from wedding_sites ws join events e on e.id = ws.event_id
    where ws.slug = lower(p_slug)
      and ws.published_at is not null
      and e.deleted_at is null
      and ws.published_presentation->>'activeTemplateId' = 'open-play'
      and coalesce(ws.published_presentation->'byTemplate'->'open-play'->'sectionVisibility'->>'roster', 'true') <> 'false'
      and (ws.site_password is null or lower(trim(coalesce(p_password, ''))) = lower(trim(ws.site_password)))
      and coalesce(site_live_until(ws.event_id), 'infinity'::timestamptz) >= now()
    limit 1
  ),
  yes as (
    select distinct on (lower(split_part(trim(r.name), ' ', 1)))
      split_part(trim(r.name), ' ', 1) as first_name, r.created_at
    from rsvps r join s on s.event_id = r.event_id
    where r.attending is true and trim(coalesce(r.name, '')) <> ''
    order by lower(split_part(trim(r.name), ' ', 1)), r.created_at
  )
  select left(first_name, 20) from yes order by created_at limit 60;
$$;
grant execute on function open_play_roster(text, text) to anon, authenticated;

-- Check: should print 1 | 1
select
  (select count(*) from templates where id = 'open-play' and status = 'listed') as listed,
  (select count(*) from pg_proc where proname = 'open_play_roster') as roster_fn;
