-- RSVP Studio — Save the Date links (Oct 21 2026). ADDITIVE, safe to re-run.
-- Run on LIVE before pushing. Needs guest-links.sql, project-lifecycle.sql and free-premium.sql.
--
-- A studio Save the Date is now a link as well as files: /invite/<slug> shows the card (or
-- its video), the names, date, a countdown, "Add to calendar" and, if the studio turns it on,
-- "Get the invitation when it's ready" (name + email or mobile, with consent). Signups go
-- straight into the couple's invite list. The same link becomes the full website later.
--   1. wedding_sites.std (the card, names, date, venue, video, signup on/off) and std_live
--      (the link shows the Save the Date). Studio writes them through studio_save_the_date().
--   2. save_the_date_stats: how many times the page was opened (kept off wedding_sites, so an
--      open never bumps the site's updated_at or runs its triggers).
--   3. invitees.source / consented_at: who signed up from the Save the Date, and when they agreed.
--   4. get_public_site() also returns std + std_live, and serves a Save the Date link that has
--      no published website yet. A Save-the-Date-only link ends 30 days after the event.
--   5. save_the_date_opened() and save_the_date_signup(): what guests can call.
--   6. studio_save_the_date(): staff create or update the Save the Date for a project.

-- 1. Columns ------------------------------------------------------------------
alter table wedding_sites add column if not exists std jsonb;
alter table wedding_sites add column if not exists std_live boolean not null default false;

alter table invitees add column if not exists source text check (source is null or source in ('save_the_date'));
alter table invitees add column if not exists consented_at timestamptz;

-- 2. Opens ----------------------------------------------------------------------
create table if not exists save_the_date_stats (
  event_id uuid primary key references events (id) on delete cascade,
  opens int not null default 0,
  updated_at timestamptz not null default now()
);
alter table save_the_date_stats enable row level security;
drop policy if exists "std_stats_members" on save_the_date_stats;
create policy "std_stats_members" on save_the_date_stats for select using (can_access_event(event_id));

-- 3. The public site, with the Save the Date ------------------------------------
drop function if exists get_public_site(text, text);
create function get_public_site(p_slug text, p_password text default null)
returns table (published_content jsonb, published_presentation jsonb, template_spec jsonb, is_premium boolean, state text, locked boolean, photos_on boolean, tables_on boolean, std jsonb, std_live boolean)
language sql stable security definer set search_path = public
as $$
  with s as (
    select ws.*, e.deleted_at,
           (ws.site_password is not null
            and lower(trim(coalesce(p_password, ''))) is distinct from lower(trim(ws.site_password))) as is_locked,
           coalesce(event_day(ws.event_id),
                    case when ws.std->>'eventDate' ~ '^\d{4}-\d{2}-\d{2}' then left(ws.std->>'eventDate', 10)::date end) as day
    from wedding_sites ws join events e on e.id = ws.event_id
    where ws.slug = lower(p_slug)
      and (ws.published_at is not null or (ws.std_live and ws.std is not null) or e.deleted_at is not null)
    limit 1
  )
  select
    case when s.deleted_at is null and not s.is_locked then s.published_content end,
    case when s.deleted_at is null and not s.is_locked then s.published_presentation end,
    case when s.deleted_at is null and not s.is_locked then tv.spec end,
    event_is_premium(s.event_id),
    case when s.deleted_at is not null then 'deleted'
         -- A Save the Date with no website yet: online until 30 days after the event.
         when s.std_live and s.published_at is null then
           case when coalesce(s.day + 31 <= (now() at time zone 'Asia/Manila')::date, false) then 'ended' else 'live' end
         when site_live_until(s.event_id) < now() then 'ended'
         else 'live' end,
    s.is_locked and s.deleted_at is null,
    s.photo_sharing and event_is_premium(s.event_id),
    s.table_finder and event_is_premium(s.event_id),
    case when s.deleted_at is null and not s.is_locked and s.std_live then s.std end,
    s.std_live and s.deleted_at is null and not s.is_locked
  from s left join template_versions tv on tv.id = s.published_template_version_id;
$$;
grant execute on function get_public_site(text, text) to anon, authenticated;

-- 4. What guests can do on a Save the Date ----------------------------------------
-- Count an open (the page calls this once per browser).
create or replace function save_the_date_opened(p_slug text)
returns void
language sql security definer set search_path = public
as $$
  insert into save_the_date_stats (event_id, opens)
  select ws.event_id, 1 from wedding_sites ws where ws.slug = lower(p_slug) and ws.std_live and ws.std is not null
  on conflict (event_id) do update set opens = save_the_date_stats.opens + 1, updated_at = now();
$$;
grant execute on function save_the_date_opened(text) to anon, authenticated;

-- "Get the invitation when it's ready": into the invite list, once per email or mobile.
-- Returns 'ok', or 'already' when that contact signed up before.
create or replace function save_the_date_signup(p_slug text, p_name text, p_contact text, p_password text default null)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  site wedding_sites%rowtype;
  nm text := trim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  ct text := lower(trim(coalesce(p_contact, '')));
begin
  select * into site from wedding_sites where slug = lower(p_slug) and std_live and std is not null;
  if not found or coalesce((site.std->>'signup')::boolean, false) is not true then
    raise exception 'STD_CLOSED' using errcode = 'P0001';
  end if;
  if site.site_password is not null and lower(trim(coalesce(p_password, ''))) is distinct from lower(trim(site.site_password)) then
    raise exception 'STD_CLOSED' using errcode = 'P0001';
  end if;
  if char_length(nm) not between 1 and 120 then
    raise exception 'STD_NAME' using errcode = 'P0001';
  end if;
  -- An email, or a mobile number (digits, spaces, + - ( ) only).
  if not (ct ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or ct ~ '^\+?[0-9 ()-]{7,20}$') or char_length(ct) > 254 then
    raise exception 'STD_CONTACT' using errcode = 'P0001';
  end if;
  -- A burst (a link pasted somewhere it shouldn't be): at most 60 signups a minute per event.
  if (select count(*) from invitees where event_id = site.event_id and source = 'save_the_date' and created_at > now() - interval '1 minute') >= 60 then
    raise exception 'STD_BUSY' using errcode = 'P0001';
  end if;
  if exists (select 1 from invitees where event_id = site.event_id and lower(trim(contact)) = ct) then
    return 'already';
  end if;
  insert into invitees (event_id, name, contact, source, consented_at) values (site.event_id, nm, ct, 'save_the_date', now());
  return 'ok';
end;
$$;
grant execute on function save_the_date_signup(text, text, text, text) to anon, authenticated;

-- 5. Studio: create or update a project's Save the Date ------------------------------
-- p_std: { names: [..], occasion, eventDate, venue, image: { url, width, height },
--          video: { url } | null, signup: bool }. p_draft seeds the website draft when the
-- project has no site yet (so the builder starts with the names and date). Returns the slug.
create or replace function studio_save_the_date(p_event uuid, p_std jsonb, p_live boolean, p_base_slug text, p_draft jsonb default '{}'::jsonb)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  existing text;
  base text := trim(both '-' from regexp_replace(lower(coalesce(p_base_slug, '')), '[^a-z0-9]+', '-', 'g'));
  attempt int := 1;
  candidate text;
begin
  if not coalesce(is_staff(), false) then
    raise exception 'NOT_STAFF' using errcode = '42501';
  end if;
  if p_live and coalesce(p_std->'image'->>'url', '') !~ '^https://' then
    raise exception 'STD_IMAGE' using errcode = 'P0001';
  end if;
  select slug into existing from wedding_sites where event_id = p_event;
  if existing is not null then
    update wedding_sites set std = p_std, std_live = p_live where event_id = p_event;
    return existing;
  end if;
  if base = '' then base := 'save-the-date'; end if;
  base := left(base, 60);
  loop
    candidate := case when attempt = 1 then base else base || '-' || attempt end;
    begin
      insert into wedding_sites (event_id, slug, draft_content, std, std_live)
      values (p_event, candidate, coalesce(p_draft, '{}'::jsonb), p_std, p_live);
      return candidate;
    exception when unique_violation then
      attempt := attempt + 1;
      if attempt > 30 then raise; end if;
    end;
  end loop;
end;
$$;
revoke all on function studio_save_the_date(uuid, jsonb, boolean, text, jsonb) from public, anon;
grant execute on function studio_save_the_date(uuid, jsonb, boolean, text, jsonb) to authenticated;

-- Check: should print 2 | 2 | 1 | 4
select
  (select count(*) from information_schema.columns where table_name = 'wedding_sites' and column_name in ('std', 'std_live')) as site_cols,
  (select count(*) from information_schema.columns where table_name = 'invitees' and column_name in ('source', 'consented_at')) as invitee_cols,
  (select count(*) from information_schema.tables where table_name = 'save_the_date_stats') as stats_table,
  (select count(*) from pg_proc where proname in ('get_public_site', 'save_the_date_opened', 'save_the_date_signup', 'studio_save_the_date')) as functions;
