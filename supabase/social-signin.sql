-- RSVP Studio — Google / Facebook sign-in. Safe to re-run.
-- New accounts get their name from whichever field the provider sends:
-- email sign-up sets full_name; Google sends full_name and name; Facebook
-- sends name. Also backfills profiles created by social sign-in without one.

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), nullif(new.raw_user_meta_data ->> 'name', '')),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

update public.profiles p
set full_name = coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''), nullif(u.raw_user_meta_data ->> 'name', ''))
from auth.users u
where u.id = p.id
  and (p.full_name is null or p.full_name = '')
  and coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name') is not null;
