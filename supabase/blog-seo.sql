-- RSVP Studio — blog SEO fields (Studio → Blog → Search engines).
-- ADDITIVE, safe to re-run. Run on LIVE before pushing the code that reads it
-- (the blog's select lists these columns, so /blog breaks without them).
--   seo_title       — the title in Google and link previews (blank = the article title)
--   seo_description — the line under it (blank = the excerpt)
--   focus_keyword   — the phrase the article should rank for; only the editor's checklist uses it

alter table blog_posts add column if not exists seo_title text;
alter table blog_posts add column if not exists seo_description text;
alter table blog_posts add column if not exists focus_keyword text;

-- Check:
select column_name from information_schema.columns
where table_name = 'blog_posts' and column_name in ('seo_title', 'seo_description', 'focus_keyword');
