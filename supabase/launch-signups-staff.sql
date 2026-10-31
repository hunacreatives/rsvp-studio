-- Studio → Emails: staff can read the newsletter list (launch_signups). Everyone else still can't,
-- and only the server adds to it (api/send-welcome-email.ts ?op=launch).
grant select on launch_signups to authenticated;
drop policy if exists "launch_signups_staff_read" on launch_signups;
create policy "launch_signups_staff_read" on launch_signups for select to authenticated using (is_staff());

-- check: one policy, staff only
select policyname, cmd, qual from pg_policies where tablename = 'launch_signups';
