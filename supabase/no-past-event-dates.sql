-- RSVP Studio — no past event dates (Oct 28 2026). Safe to re-run.
-- Run on LIVE (ubonzkfflxqwcwlbemmy) before pushing.
--   A host can't create an event dated in the past, or move an event's date into the past.
--   "Today" is Manila's. An event whose date has already passed can still be edited (its date
--   only matters when it changes). Studio staff (past projects for the portfolio) and the server
--   (no signed-in user: crons, scripts) are exempt.
create or replace function events_no_past_date()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.event_date is null or new.event_date >= (now() at time zone 'Asia/Manila')::date then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.event_date is not distinct from old.event_date then
    return new;
  end if;
  if auth.uid() is null or coalesce(is_staff(), false) then
    return new;
  end if;
  raise exception 'The event date can''t be in the past.' using errcode = '22023';
end;
$$;

drop trigger if exists events_no_past_date on events;
create trigger events_no_past_date
  before insert or update of event_date on events
  for each row execute function events_no_past_date();

-- Check: expect one row, the trigger enabled ('O').
select tgname, tgenabled from pg_trigger where tgname = 'events_no_past_date';
