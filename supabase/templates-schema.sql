-- RSVP Studio — uploadable templates (Phase 1a). Safe to re-run.
-- Paste into the SQL editor for the-rsvp-studio project, AFTER
-- client-dashboard-schema.sql and site-security-fixes.sql.
--
-- Adds:
--   templates          one row per template in the "Build Your Website" gallery
--                      (the 5 hand-coded ones are rows too, kind = 'code')
--   template_versions  the uploaded spec (JSON) for kind = 'spec'; published
--                      versions are immutable so live sites never change under
--                      a customer
--   buckets            template-assets (public art) + template-sources (private
--                      uploaded packages), staff-only writes
--   wedding_sites.published_template_version_id  — a published site stays on
--                      the template version it launched with
--   get_public_site()  now also returns that pinned spec

create table if not exists templates (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{1,40}$'),
  label text not null,
  kind text not null check (kind in ('code', 'spec')),
  tier text not null default 'free' check (tier in ('free', 'premium')),
  -- draft: staff only · listed: in the gallery · hidden: still renders for
  -- existing sites, not offered · retired: same as hidden, never re-offered
  status text not null default 'draft' check (status in ('draft', 'listed', 'hidden', 'retired')),
  event_types text[] not null default '{}',
  sort int not null default 100,
  thumbnail_url text,
  current_version_id uuid,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id text not null references templates (id) on delete cascade,
  version int not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  spec jsonb,                -- null for kind = 'code'
  demo_content jsonb,        -- sample event shown on the gallery card
  source_package_path text,  -- template-sources/<id>/v<n>/package.zip
  ingest_report jsonb,       -- what the upload extracted + staff mapping choices
  qa jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  published_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (template_id, version)
);

alter table templates drop constraint if exists templates_current_version_fk;
alter table templates add constraint templates_current_version_fk
  foreign key (current_version_id) references template_versions (id) on delete set null;

-- Published versions are frozen: edit by creating the next version.
create or replace function template_versions_guard()
returns trigger language plpgsql as $$
begin
  if old.status in ('published', 'archived') and new.spec is distinct from old.spec then
    raise exception 'published template versions are immutable; create a new version';
  end if;
  return new;
end;
$$;
drop trigger if exists on_template_versions_guard on template_versions;
create trigger on_template_versions_guard before update on template_versions
  for each row execute function template_versions_guard();

create or replace function templates_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists on_templates_touch on templates;
create trigger on_templates_touch before update on templates
  for each row execute function templates_touch();

alter table templates enable row level security;
alter table template_versions enable row level security;

drop policy if exists "templates_public_read" on templates;
create policy "templates_public_read" on templates
  for select using (status in ('listed', 'hidden', 'retired') or is_staff());
drop policy if exists "templates_staff_write" on templates;
create policy "templates_staff_write" on templates
  for all using (is_staff()) with check (is_staff());

drop policy if exists "template_versions_public_read" on template_versions;
create policy "template_versions_public_read" on template_versions
  for select using (status in ('published', 'archived') or is_staff());
drop policy if exists "template_versions_staff_write" on template_versions;
create policy "template_versions_staff_write" on template_versions
  for all using (is_staff()) with check (is_staff());

-- The 5 hand-coded templates, so gallery order/tier/visibility is managed
-- in one place for every template.
insert into templates (id, label, kind, tier, status, event_types, sort) values
  ('editorial-formal', 'Editorial Formal', 'code', 'free', 'listed', '{}', 10),
  ('modern-minimal', 'Modern Minimal', 'code', 'free', 'listed', '{}', 20),
  ('botanical', 'Botanical', 'code', 'premium', 'listed', '{wedding}', 30),
  ('scrapbook', 'Scrapbook', 'code', 'premium', 'listed', '{wedding}', 40),
  ('cinematic', 'Cinematic', 'code', 'premium', 'listed', '{birthday}', 50)
on conflict (id) do nothing;

-- Storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('template-assets', 'template-assets', true, 8388608,
    array['image/webp', 'image/png', 'image/jpeg', 'image/svg+xml', 'video/mp4', 'font/woff2']),
  ('template-sources', 'template-sources', false, 209715200, array['application/zip', 'application/x-zip-compressed'])
on conflict (id) do nothing;

drop policy if exists "template_assets_read" on storage.objects;
create policy "template_assets_read" on storage.objects
  for select using (bucket_id = 'template-assets');
drop policy if exists "template_files_staff_write" on storage.objects;
create policy "template_files_staff_write" on storage.objects
  for all using (bucket_id in ('template-assets', 'template-sources') and is_staff())
  with check (bucket_id in ('template-assets', 'template-sources') and is_staff());
drop policy if exists "template_sources_staff_read" on storage.objects;
create policy "template_sources_staff_read" on storage.objects
  for select using (bucket_id = 'template-sources' and is_staff());

-- Version pinning for published sites
alter table wedding_sites add column if not exists published_template_version_id uuid
  references template_versions (id) on delete set null;

-- Public read path, now with the pinned template spec (return type changed,
-- so the old function is dropped first).
drop function if exists get_public_site(text);
create function get_public_site(p_slug text)
returns table (published_content jsonb, published_presentation jsonb, template_spec jsonb)
language sql stable security definer set search_path = public
as $$
  select ws.published_content, ws.published_presentation, tv.spec
  from wedding_sites ws
  left join template_versions tv on tv.id = ws.published_template_version_id
  where ws.slug = lower(p_slug)
    and ws.published_at is not null
  limit 1;
$$;
grant execute on function get_public_site(text) to anon, authenticated;
