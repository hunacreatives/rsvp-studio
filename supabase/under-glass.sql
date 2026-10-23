-- RSVP Studio — the "Under Glass" template and its message wall (Oct 23 2026). ADDITIVE, safe
-- to re-run. Run on LIVE before pushing.
--   1. rsvps.message_public: the guest ticked "Show my message on the website" when replying
--      (only designs with a message wall ask). rsvps.message_hidden: the host hid it from the
--      wall (Guests tab). Messages stay private unless the guest opted in.
--   2. under_glass_messages(): first name + message for the wall. Answers only for a
--      published, unlocked, live Under Glass site whose host left "Messages" on; only opted-in,
--      not hidden, non-empty messages; first names only; newest first, at most 80.
--   3. The catalog row: Premium, listed, for birthdays and anniversaries.

-- 1. Columns
alter table rsvps add column if not exists message_public boolean not null default false;
alter table rsvps add column if not exists message_hidden boolean not null default false;

-- 2. The wall
create or replace function under_glass_messages(p_slug text, p_password text default null)
returns table (first_name text, message text, created_at timestamptz)
language sql stable security definer set search_path = public
as $$
  with s as (
    select ws.event_id
    from wedding_sites ws join events e on e.id = ws.event_id
    where ws.slug = lower(p_slug)
      and ws.published_at is not null
      and e.deleted_at is null
      and ws.published_presentation->>'activeTemplateId' = 'under-glass'
      and coalesce(ws.published_presentation->'byTemplate'->'under-glass'->'sectionVisibility'->>'messages', 'true') <> 'false'
      and (ws.site_password is null or lower(trim(coalesce(p_password, ''))) = lower(trim(ws.site_password)))
      and coalesce(site_live_until(ws.event_id), 'infinity'::timestamptz) >= now()
    limit 1
  )
  select left(split_part(trim(r.name), ' ', 1), 20), left(trim(r.message), 400), r.created_at
  from rsvps r join s on s.event_id = r.event_id
  where r.message_public and not r.message_hidden
    and trim(coalesce(r.message, '')) <> '' and trim(coalesce(r.name, '')) <> ''
  order by r.created_at desc
  limit 80;
$$;
grant execute on function under_glass_messages(text, text) to anon, authenticated;

-- 3. The catalog row
insert into templates (id, label, kind, tier, status, event_types, sort)
values ('under-glass', 'Under Glass', 'code', 'premium', 'listed', '{birthday,anniversary}', 97)
on conflict (id) do update set tier = 'premium', status = 'listed', event_types = '{birthday,anniversary}', updated_at = now();

-- Check: should print 2 | 1 | 1
select
  (select count(*) from information_schema.columns where table_name = 'rsvps' and column_name in ('message_public', 'message_hidden')) as message_cols,
  (select count(*) from pg_proc where proname = 'under_glass_messages') as wall_fn,
  (select count(*) from templates where id = 'under-glass' and status = 'listed') as listed;
