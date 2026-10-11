-- RSVP Studio — Free vs Premium DIY sites. ADDITIVE, safe to re-run.
-- Run on STAGING first, then on LIVE before pushing the code that uses it.
-- Needs payments.sql and templates-schema.sql.
--
--   1. event_is_premium(): the ONE rule for "is this site Premium?"
--        a studio project · OR a paid Premium payment (Premium template or ₱499 upgrade)
--        · OR it's live on a Premium template (covers a ₱0 Premium promo).
--      Premium = no "Made with The RSVP Studio" credit on the site + an email
--      to the hosts for every RSVP. Free = credit + one daily RSVP summary.
--   2. site_upgrade_due(): what a free-template site owes to become Premium.
--   3. get_public_site() also says whether the site is Premium.
--   4. site_plan(): the builder asks this (plan, upgrade price).
--   5. events.rsvp_digest_sent_at: where the daily summary left off.
--   6. rsvp_email_log + claim_rsvp_emails(): an account-wide 24-hour budget for
--      RSVP emails, so a busy site can never use up the Resend daily limit that
--      logins, invoices and support emails also need.
--   7. Signups that came from a free site's credit / email link.

-- ---------------------------------------------------------------------
-- 1. Is this event's site Premium?
-- ---------------------------------------------------------------------
create or replace function event_is_premium(p_event uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select managed_by_studio from events where id = p_event), false)
    or exists (
      select 1 from payments
      where event_id = p_event and kind = 'site_publish' and status = 'paid' and template_tier = 'premium')
    or exists (
      select 1 from wedding_sites ws
      join templates t on t.id = ws.published_presentation->>'activeTemplateId'
      where ws.event_id = p_event and ws.published_at is not null and t.tier = 'premium');
$$;
revoke all on function event_is_premium(uuid) from public, anon, authenticated;
grant execute on function event_is_premium(uuid) to service_role;

-- ---------------------------------------------------------------------
-- 2. Upgrading a free-template site to Premium
-- ---------------------------------------------------------------------
-- The Premium price, less anything already paid to publish this site.
create or replace function site_upgrade_due(p_event uuid)
returns table (premium boolean, price_centavos int, due_centavos int)
language sql stable security definer set search_path = public
as $$
  with p as (
    select round(coalesce((select amount from site_prices where tier = 'premium'), 0) * 100)::int as price
  ), paid as (
    select coalesce(sum(amount_centavos), 0)::int as paid
    from payments where event_id = p_event and kind = 'site_publish' and status = 'paid'
  )
  select event_is_premium(p_event), p.price,
         case when event_is_premium(p_event) then 0 else greatest(p.price - paid.paid, 0) end
  from p, paid;
$$;
revoke all on function site_upgrade_due(uuid) from public, anon, authenticated;
grant execute on function site_upgrade_due(uuid) to service_role;

-- ---------------------------------------------------------------------
-- 3. The public site knows whether to show the credit
-- ---------------------------------------------------------------------
drop function if exists get_public_site(text);
create function get_public_site(p_slug text)
returns table (published_content jsonb, published_presentation jsonb, template_spec jsonb, is_premium boolean)
language sql stable security definer set search_path = public
as $$
  select ws.published_content, ws.published_presentation, tv.spec, event_is_premium(ws.event_id)
  from wedding_sites ws
  left join template_versions tv on tv.id = ws.published_template_version_id
  where ws.slug = lower(p_slug)
    and ws.published_at is not null
  limit 1;
