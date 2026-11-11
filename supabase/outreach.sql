-- Studio → Outreach: businesses in the event space we message (Nov 10 2026): coordinators,
-- venues, stylists, caterers, photo/video, stationery, hosts and entertainment, beauty, attire,
-- cakes, rentals, party suppliers. Anyone who meets hosts before the invites go out.
-- Run on LIVE (ubonzkfflxqwcwlbemmy) before pushing the code that uses it. Safe to run twice.
--
-- • outreach_contacts: one row per business. Duplicates are refused by their Facebook page,
--   Instagram handle or email (or name + city when there's none of those; agencies share mobiles), so the same
--   coordinator can't be imported or messaged twice, and "Not interested" stays not interested.
-- • Each contact has a `code`; their link is thersvpstudio.com/partners?o=<code>. Whoever signs up
--   or applies through it is matched back here (outreach_refresh), as are sign-ups with the same
--   email, mobile or Instagram.
-- • outreach_messages: an opener and a follow-up for each audience (coordinators, venues, every
--   other supplier), shared by everyone on the team.

create table if not exists outreach_contacts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default substr(md5(gen_random_uuid()::text), 1, 8),
  name text not null check (length(trim(name)) between 1 and 160),   -- the business (or the person)
  contact_person text,
  kind text not null default 'coordinator',
  city text,
  facebook text,
  instagram text,
  website text,
  email text,
  phone text,
  found_via text,                                                       -- where we found them
  notes text,
  status text not null default 'to_message'
    check (status in ('to_message', 'messaged', 'replied', 'signed_up', 'not_interested', 'skipped')),
  messaged_at timestamptz,
  followed_up_at timestamptz,
  replied_at timestamptz,
  signed_up_at timestamptz,
  matched_profile uuid references profiles (id) on delete set null,
  matched_enquiry uuid references enquiries (id) on delete set null,
  -- normalised, for duplicates and matching (set by the trigger below)
  fb_key text,
  ig_key text,
  phone_key text,
  name_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists outreach_fb_uq on outreach_contacts (fb_key) where fb_key is not null;
create unique index if not exists outreach_ig_uq on outreach_contacts (ig_key) where ig_key is not null;
create unique index if not exists outreach_email_uq on outreach_contacts (lower(email)) where email is not null;
drop index if exists outreach_phone_uq;  -- agencies share one mobile across their brands
create index if not exists outreach_phone_idx on outreach_contacts (phone_key) where phone_key is not null;
drop index if exists outreach_name_uq;
create unique index if not exists outreach_name_uq2 on outreach_contacts (name_key)
  where fb_key is null and ig_key is null and email is null;
alter table outreach_contacts drop constraint if exists outreach_contacts_kind_check;
alter table outreach_contacts add constraint outreach_contacts_kind_check check (kind in ('coordinator', 'venue', 'stylist', 'caterer', 'photo_video', 'stationery', 'entertainment', 'beauty', 'attire', 'cakes', 'rentals', 'party', 'other'));
create index if not exists outreach_kind_idx on outreach_contacts (kind);
create index if not exists outreach_status_idx on outreach_contacts (status, created_at);
create index if not exists outreach_messaged_idx on outreach_contacts (messaged_at);

create or replace function outreach_keys_trg()
returns trigger language plpgsql as $$
declare f text;
begin
  new.name := trim(new.name);
  new.email := nullif(lower(trim(coalesce(new.email, ''))), '');
  new.facebook := nullif(trim(coalesce(new.facebook, '')), '');
  new.instagram := nullif(trim(coalesce(new.instagram, '')), '');
  new.phone := nullif(trim(coalesce(new.phone, '')), '');
  -- facebook.com/eventsbykate/?ref=… → eventsbykate ; profile.php?id=123 → id:123
  f := new.facebook;
  if f ~* 'id=\d+' then
    new.fb_key := 'id:' || substring(f from '(?i)id=(\d+)');
  elsif f is not null then
    f := regexp_replace(f, '^(https?://)?([a-z]+\.)?(facebook|fb)\.com/', '', 'i');
    f := regexp_replace(f, '^(pg|pages)/', '', 'i');
    new.fb_key := nullif(lower(regexp_replace(f, '[/?#].*$', '')), '');
  else
    new.fb_key := null;
  end if;
  -- instagram.com/eventsbykate/ or @eventsbykate → eventsbykate
  new.ig_key := nullif(lower(regexp_replace(regexp_replace(coalesce(new.instagram, ''), '^(https?://)?(www\.)?instagram\.com/|^@', '', 'i'), '[/?#].*$', '')), '');
  -- last 10 digits: 0917 123 4567 and +63 917 123 4567 are the same number
  new.phone_key := case when length(regexp_replace(coalesce(new.phone, ''), '\D', '', 'g')) >= 10
                        then right(regexp_replace(new.phone, '\D', '', 'g'), 10) end;
  new.name_key := lower(new.name) || '|' || lower(coalesce(trim(new.city), ''));
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists outreach_keys on outreach_contacts;
create trigger outreach_keys before insert or update on outreach_contacts
  for each row execute function outreach_keys_trg();

alter table outreach_contacts enable row level security;
drop policy if exists "outreach_staff" on outreach_contacts;
create policy "outreach_staff" on outreach_contacts for all using (is_staff()) with check (is_staff());

create table if not exists outreach_messages (
  key text primary key,
  body text not null,
  updated_at timestamptz not null default now()
);
alter table outreach_messages drop constraint if exists outreach_messages_key_check;
alter table outreach_messages add constraint outreach_messages_key_check
  check (key in ('opener', 'followup', 'opener_venue', 'followup_venue', 'opener_caterer', 'followup_caterer', 'opener_supplier', 'followup_supplier'));
alter table outreach_messages enable row level security;
drop policy if exists "outreach_messages_staff" on outreach_messages;
create policy "outreach_messages_staff" on outreach_messages for all using (is_staff()) with check (is_staff());
insert into outreach_messages (key, body) values
  ('opener', E'Hi {name}, I''m Angela from The RSVP Studio. We make event websites for weddings, debuts and birthdays, so guests can see the details and RSVP from one link.\n\nYou already keep every celebration running, so we''d love to make the guest list part easier. Our coordinator dashboard is free: set up each client''s site and guest list, and see who''s coming, plus-ones and dietary notes in one place. Your clients get 10% off with your code, and you earn 10% to 20% of every booking.\n\nJust reply "yes" and I''ll set everything up. Here''s how it works: {link}'),
  ('followup', E'Hi {name}, just bringing this back up. If partnering sounds good, reply "yes" and I''ll set it up for you. It only takes a minute. If now isn''t the right time, no worries at all. Here''s the link again: {link}'),
  ('opener_venue', E'Hi {name}, I''m Angela from The RSVP Studio. We make event websites for weddings, debuts and birthdays, so guests can see the details and RSVP from one link.\n\nA lot of celebrations start at places like yours, so we''d love to partner with you. Your clients get 10% off with your code, and you earn 10% to 20% of every booking.\n\nJust reply "yes" and I''ll set everything up. Here''s how it works: {link}'),
  ('followup_venue', E'Hi {name}, just bringing this back up. If partnering sounds good, reply "yes" and I''ll set it up for you. It only takes a minute. If now isn''t the right time, no worries at all. Here''s the link again: {link}'),
  ('opener_caterer', E'Hi {name}, I''m Angela from The RSVP Studio. We make event websites for weddings, debuts and birthdays, so guests can see the details and RSVP from one link.\n\nGood food is half the celebration, so we''d love to partner with you. Guests share their dietary notes when they RSVP, so you get a firm headcount early. Your clients get 10% off with your code, and you earn 10% to 20% of every booking.\n\nJust reply "yes" and I''ll set everything up. Here''s how it works: {link}'),
  ('followup_caterer', E'Hi {name}, just bringing this back up. If partnering sounds good, reply "yes" and I''ll set it up for you. It only takes a minute. If now isn''t the right time, no worries at all. Here''s the link again: {link}'),
  ('opener_supplier', E'Hi {name}, I''m Angela from The RSVP Studio. We make event websites for weddings, debuts and birthdays, so guests can see the details and RSVP from one link.\n\nWe''re partnering with event suppliers in {city}, and we''d love to have you. Your clients get 10% off with your code, and you earn 10% to 20% of every booking.\n\nJust reply "yes" and I''ll set everything up. Here''s how it works: {link}'),
  ('followup_supplier', E'Hi {name}, just bringing this back up. If partnering sounds good, reply "yes" and I''ll set it up for you. It only takes a minute. If now isn''t the right time, no worries at all. Here''s the link again: {link}')
on conflict (key) do nothing;

-- Import many at once (Studio → Outreach → Import). Duplicates are skipped; returns how many were added.
create or replace function outreach_import(p_rows jsonb)
returns int
language plpgsql security definer set search_path = public
as $$
declare n int;
begin
  if not is_staff() then raise exception 'staff only'; end if;
  if jsonb_array_length(p_rows) > 2000 then raise exception 'at most 2000 rows at a time'; end if;
  with ins as (
    insert into outreach_contacts (name, contact_person, kind, city, facebook, instagram, website, email, phone, found_via, notes)
    select left(trim(x.name), 160), nullif(trim(x.contact_person), ''),
           case when lower(x.kind) in ('coordinator', 'venue', 'stylist', 'caterer', 'photo_video', 'stationery', 'entertainment', 'beauty', 'attire', 'cakes', 'rentals', 'party', 'other') then lower(x.kind)
                when coalesce(trim(x.kind), '') = '' or lower(x.kind) = 'planner' then 'coordinator' else 'other' end,
           nullif(trim(x.city), ''), x.facebook, x.instagram, nullif(trim(x.website), ''), x.email, x.phone,
           nullif(trim(x.found_via), ''), nullif(trim(x.notes), '')
    from jsonb_to_recordset(p_rows) as x(name text, contact_person text, kind text, city text, facebook text, instagram text,
                                          website text, email text, phone text, found_via text, notes text)
    where coalesce(trim(x.name), '') <> ''
    on conflict do nothing
    returning 1
  )
  select count(*) into n from ins;
  return n;
end;
$$;
revoke all on function outreach_import(jsonb) from public, anon;
grant execute on function outreach_import(jsonb) to authenticated;

-- Match sign-ups and partner applications back to the people we messaged, then count each tab.
create or replace function outreach_refresh()
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  today timestamptz := (date_trunc('day', now() at time zone 'Asia/Manila')) at time zone 'Asia/Manila';
  due timestamptz := now() - interval '5 days';
  r jsonb;
begin
  if not is_staff() then raise exception 'staff only'; end if;
  -- an account made through their link, or with their email / mobile
  update outreach_contacts c
  set status = 'signed_up', signed_up_at = coalesce(c.signed_up_at, p.created_at), matched_profile = p.id
  from profiles p
  where c.matched_profile is null and c.status <> 'signed_up' and not p.is_staff
    and (p.signup_source_detail = 'outreach · ' || c.code
         or (c.email is not null and lower(p.email) = c.email)
         or (c.phone_key is not null and right(regexp_replace(coalesce(p.phone, ''), '\D', '', 'g'), 10) = c.phone_key));
  -- a partner application through their link, or with their email / mobile / Instagram
  update outreach_contacts c
  set status = 'signed_up', signed_up_at = coalesce(c.signed_up_at, e.created_at), matched_enquiry = e.id
  from enquiries e
  where c.matched_enquiry is null and c.status <> 'signed_up' and e.form = 'partner-inquiry' and e.status <> 'spam'
    and (e.values ->> 'source_detail' = 'outreach · ' || c.code
         or (c.email is not null and lower(e.email) = c.email)
         or (c.phone_key is not null and right(regexp_replace(coalesce(e.phone, ''), '\D', '', 'g'), 10) = c.phone_key)
         or (c.ig_key is not null and lower(regexp_replace(regexp_replace(coalesce(e.values ->> 'instagram', e.values ->> 'ig_handle', ''),
               '^(https?://)?(www\.)?instagram\.com/|^@', '', 'i'), '[/?#].*$', '')) = c.ig_key));
  select jsonb_build_object(
    'to_message', count(*) filter (where status = 'to_message'),
    'due',        count(*) filter (where status = 'messaged' and followed_up_at is null and messaged_at < due),
    'waiting',    count(*) filter (where status = 'messaged' and not (followed_up_at is null and messaged_at < due)),
    'replied',    count(*) filter (where status = 'replied'),
    'signed_up',  count(*) filter (where status = 'signed_up'),
    'closed',     count(*) filter (where status in ('not_interested', 'skipped')),
    'sent_today', count(*) filter (where messaged_at >= today) + count(*) filter (where followed_up_at >= today),
    'messaged',   count(*) filter (where messaged_at is not null),
    'total',      count(*)
  ) into r
  from outreach_contacts;
  return r;
end;
$$;
revoke all on function outreach_refresh() from public, anon;
grant execute on function outreach_refresh() to authenticated;

-- Cities on the list, most contacts first (the filter). Done here because plain selects stop at 1,000 rows.
create or replace function outreach_cities()
returns table (city text, n bigint)
language sql stable security definer set search_path = public
as $$
  select c.city, count(*) from outreach_contacts c
  where is_staff() and c.city is not null and c.city <> ''
  group by c.city order by count(*) desc, c.city;
$$;
revoke all on function outreach_cities() from public, anon;
grant execute on function outreach_cities() to authenticated;

-- Check: expect 1 | 8 | 3
select
  (select count(*) from information_schema.tables where table_name = 'outreach_contacts') as contacts_table,
  (select count(*) from outreach_messages) as messages,
  (select count(*) from pg_proc where proname in ('outreach_import', 'outreach_refresh', 'outreach_cities')) as functions;
