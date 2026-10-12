-- RSVP Studio — the blog (/blog), written in Studio → Blog.
-- ADDITIVE, safe to re-run. Run on LIVE before pushing the code that reads it.

create table if not exists blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  excerpt text,                                   -- the line under the title on cards
  body text not null default '',                  -- the article, in simple Markdown
  category text not null default 'Tips & Guides',
  cover_url text,
  cover_alt text,
  author text not null default 'The RSVP Studio',
  featured boolean not null default false,        -- the big story at the top of /blog
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists blog_posts_published_idx on blog_posts (status, published_at desc);

alter table blog_posts enable row level security;
-- Everyone reads published posts (a future date = scheduled); staff do everything.
drop policy if exists "blog_posts_public" on blog_posts;
create policy "blog_posts_public" on blog_posts for select using (status = 'published' and published_at <= now());
drop policy if exists "blog_posts_staff" on blog_posts;
create policy "blog_posts_staff" on blog_posts for all using (is_staff()) with check (is_staff());
grant select on blog_posts to anon, authenticated;

-- The articles from the blog design, as drafts for the team to write.
insert into blog_posts (slug, title, excerpt, category, featured) values
  ('wedding-invitation-wording', 'A Guide to Wedding Invitation Wording', 'From formal to modern, here’s everything you need to know about what to include in your wedding invitation.', 'Wedding', true),
  ('details-that-make-an-impression', 'The Details That Make an Impression', 'From paper choices to finishing touches, explore how thoughtful details elevate your event stationery.', 'Stationery', false),
  ('seamless-wedding-day-timeline', 'A Seamless Wedding Day Timeline', 'A practical guide to help you plan a relaxed and well-paced celebration.', 'Planning', false),
  ('celebration-venues-in-cebu', 'Our Favorite Celebration Venues in Cebu', 'A curated list of beautiful spaces for intimate gatherings and larger celebrations.', 'Events', false)
on conflict (slug) do nothing;

-- Check:
select status, count(*) from blog_posts group by status;
