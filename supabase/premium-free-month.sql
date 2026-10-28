-- RSVP Studio — every Premium design free for a month (Oct 28 – Nov 27 2026). Safe to re-run.
-- Run on LIVE (ubonzkfflxqwcwlbemmy). No code to push: the site already handles a ₱0 price.
--   The designs stay Premium (badge, no "Made with" credit, an email to the hosts for each
--   RSVP); publishing one simply costs nothing. The gallery says "Premium · Free to publish".
--   The price goes back to ₱499 by itself at midnight on 28 Nov (Manila), = 16:00 UTC on 27 Nov.
--   (Changing the Premium price in Studio before then is fine, but the switch-back still sets
--   ₱499 on the 28th: to end the free month early, run the "end now" lines at the bottom.)

-- 1. Free for now
update site_prices set amount = 0, updated_at = now() where tier = 'premium';

-- 2. Back to ₱499 when the month is up (once; the job removes itself)
create extension if not exists pg_cron;
select cron.unschedule(jobid) from cron.job where jobname = 'premium-free-month-end';
select cron.schedule(
  'premium-free-month-end',
  '0 16 27 11 *',
  $job$
    update site_prices set amount = 499, updated_at = now() where tier = 'premium';
    select cron.unschedule('premium-free-month-end');
  $job$
);

-- Check: expect premium at 0, and one scheduled job.
select tier, amount from site_prices order by tier;
select jobname, schedule from cron.job where jobname = 'premium-free-month-end';

-- To end the free month early (don't run these now):
--   update site_prices set amount = 499, updated_at = now() where tier = 'premium';
--   select cron.unschedule('premium-free-month-end');
