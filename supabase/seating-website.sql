-- RSVP Studio — Mesa: send seats to the event website (Oct 25 2026).
-- ADDITIVE, safe to re-run. Run on LIVE before pushing. Needs guest-links.sql.
--   Mesa writes each household's table onto the event's invite list (invitees.table_label,
--   through the hosts' own access) and links the plan to the event (seating_charts.event_id).
--   find_table, below, now finds every person on a household line: "Tito Ben & Tita Marie
--   Santos" answers to Ben Santos, Marie Santos and Tita Marie Santos, not only the first.
--   get_shared_chart, further down, no longer sends the plan's seating rules to view-only links.

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
  lines as (
    select i.name, i.table_label, lower(i.name) as raw
    from invitees i join site s on s.event_id = i.event_id
    where i.table_label is not null and i.table_label <> ''
  ),
  -- Each person on the line, and the line's surname (its last word) for a lone first name.
  parts as (
    select l.name, l.table_label,
      trim(regexp_replace(part, '[^a-z0-9ñ]+', ' ', 'g')) as p,
      -- (the surname from the line without its "+ 2 kids" or "(4)")
      reverse(split_part(reverse(trim(regexp_replace(regexp_replace(l.raw, '\s*(\+.*|\(.*\))$', ''), '[^a-z0-9ñ]+', ' ', 'g'))), ' ', 1)) as last
    from lines l, regexp_split_to_table(l.raw, '\s*(&|\+|,|/|\yand\y)\s*') as part
  ),
  -- Titles off ("tito ben" → "ben"), kids and plus-ones left out.
  bare as (
    select name, table_label, last, p, trim(regexp_replace(p, '^((tito|tita|lolo|lola|ninong|ninang|ate|kuya|mang|aling|mr|mrs|ms|miss|dr|dra|atty|engr|sir|maam|doc|coach|ptr|pastor|rev|fr|sis|bro)\s+)+', '')) as b
    from parts
    where p <> '' and p !~ '(^| )(kid|kids|child|children|guest|guests|plus one)( |$)' and p !~ '^[0-9 ]+$'
  ),
  -- Each name as written, and with the line's surname added when it doesn't end with it
  -- ("tito ben" → "tito ben santos"), with and without the title.
  people as (
    select name, table_label, p as n from bare where position(' ' in p) > 0
    union select name, table_label, p || ' ' || last from bare where p !~ ('(^| )' || last || '$')
    union select name, table_label, b from bare where position(' ' in b) > 0
    union select name, table_label, b || ' ' || last from bare where b <> '' and b !~ ('(^| )' || last || '$')
  )
  select distinct pe.name, pe.table_label from people pe, q
  where char_length(q.n) >= 3 and (
    pe.n = q.n
    or (position(' ' in q.n) > 0
        and split_part(pe.n, ' ', 1) = split_part(q.n, ' ', 1)
        and reverse(split_part(reverse(pe.n), ' ', 1)) = reverse(split_part(reverse(q.n), ' ', 1)))
  )
  limit 3;
$$;
grant execute on function find_table(text, text, text) to anon, authenticated;

-- View-only links (get_shared_chart): the plan without its seating rules, so a forwarded
-- link never shows who is being kept apart from whom.
drop function if exists get_shared_chart(text);
create function get_shared_chart(p_token text)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select case when background is null then chart - 'rules' else (chart - 'rules') || jsonb_build_object('background', background) end
  from seating_charts
  where share_token = p_token and char_length(coalesce(p_token, '')) >= 16
  limit 1;
$$;
grant execute on function get_shared_chart(text) to anon, authenticated;

-- Check: should print 1 | 1
select
  (select count(*) from pg_proc where proname = 'find_table') as find_table,
  (select count(*) from information_schema.columns where table_name = 'seating_charts' and column_name = 'event_id') as plan_event_link;
