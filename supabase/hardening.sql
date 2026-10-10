-- RSVP Studio — Batch 1 hardening. ADDITIVE, safe to re-run.
-- Run on LIVE before the code that uses it is pushed.
--
--   1. Events: a customer can't point their event at another event's RSVP table.
--   2. Uploads: size + file-type limits on every bucket; nobody can list other
--      people's files (public image links keep working).
--   3. RSVPs: guests can answer with an email OR a mobile number; repeat answers
--      are tracked so floods can be capped.
--   4. Enquiries: every inquiry form is saved (spam limits now, Leads in the Studio later).

-- ---------------------------------------------------------------------
-- 1. Events — table_name is studio-only
-- ---------------------------------------------------------------------
-- Studio-built events keep their own RSVP table (e.g. francesjash_rsvps), set by
-- staff. Self-serve events use the shared `rsvps` table, so table_name stays null.
drop policy if exists "events_insert_own" on events;
create policy "events_insert_own" on events
  for insert with check (owner_id = auth.uid() and table_name is null);

-- ---------------------------------------------------------------------
-- 2. Uploads
-- ---------------------------------------------------------------------
update storage.buckets set file_size_limit = 2 * 1024 * 1024,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
  where id = 'avatars';
update storage.buckets set file_size_limit = 10 * 1024 * 1024,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
  where id in ('event-site-images', 'project-covers');
update storage.buckets set file_size_limit = 20 * 1024 * 1024,
  allowed_mime_types = array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
    'application/pdf', 'text/plain', 'text/csv',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip', 'application/x-zip-compressed'
  ]
  where id = 'message-files';

-- Public buckets serve files by link without any policy. These "read" policies only
-- control listing/searching the bucket — narrow them to your own folder (plus staff).
drop policy if exists "avatars_read" on storage.objects;
create policy "avatars_read" on storage.objects
  for select using (bucket_id = 'avatars' and ((storage.foldername(name))[1] = auth.uid()::text or is_staff()));

drop policy if exists "covers_read" on storage.objects;
create policy "covers_read" on storage.objects
  for select using (bucket_id = 'project-covers' and is_staff());

drop policy if exists "event_site_images_public_read" on storage.objects;
drop policy if exists "event_site_images_read_own_event" on storage.objects;
create policy "event_site_images_read_own_event" on storage.objects
  for select using (
    bucket_id = 'event-site-images'
    and (
      is_staff()
      or (storage.foldername(name))[1]::uuid in (
        select event_id from event_members where profile_id = auth.uid()
        union
        select id from events where owner_id = auth.uid()
      )
    )
  );

-- ---------------------------------------------------------------------
-- 3. RSVPs — email or mobile; repeat answers counted
-- ---------------------------------------------------------------------
alter table rsvps alter column email drop not null;
alter table rsvps add column if not exists phone text;
alter table rsvps drop constraint if exists rsvps_contact_check;
alter table rsvps add constraint rsvps_contact_check check (email is not null or phone is not null);
alter table rsvps add column if not exists updated_at timestamptz not null default now();
alter table rsvps add column if not exists update_count int not null default 0;
create index if not exists rsvps_event_phone_idx on rsvps (event_id, phone) where phone is not null;
create index if not exists rsvps_event_updated_idx on rsvps (event_id, updated_at);

-- ---------------------------------------------------------------------
-- 4. Enquiries (written by the server with the service key; staff read/manage)
-- ---------------------------------------------------------------------
create table if not exists enquiries (
  id uuid primary key default gen_random_uuid(),
  form text not null,                       -- project-inquiry | partner-inquiry | faq-question
  name text,
  email text,
  phone text,
  values jsonb not null default '{}'::jsonb,
  attachments text[] not null default '{}', -- file names (the files go to the studio inbox)
  ip_hash text,                             -- for spam limits; never the raw address
  status text not null default 'new' check (status in ('new', 'contacted', 'converted', 'archived', 'spam')),
  event_id uuid references events (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists enquiries_created_idx on enquiries (created_at desc);
create index if not exists enquiries_ip_idx on enquiries (ip_hash, created_at);
create index if not exists enquiries_email_idx on enquiries (lower(email), created_at);
alter table enquiries enable row level security;
drop policy if exists "enquiries_staff_all" on enquiries;
create policy "enquiries_staff_all" on enquiries for all using (is_staff()) with check (is_staff());

-- Check:
select
  (select count(*) from pg_policies where tablename = 'events' and policyname = 'events_insert_own' and with_check like '%table_name IS NULL%') as events_locked,
  (select count(*) from storage.buckets where file_size_limit is not null) as buckets_limited,
  (select is_nullable from information_schema.columns where table_name = 'rsvps' and column_name = 'email') as rsvp_email_nullable,
  (select count(*) from enquiries) as enquiries;
