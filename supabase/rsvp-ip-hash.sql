-- RSVP abuse guard (api/wedding-rsvp.ts): each new reply records a hash of the sender's IP (never the IP itself),
-- so one sender can't spend the day's confirmation emails. Run BEFORE pushing the code that writes it.
alter table rsvps add column if not exists ip_hash text;
create index if not exists rsvps_ip_hash_created_idx on rsvps (ip_hash, created_at) where ip_hash is not null;
create index if not exists rsvps_event_created_idx on rsvps (event_id, created_at);

-- check: the column is there
select column_name, data_type from information_schema.columns where table_name = 'rsvps' and column_name = 'ip_hash';
