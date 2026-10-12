-- RSVP Studio — guest features (Oct 13 2026). ADDITIVE, safe to re-run. Run on LIVE
-- before pushing. Needs followups.sql, discounts.sql, project-lifecycle.sql, media-r2.sql.
--   1. Password-protected sites: wedding_sites.site_password; get_public_site() only
--      returns a protected site's content with the right password.
--   2. Invite lists: invitees (the host's own guest list, to see who hasn't replied).
--   3. Promo codes: promo_codes + events.promo_code; the biggest discount wins, never stacked.
--   4. Premium guest reminders: wedding_sites.guest_reminders + a 'guest_reminder' follow-up.
--   5. Premium guest photo sharing: wedding_sites.photo_sharing + guest_photos.
-- (The RSVP deadline lives in the site's content, so it needs no SQL.)

-- ---------------------------------------------------------------------
-- 1. Site settings
-- ---------------------------------------------------------------------
alter table wedding_sites add column if not exists site_password text;
alter table wedding_sites drop constraint if exists wedding_sites_site_password_check;
alter table wedding_sites add constraint wedding_sites_site_password_check
  check (site_password is null or char_length(site_password) between 4 and 40);
alter table wedding_sites add column if not exists guest_reminders boolean not null default true;
alter table wedding_sites add column if not exists photo_sharing boolean not null default false;

-- The public page. A protected site returns locked = true and no content unless the
-- password matches (case and spaces at the ends don't matter).
drop function if exists get_public_site(text);
drop function if exists get_public_site(text, text);
create function get_public_site(p_slug text, p_password text default null)
returns table (published_content jsonb, published_presentation jsonb, template_spec jsonb, is_premium boolean, state text, locked boolean, photos_on boolean)
language sql stable security definer set search_path = public
as $$
  with s as (
    select ws.*, e.deleted_at,
           (ws.site_password is not null
            and lower(trim(coalesce(p_password, ''))) is distinct from lower(trim(ws.site_password))) as is_locked
    from wedding_sites ws join events e on e.id = ws.event_id
    where ws.slug = lower(p_slug) and (ws.published_at is not null or e.deleted_at is not null)
    limit 1
  )
  select
    case when s.deleted_at is null and not s.is_locked then s.published_content end,
    case when s.deleted_at is null and not s.is_locked then s.published_presentation end,
    case when s.deleted_at is null and not s.is_locked then tv.spec end,
    event_is_premium(s.event_id),
    case when s.deleted_at is not null then 'deleted'
         when site_live_until(s.event_id) < now() then 'ended'
         else 'live' end,
    s.is_locked and s.deleted_at is null,
    s.photo_sharing and event_is_premium(s.event_id)
  from s left join template_versions tv on tv.id = s.published_template_version_id;
$$;
grant execute on function get_public_site(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Invite lists
-- ---------------------------------------------------------------------
create table if not exists invitees (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  contact text check (contact is null or char_length(contact) <= 254),   -- email or mobile, optional
  party_size int check (party_size is null or party_size between 1 and 20),
  created_at timestamptz not null default now()
);
create index if not exists invitees_event_idx on invitees (event_id);
alter table invitees enable row level security;
drop policy if exists "invitees_members" on invitees;
create policy "invitees_members" on invitees for all
  using (can_access_event(event_id)) with check (can_access_event(event_id));

-- At most 1,000 names per event.
create or replace function invitees_cap()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from invitees where event_id = new.event_id) >= 1000 then
    raise exception 'INVITE_LIMIT: 1,000 guests per event' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists on_invitees_cap on invitees;
create trigger on_invitees_cap before insert on invitees for each row execute function invitees_cap();

-- ---------------------------------------------------------------------
-- 3. Promo codes
-- ---------------------------------------------------------------------
create table if not exists promo_codes (
  code text primary key check (code ~ '^[A-Z0-9]{3,20}$'),
  percent_off int not null check (percent_off between 1 and 90),
  note text,                                     -- for the team: "Wedding season 2027"
  active boolean not null default true,
  starts_on date,
  ends_on date,                                  -- last day it works (Manila)
  max_uses int check (max_uses is null or max_uses > 0),
  created_at timestamptz not null default now()
);
alter table promo_codes enable row level security;
drop policy if exists "promo_codes_staff" on promo_codes;
create policy "promo_codes_staff" on promo_codes for all using (is_staff()) with check (is_staff());

alter table events add column if not exists promo_code text references promo_codes (code) on update cascade on delete set null;

-- Paid uses of a code (each project counts once), not counting p_except.
create or replace function promo_uses(p_code text, p_except uuid default null)
returns int
language sql stable security definer set search_path = public
as $$
  select count(distinct e.id)::int from events e
  where e.promo_code = p_code and e.id is distinct from p_except
    and exists (select 1 from payments p where p.event_id = e.id and p.status = 'paid' and p.kind = 'site_publish');
$$;
revoke all on function promo_uses(text, uuid) from public, anon, authenticated;

-- A code that works today (dates in Manila; a full code stops for new projects).
create or replace function promo_valid(p_code text, p_event uuid default null)
returns int
language sql stable security definer set search_path = public
as $$
  select pc.percent_off from promo_codes pc, (select (now() at time zone 'Asia/Manila')::date as d) t
  where pc.code = upper(trim(p_code)) and pc.active
    and (pc.starts_on is null or pc.starts_on <= t.d)
    and (pc.ends_on is null or pc.ends_on >= t.d)
    and (pc.max_uses is null or promo_uses(pc.code, p_event) < pc.max_uses);
$$;
revoke all on function promo_valid(text, uuid) from public, anon, authenticated;

create or replace function promo_discount(p_event uuid)
returns numeric
language sql stable security definer set search_path = public
as $$
  select coalesce((select promo_valid(e.promo_code, e.id) from events e where e.id = p_event and e.promo_code is not null), 0);
$$;
revoke all on function promo_discount(uuid) from public, anon, authenticated;

-- The discount a project gets: the biggest of partner, first payment and promo (never added up).
create or replace function event_discount(p_event uuid)
returns numeric
language sql stable security definer set search_path = public
as $$
  select greatest(coalesce(partner_discount(p_event), 0), coalesce(first_payment_discount(p_event), 0), coalesce(promo_discount(p_event), 0));
$$;
revoke all on function event_discount(uuid) from public, anon, authenticated;

drop function if exists my_event_discount(uuid);
create function my_event_discount(p_event uuid)
returns table (pct numeric, reason text, code text)
language sql stable security definer set search_path = public
as $$
  with d as (
    select coalesce(partner_discount(p_event), 0) as partner,
           coalesce(first_payment_discount(p_event), 0) as first,
           coalesce(promo_discount(p_event), 0) as promo
  )
  select greatest(d.partner, d.first, d.promo),
         case when greatest(d.partner, d.first, d.promo) = 0 then null
              when d.promo >= d.partner and d.promo >= d.first then 'promo'
              when d.partner >= d.first then 'partner'
              else 'first' end,
         (select promo_code from events where id = p_event)
  from d
  where auth.uid() is not null and can_access_event(p_event);
$$;
revoke all on function my_event_discount(uuid) from public, anon;
grant execute on function my_event_discount(uuid) to authenticated;

-- "Have a code?" in the builder: a partner's referral code or a promo code.
-- Returns 'partner:<name>' or 'promo:<percent>'.
create or replace function apply_discount_code(p_event uuid, p_code text)
returns text
language plpgsql security definer set search_path = public
as $$
declare ev events%rowtype; v_code text := upper(trim(p_code)); v_pct int;
begin
  select * into ev from events where id = p_event;
  if not found or auth.uid() is null or ev.owner_id is distinct from auth.uid() or ev.managed_by_studio then raise exception 'NOT_ALLOWED'; end if;
  if exists (select 1 from partners where code = v_code and active) then
    return 'partner:' || apply_partner_code(p_event, v_code);
  end if;
  if exists (select 1 from payments where event_id = p_event and kind = 'site_publish' and status = 'paid') then raise exception 'ALREADY_PAID'; end if;
  v_pct := promo_valid(v_code, p_event);
  if v_pct is null then
    if exists (select 1 from promo_codes where code = v_code) then raise exception 'EXPIRED_CODE'; end if;
    raise exception 'BAD_CODE';
  end if;
  update events set promo_code = v_code where id = p_event;
  return 'promo:' || v_pct;
end;
$$;
revoke all on function apply_discount_code(uuid, text) from public, anon;
grant execute on function apply_discount_code(uuid, text) to authenticated;

-- Studio → Templates: every code and how many times it's been used.
create or replace function promo_code_stats()
returns table (code text, percent_off int, note text, active boolean, starts_on date, ends_on date, max_uses int, uses int, created_at timestamptz)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not coalesce(is_staff(), false) then raise exception 'NOT_ALLOWED'; end if;
  return query select pc.code, pc.percent_off, pc.note, pc.active, pc.starts_on, pc.ends_on, pc.max_uses, promo_uses(pc.code), pc.created_at
    from promo_codes pc order by pc.created_at desc;
end;
$$;
revoke all on function promo_code_stats() from public, anon;
grant execute on function promo_code_stats() to authenticated;

-- ---------------------------------------------------------------------
-- 4. Guest reminders (a follow-up kind, so each event gets it once)
-- ---------------------------------------------------------------------
alter table followup_log drop constraint if exists followup_log_kind_check;
alter table followup_log add constraint followup_log_kind_check
  check (kind in ('draft_1', 'draft_4', 'draft_10', 'rsvp_10', 'headcount', 'after', 'guest_reminder'));

-- Premium sites whose event is 2 days away (a day of slack for a missed run).
create or replace function guest_reminders_due()
returns table (event_id uuid)
language sql stable security definer set search_path = public
as $$
  select e.id from events e join wedding_sites ws on ws.event_id = e.id,
    (select (now() at time zone 'Asia/Manila')::date as d) t
  where e.deleted_at is null and ws.published_at is not null and ws.guest_reminders
    and e.event_date between t.d + 1 and t.d + 2
    and event_is_premium(e.id)
    and not exists (select 1 from followup_log l where l.event_id = e.id and l.kind = 'guest_reminder');
$$;
revoke all on function guest_reminders_due() from public, anon, authenticated;
grant execute on function guest_reminders_due() to service_role;

-- ---------------------------------------------------------------------
-- 5. Guest photos (uploads go through the API; R2 key events/<id>/guests/…,
--    so the existing photo clean-up removes them with the site's photos)
-- ---------------------------------------------------------------------
create table if not exists guest_photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  url text not null,
  uploader_name text check (uploader_name is null or char_length(uploader_name) <= 80),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists guest_photos_event_idx on guest_photos (event_id, created_at desc);
alter table guest_photos enable row level security;
drop policy if exists "guest_photos_members_select" on guest_photos;
create policy "guest_photos_members_select" on guest_photos for select using (can_access_event(event_id));
drop policy if exists "guest_photos_members_update" on guest_photos;
create policy "guest_photos_members_update" on guest_photos for update using (can_access_event(event_id)) with check (can_access_event(event_id));
drop policy if exists "guest_photos_members_delete" on guest_photos;
create policy "guest_photos_members_delete" on guest_photos for delete using (can_access_event(event_id));

-- The photo page: shared photos for a live, unlocked Premium site with sharing on.
create or replace function get_guest_photos(p_slug text, p_password text default null)
returns table (id uuid, url text, uploader_name text, created_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select gp.id, gp.url, gp.uploader_name, gp.created_at
  from wedding_sites ws join events e on e.id = ws.event_id
  join guest_photos gp on gp.event_id = ws.event_id and not gp.hidden
  where ws.slug = lower(p_slug) and ws.published_at is not null and e.deleted_at is null
    and ws.photo_sharing and event_is_premium(ws.event_id)
    and (ws.site_password is null or lower(trim(coalesce(p_password, ''))) = lower(trim(ws.site_password)))
    and coalesce(site_live_until(ws.event_id) > now(), true)
  order by gp.created_at desc
  limit 500;
$$;
grant execute on function get_guest_photos(text, text) to anon, authenticated;

-- Guest data clean-up (30 days after a site ends) now includes the invite list and
-- shared-photo records (the files go with the site's photos).
create or replace function purge_guest_data(p_event uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from rsvps where event_id = p_event;
  delete from invitees where event_id = p_event;
  delete from guest_photos where event_id = p_event;
  update events set guests_purged_at = now() where id = p_event;
end;
$$;
revoke all on function purge_guest_data(uuid) from public, anon, authenticated;
grant execute on function purge_guest_data(uuid) to service_role;

-- Check: should print 3 | 3 | 1 | 1
select
  (select count(*) from information_schema.columns where table_name = 'wedding_sites' and column_name in ('site_password', 'guest_reminders', 'photo_sharing')) as site_settings,
  (select count(*) from information_schema.tables where table_name in ('invitees', 'promo_codes', 'guest_photos')) as new_tables,
  (select count(*) from pg_proc where proname = 'apply_discount_code') as promo_fn,
  (select count(*) from pg_proc where proname = 'get_public_site') as public_site_fn;
