-- Lead files: the photos/PDFs someone attaches to an inquiry form, kept so Studio → Leads can
-- show them (before, they only went to the hello@ inbox). api/enquire uploads them to R2 at
-- leads/<random id>/<file name> and keeps their links here. Only staff can read enquiries.

alter table enquiries add column if not exists files text[] not null default '{}';

-- Check: should print 1
select count(*) as files_column from information_schema.columns
where table_schema = 'public' and table_name = 'enquiries' and column_name = 'files';
