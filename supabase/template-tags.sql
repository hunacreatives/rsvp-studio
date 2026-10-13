-- RSVP Studio — template tags (Oct 13 2026). ADDITIVE, safe to re-run. Run on LIVE before pushing.
-- Occasions already live in templates.event_types (wedding, birthday, …); this adds the
-- "Featured" switch for the /build front page, set in Studio → Templates.
alter table templates add column if not exists featured boolean not null default false;

-- Check: should print 1
select count(*) as featured_column from information_schema.columns where table_name = 'templates' and column_name = 'featured';
