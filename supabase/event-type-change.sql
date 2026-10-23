-- RSVP Studio — hosts change their event type + free designs for more events (Oct 24 2026).
-- ADDITIVE, safe to re-run. Run on LIVE (project ubonzkfflxqwcwlbemmy) before pushing.
--   1. set_event_type(): the owner of a self-serve event changes its type in the builder
--      (Details → Settings → Event). Customers can't update events directly (no update
--      policy), and Studio projects stay Studio's to change.
--   2. Modern Minimal is also offered for birthdays and baby events, and Editorial Formal
--      for birthdays and other celebrations (birthday had 5 designs, baby only Calado).

-- 1. Changing the event type
create or replace function set_event_type(p_event uuid, p_type text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if p_type is null or p_type not in ('wedding', 'birthday', 'anniversary', 'baby', 'other') then
    raise exception 'BAD_TYPE';
  end if;
  if not exists (
    select 1 from events e
    where e.id = p_event
      and e.deleted_at is null
      and coalesce(e.managed_by_studio, false) = false
      and (e.owner_id = auth.uid()
        or exists (select 1 from event_members m where m.event_id = e.id and m.profile_id = auth.uid() and m.role = 'owner'))
  ) then
    raise exception 'NOT_ALLOWED';
  end if;
  update events set event_type = p_type, updated_at = now() where id = p_event;
end;
$$;
revoke all on function set_event_type(uuid, text) from public, anon;
grant execute on function set_event_type(uuid, text) to authenticated;

-- 2. More events for the free designs
update templates set event_types = '{wedding,anniversary,birthday,baby,other}', updated_at = now() where id = 'modern-minimal';
update templates set event_types = '{wedding,birthday,other}', updated_at = now() where id = 'editorial-formal';

-- Check: expect set_event_type = true, and the two rows below.
select to_regprocedure('set_event_type(uuid, text)') is not null as set_event_type;
select id, event_types from templates where id in ('modern-minimal', 'editorial-formal');