$$;
grant execute on function get_public_site(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. The builder: which plan is this site on, and what does Premium cost?
-- ---------------------------------------------------------------------
create or replace function site_plan(p_event uuid)
returns table (premium boolean, managed boolean, upgrade_centavos int)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not (is_staff() or can_access_event(p_event)) then raise exception 'Not your event'; end if;
  return query
    select d.premium, coalesce((select managed_by_studio from events where id = p_event), false), d.due_centavos
    from site_upgrade_due(p_event) d;
end;
$$;
revoke all on function site_plan(uuid) from public, anon;
grant execute on function site_plan(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 5. Daily RSVP summary for free sites (api/support-cron.ts, ~9 AM Manila)
-- ---------------------------------------------------------------------
alter table events add column if not exists rsvp_digest_sent_at timestamptz;
create index if not exists rsvps_event_updated_idx on rsvps (event_id, updated_at);

-- ---------------------------------------------------------------------
-- 6. Account-wide RSVP email budget (rolling 24 hours)
-- ---------------------------------------------------------------------
create table if not exists rsvp_email_log (
  id bigint generated always as identity primary key,
  sent_at timestamptz not null default now(),
  kind text not null check (kind in ('guest', 'host', 'digest')),
  premium boolean not null default false,
  event_id uuid references events (id) on delete set null,
  recipients int not null default 1 check (recipients > 0)
);
create index if not exists rsvp_email_log_sent_idx on rsvp_email_log (sent_at);
alter table rsvp_email_log enable row level security;
drop policy if exists "rsvp_email_log_staff_read" on rsvp_email_log;
create policy "rsvp_email_log_staff_read" on rsvp_email_log for select using (is_staff());

-- Reserve room for p_recipients emails. TRUE = go ahead and send (it's logged);
-- FALSE = skip this email (the RSVP itself is already saved).
-- Free sites' guest emails stop at p_free_limit; everything else at p_limit.
-- Whatever's left under Resend's daily cap stays free for logins, invoices, support.
create or replace function claim_rsvp_emails(
  p_kind text, p_premium boolean, p_event uuid, p_recipients int, p_limit int, p_free_limit int
) returns boolean
language plpgsql security definer set search_path = public
as $$
declare used int;
begin
  perform pg_advisory_xact_lock(hashtext('claim_rsvp_emails'));
  select coalesce(sum(recipients), 0) into used from rsvp_email_log where sent_at > now() - interval '24 hours';
  if used + p_recipients > p_limit then return false; end if;
  if p_kind = 'guest' and not p_premium and used + p_recipients > p_free_limit then return false; end if;
  insert into rsvp_email_log (kind, premium, event_id, recipients) values (p_kind, p_premium, p_event, p_recipients);
  delete from rsvp_email_log where sent_at < now() - interval '30 days';
  return true;
end;
$$;
revoke all on function claim_rsvp_emails(text, boolean, uuid, int, int, int) from public, anon, authenticated;
grant execute on function claim_rsvp_emails(text, boolean, uuid, int, int, int) to service_role;

-- ---------------------------------------------------------------------
-- 7. Signups from free sites ("Make your own" on the site, or in a guest email)
-- ---------------------------------------------------------------------
alter table profiles add column if not exists referred_by text;   -- the site's slug
alter table profiles add column if not exists referred_via text;  -- 'site' | 'email'

-- Called once after sign-up. Only a NEW account (made after the click) is credited,
-- and never overwritten — an existing customer clicking a link changes nothing.
create or replace function record_signup_ref(p_slug text, p_via text, p_clicked_at timestamptz)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or p_slug !~ '^[a-z0-9-]{1,80}$' or p_via not in ('site', 'email') then return; end if;
  update profiles set referred_by = p_slug, referred_via = p_via
  where id = auth.uid()
    and referred_by is null
    and created_at >= least(p_clicked_at, now()) - interval '10 minutes'
    and created_at > now() - interval '2 days';
end;
$$;
revoke all on function record_signup_ref(text, text, timestamptz) from public, anon;
grant execute on function record_signup_ref(text, text, timestamptz) to authenticated;

-- Check:
select
  (select count(*) from events e where not e.managed_by_studio) as diy_events,
  (select count(*) from events e where event_is_premium(e.id)) as premium_events,
  (select amount from site_prices where tier = 'free') as standard_price,
  (select amount from site_prices where tier = 'premium') as premium_price;
