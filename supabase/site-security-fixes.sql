-- RSVP Studio — public site + RSVP security fixes (Oct 2026). Safe to re-run.
-- Paste into the SQL editor for the-rsvp-studio project. Requires
-- client-dashboard-schema.sql (for can_access_event / is_staff).
--
-- 1. Published sites were readable row-wide by anyone: the old select
--    policy ("published_at is not null OR member") exposes draft_content
--    and event_id of every published site to the anon key. Public pages
--    now read through get_public_site(), which returns ONLY the published
--    columns for one slug; the table itself is members/staff only.
-- 2. Anyone could insert rows into any event's guest list directly
--    (rsvps_insert_public with check (true)). RSVPs now only arrive through
--    /api/wedding-rsvp, which uses the service role and validates input.

-- 1. Public read path -------------------------------------------------------
create or replace function get_public_site(p_slug text)
returns table (published_content jsonb, published_presentation jsonb)
language sql stable security definer set search_path = public
as $$
  select ws.published_content, ws.published_presentation
  from wedding_sites ws
  where ws.slug = lower(p_slug)
    and ws.published_at is not null
  limit 1;
$$;
grant execute on function get_public_site(text) to anon, authenticated;

drop policy if exists "wedding_sites_select_own_or_public" on wedding_sites;
drop policy if exists "wedding_sites_select_members" on wedding_sites;
create policy "wedding_sites_select_members" on wedding_sites
  for select using (can_access_event(event_id));

-- 2. Guest list writes only via the server ----------------------------------
drop policy if exists "rsvps_insert_public" on rsvps;
