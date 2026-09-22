-- RSVP Studio — event site image uploads (ADDITIVE)
-- Paste this into the SQL editor for the-rsvp-studio project, AFTER
-- wedding-sites-schema.sql has already been run.
--
-- Backs the "Upload a photo" option in the gallery/photo fields of the
-- site builder (src/pages/wedding-sites/builder/sections/GalleryFields.tsx),
-- which previously only accepted a pasted, already-hosted image URL.
--
-- Public bucket: published /invite/:slug pages are public, so gallery
-- images must be readable without auth. Only event owners/members may
-- upload, scoped by the event id encoded as the first path segment
-- (event-site-images/<event_id>/<filename>).

insert into storage.buckets (id, name, public)
values ('event-site-images', 'event-site-images', true)
on conflict (id) do nothing;

create policy "event_site_images_public_read" on storage.objects
  for select using (bucket_id = 'event-site-images');

create policy "event_site_images_insert_own_event" on storage.objects
  for insert with check (
    bucket_id = 'event-site-images'
    and (storage.foldername(name))[1]::uuid in (
      select event_id from event_members where profile_id = auth.uid()
      union
      select id from events where owner_id = auth.uid()
    )
  );

create policy "event_site_images_delete_own_event" on storage.objects
  for delete using (
    bucket_id = 'event-site-images'
    and (storage.foldername(name))[1]::uuid in (
      select event_id from event_members where profile_id = auth.uid()
      union
      select id from events where owner_id = auth.uid()
    )
  );
