-- RSVP Studio — the announcement banner across the top of the marketing site,
-- edited in Studio → Overview → Website banner. ADDITIVE, safe to re-run.
-- Run on LIVE before pushing the code that reads it.

create table if not exists site_banner (
  id int primary key default 1 check (id = 1),
  enabled boolean not null default true,
  text text not null default 'Now booking weddings and celebrations for 2027' check (length(text) <= 140),
  link text check (link is null or link ~ '^(/|https://)'),   -- where tapping the banner goes (optional)
  updated_at timestamptz not null default now()
);
insert into site_banner (id) values (1) on conflict (id) do nothing;
-- Colours: background and text.
alter table site_banner add column if not exists color text not null default '#3fb6dc' check (color ~ '^#[0-9a-fA-F]{6}$');
alter table site_banner add column if not exists text_color text not null default '#ffffff' check (text_color ~ '^#[0-9a-fA-F]{6}$');

alter table site_banner enable row level security;
-- Everyone (signed out included) can read it; only staff can change it.
drop policy if exists "site_banner_read" on site_banner;
create policy "site_banner_read" on site_banner for select using (true);
drop policy if exists "site_banner_staff" on site_banner;
create policy "site_banner_staff" on site_banner for all using (is_staff()) with check (is_staff());
grant select on site_banner to anon, authenticated;

-- Check:
select enabled, text, link, color, text_color from site_banner;
