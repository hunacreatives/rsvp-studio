-- RSVP Studio — personal invite links, seat limits, RSVP questions, table finder (Oct 13 2026).
-- ADDITIVE, safe to re-run. Run on LIVE before pushing. Needs guest-features.sql.
--   Phase 1  invitees.token: each guest's own link (/invite/<slug>?g=<token>). A reply made
--            from it is tied to that guest (rsvps.invitee_id). Premium: their party size is
--            a seat limit, and wedding_sites.invite_only means only personal links can RSVP.
--   Phase 2  rsvps.answers: answers to the hosts' own RSVP questions (questions live in the
--            site's content, so templates can show them).
--   Phase 4  invitees.table_label + wedding_sites.table_finder: guests look up their table
--            by name on /invite/<slug>/table (Premium).

-- 1. Columns ----------------------------------------------------------------
alter table invitees add column if not exists token text;
update invitees set token = substr(replace(gen_random_uuid()::text, '-', ''), 1, 16) where token is null;
alter table invitees alter column token set default substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);
alter table invitees alter column token set not null;
create unique index if not exists invitees_token_idx on invitees (token);
alter table invitees add column if not exists table_label text check (table_label is null or char_length(table_label) <= 40);

alter table rsvps add column if not exists invitee_id uuid references invitees (id) on delete set null;
create index if not exists rsvps_invitee_idx on rsvps (invitee_id);
alter table rsvps add column if not exists answers jsonb;

alter table wedding_sites add column if not exists invite_only boolean not null default false;
alter table wedding_sites add column if not exists table_finder boolean not null default false;

-- 2. A guest opening their personal link ------------------------------------
-- Their name, seats and table, for a live (and unlocked) site. Nothing about anyone else.
create or replace function get_invitee(p_slug text, p_token text, p_password text default null)
returns table (name text, party_size int, table_label text, replied boolean)
language sql stable security definer set search_path = public
as $$
  select i.name, i.party_size, i.table_label, exists (select 1 from rsvps r where r.invitee_id = i.id)
  from wedding_sites ws
  join events e on e.id = ws.event_id
  join invitees i on i.event_id = ws.event_id and i.token = p_token
  where ws.slug = lower(p_slug) and ws.published_at is not null and e.deleted_at is null
    and (ws.site_password is null or lower(trim(coalesce(p_password, ''))) = lower(trim(ws.site_password)))
  limit 1;
$$;
grant execute on function get_invitee(text, text, text) to anon, authenticated;

-- 3. Find your table ---------------------------------------------------------
-- Name typed by a guest → their table, only for a close match (the full name, or the same
-- first and last name), at most 3 people, Premium sites with the finder switched on.
create or replace function find_table(p_slug text, p_name text, p_password text default null)
returns table (name text, table_label text)
language sql stable security definer set search_path = public
as $$
  with q as (select trim(regexp_replace(lower(coalesce(p_name, '')), '[^a-z0-9ñ]+', ' ', 'g')) as n),
  site as (
    select ws.event_id from wedding_sites ws join events e on e.id = ws.event_id
    where ws.slug = lower(p_slug) and ws.published_at is not null and e.deleted_at is null
      and ws.table_finder and event_is_premium(ws.event_id)
      and (ws.site_password is null or lower(trim(coalesce(p_password, ''))) = lower(trim(ws.site_password)))
  ),
  people as (
    select i.name, i.table_label, trim(regexp_replace(lower(i.name), '[^a-z0-9ñ]+', ' ', 'g')) as n
    from invitees i join site s on s.event_id = i.event_id
    where i.table_label is not null and i.table_label <> ''
  )
  select p.name, p.table_label from people p, q
  where char_length(q.n) >= 3 and (
    p.n = q.n
    or (position(' ' in q.n) > 0
        and split_part(p.n, ' ', 1) = split_part(q.n, ' ', 1)
        and reverse(split_part(reverse(p.n), ' ', 1)) = reverse(split_part(reverse(q.n), ' ', 1)))
  )
  limit 3;
$$;
grant execute on function find_table(text, text, text) to anon, authenticated;

-- 4. Public site: say whether the table finder is on (for its footer link) ---------
drop function if exists get_public_site(text, text);
create function get_public_site(p_slug text, p_password text default null)
returns table (published_content jsonb, published_presentation jsonb, template_spec jsonb, is_premium boolean, state text, locked boolean, photos_on boolean, tables_on boolean)
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
    s.photo_sharing and event_is_premium(s.event_id),
    s.table_finder and event_is_premium(s.event_id)
  from s left join template_versions tv on tv.id = s.published_template_version_id;
$$;
grant execute on function get_public_site(text, text) to anon, authenticated;

-- Check: should print 2 | 2 | 2 | 3
select
  (select count(*) from information_schema.columns where table_name = 'invitees' and column_name in ('token', 'table_label')) as invitee_cols,
  (select count(*) from information_schema.columns where table_name = 'rsvps' and column_name in ('invitee_id', 'answers')) as rsvp_cols,
  (select count(*) from information_schema.columns where table_name = 'wedding_sites' and column_name in ('invite_only', 'table_finder')) as site_cols,
  (select count(*) from pg_proc where proname in ('get_invitee', 'find_table', 'get_public_site')) as functions;
