-- RSVP Studio — engagement events + the Tinghun template (Oct 24 2026). ADDITIVE, safe to re-run.
-- RUN on LIVE (ubonzkfflxqwcwlbemmy) Oct 24 2026.
--   1. events.event_type can be 'engagement' (an engagement, incl. the Chinese-Filipino tinghun).
--   2. set_event_type() re-created with the new type (it has its own copy of the list).
--   3. The Tinghun catalog row: Premium, listed, for engagements (hidden until its code ships:
--      the gallery skips listed rows with no template behind them).
--   4. Modern Minimal and Editorial Formal are offered for engagements too (the free choices).
do $$
declare c text;
begin
  for c in select conname from pg_constraint
    where conrelid = 'events'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%event_type%'
  loop execute format('alter table events drop constraint %I', c); end loop;
  alter table events add constraint events_event_type_check
    check (event_type in ('wedding','birthday','anniversary','baby','engagement','other'));
end $$;

create or replace function set_event_type(p_event uuid, p_type text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_type is null or p_type not in ('wedding','birthday','anniversary','baby','engagement','other') then
    raise exception 'BAD_TYPE';
  end if;
  if not exists (
    select 1 from events e where e.id = p_event and e.deleted_at is null
      and coalesce(e.managed_by_studio, false) = false
      and (e.owner_id = auth.uid()
        or exists (select 1 from event_members m where m.event_id = e.id and m.profile_id = auth.uid() and m.role = 'owner'))
  ) then raise exception 'NOT_ALLOWED'; end if;
  update events set event_type = p_type, updated_at = now() where id = p_event;
end; $$;
revoke all on function set_event_type(uuid, text) from public, anon;
grant execute on function set_event_type(uuid, text) to authenticated;

insert into templates (id, label, kind, tier, status, event_types, sort)
values ('tinghun', 'Tinghun', 'code', 'premium', 'listed', '{engagement}', 98)
on conflict (id) do update set tier = 'premium', status = 'listed', event_types = '{engagement}', updated_at = now();

update templates set event_types = array(select distinct unnest(event_types || '{engagement}'::text[])), updated_at = now()
where id in ('modern-minimal', 'editorial-formal');

-- Check: 1 | 1 | 1
select
  (select count(*) from pg_constraint where conname = 'events_event_type_check' and pg_get_constraintdef(oid) ilike '%engagement%'),
  (select count(*) from pg_proc where proname = 'set_event_type' and prosrc ilike '%engagement%'),
  (select count(*) from templates where id = 'tinghun' and status = 'listed');
