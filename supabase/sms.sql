-- RSVP Studio — texts (SMS via Semaphore) + "Message your guests" (Oct 24 2026). ADDITIVE, safe to re-run.
-- Run on LIVE (project ubonzkfflxqwcwlbemmy) before pushing.
--   1. payments can be an 'sms_pack' (100 / 300 / 600 texts for one event).
--   2. event_sms: each event's texting switch, balance (credits bought or included, credits used),
--      the host's own alert choice (Premium: every reply by email or text) and the host's mobile.
--      Off by default. Premium sites get 50 texts the first time texting is switched on.
--   3. message_log: every text (and broadcast email) sent, so nothing goes twice, failures are
--      refunded, and the host sees what went out.
--   4. guest_broadcasts: the host's "Message your guests" sends.
--   5. Functions: sms_set_enabled (host), sms_set_host_alerts (host), claim_sms / refund_sms
--      (server only, never below zero), sms_add_credits (server, after payment).

-- 1. Payments
do $$
declare r record;
begin
  for r in select conname from pg_constraint
    where conrelid = 'payments'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%kind%'
  loop
    execute format('alter table payments drop constraint %I', r.conname);
  end loop;
end $$;
alter table payments add constraint payments_kind_check
  check (kind in ('invoice', 'site_publish', 'domain', 'domain_renewal', 'sms_pack'));
alter table payments add column if not exists sms_credits int check (sms_credits is null or sms_credits > 0);

-- 2. Texting per event
create table if not exists event_sms (
  event_id uuid primary key references events (id) on delete cascade,
  enabled boolean not null default false,
  credits int not null default 0 check (credits >= 0),
  used int not null default 0 check (used >= 0),
  premium_grant_at timestamptz,
  -- How the host hears about each reply (Premium; free sites get the daily email summary).
  host_alerts text not null default 'email' check (host_alerts in ('email', 'sms', 'both')),
  host_phone text check (host_phone is null or host_phone ~ '^\+[0-9]{8,15}$'),
  low_notice_at timestamptz,
  updated_at timestamptz not null default now(),
  check (used <= credits)
);
alter table event_sms enable row level security;
drop policy if exists "event_sms_read" on event_sms;
create policy "event_sms_read" on event_sms for select using (can_access_event(event_id));
-- No insert/update policies: changes go through the functions below.

-- 3. What went out
create table if not exists message_log (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  channel text not null check (channel in ('sms', 'email')),
  kind text not null check (kind in ('rsvp_confirm', 'reminder', 'broadcast', 'host_alert')),
  rsvp_id uuid references rsvps (id) on delete cascade,
  broadcast_id uuid,
  to_address text not null,
  segments int not null default 1,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'refunded', 'skipped')),
  provider_id text,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists message_log_event_idx on message_log (event_id, created_at desc);
-- One confirmation / one reminder per reply and channel, ever. Only those two kinds carry
-- rsvp_id (broadcasts and host alerts leave it empty), so the rest never collide.
create unique index if not exists message_log_once_idx on message_log (rsvp_id, kind, channel);
alter table message_log enable row level security;
drop policy if exists "message_log_read" on message_log;
create policy "message_log_read" on message_log for select using (can_access_event(event_id));

-- 4. Broadcasts
create table if not exists guest_broadcasts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  created_by uuid references profiles (id) on delete set null,
  audience text not null check (audience in ('coming', 'replied', 'waiting', 'declined')),
  channels text[] not null,
  message text not null check (char_length(message) between 1 and 600),
  emails int not null default 0,
  texts int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists guest_broadcasts_event_idx on guest_broadcasts (event_id, created_at desc);
alter table guest_broadcasts enable row level security;
drop policy if exists "guest_broadcasts_read" on guest_broadcasts;
create policy "guest_broadcasts_read" on guest_broadcasts for select using (can_access_event(event_id));

-- 5. Functions
-- A Premium site's 50 included texts, once (the first time texting or text alerts go on).
create or replace function sms_premium_grant(p_event uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  insert into event_sms (event_id) values (p_event) on conflict (event_id) do nothing;
  if event_is_premium(p_event) then
    update event_sms set credits = credits + 50, premium_grant_at = now(), updated_at = now()
      where event_id = p_event and premium_grant_at is null;
  end if;
end;
$$;
revoke all on function sms_premium_grant(uuid) from public, anon, authenticated;
grant execute on function sms_premium_grant(uuid) to service_role;

-- The host switches guest texting on or off. On needs texts left.
create or replace function sms_set_enabled(p_event uuid, p_on boolean)
returns event_sms
language plpgsql security definer set search_path = public
as $$
declare r event_sms;
begin
  if not can_access_event(p_event) then raise exception 'NOT_ALLOWED'; end if;
  perform sms_premium_grant(p_event);
  select * into r from event_sms where event_id = p_event;
  if p_on and r.credits - r.used <= 0 then raise exception 'NO_CREDITS'; end if;
  update event_sms set enabled = p_on, updated_at = now() where event_id = p_event returning * into r;
  return r;
end;
$$;
revoke all on function sms_set_enabled(uuid, boolean) from public, anon;
grant execute on function sms_set_enabled(uuid, boolean) to authenticated;

-- The host's own alerts (texts only on Premium).
create or replace function sms_set_host_alerts(p_event uuid, p_alerts text, p_phone text)
returns event_sms
language plpgsql security definer set search_path = public
as $$
declare r event_sms;
begin
  if not can_access_event(p_event) then raise exception 'NOT_ALLOWED'; end if;
  if p_alerts not in ('email', 'sms', 'both') then raise exception 'BAD_ALERTS'; end if;
  if p_alerts <> 'email' and not event_is_premium(p_event) then raise exception 'PREMIUM_ONLY'; end if;
  if p_alerts <> 'email' and (p_phone is null or p_phone !~ '^\+[0-9]{8,15}$') then raise exception 'BAD_PHONE'; end if;
  perform sms_premium_grant(p_event);
  update event_sms set host_alerts = p_alerts, host_phone = coalesce(p_phone, host_phone), updated_at = now()
    where event_id = p_event returning * into r;
  return r;
end;
$$;
revoke all on function sms_set_host_alerts(uuid, text, text) from public, anon;
grant execute on function sms_set_host_alerts(uuid, text, text) to authenticated;

-- Server only: take n texts if there are enough (all or nothing). Guest texts also need
-- texting switched on; the host's own alerts (p_guest false) only need the balance.
drop function if exists claim_sms(uuid, int);
create or replace function claim_sms(p_event uuid, p_n int, p_guest boolean default true)
returns boolean
language sql security definer set search_path = public
as $$
  with c as (
    update event_sms set used = used + p_n, updated_at = now()
    where event_id = p_event and (enabled or not p_guest) and p_n > 0 and credits - used >= p_n
    returning 1
  )
  select exists (select 1 from c);
$$;
create or replace function refund_sms(p_event uuid, p_n int)
returns void
language sql security definer set search_path = public
as $$
  update event_sms set used = greatest(0, used - p_n), updated_at = now() where event_id = p_event and p_n > 0;
$$;
-- Server only: a paid pack (paymongo-webhook) adds its texts and switches texting on.
create or replace function sms_add_credits(p_event uuid, p_n int)
returns void
language sql security definer set search_path = public
as $$
  insert into event_sms (event_id, credits, enabled) values (p_event, p_n, true)
  on conflict (event_id) do update set credits = event_sms.credits + p_n, enabled = true, low_notice_at = null, updated_at = now();
$$;
revoke all on function claim_sms(uuid, int, boolean) from public, anon, authenticated;
revoke all on function refund_sms(uuid, int) from public, anon, authenticated;
revoke all on function sms_add_credits(uuid, int) from public, anon, authenticated;
grant execute on function claim_sms(uuid, int, boolean) to service_role;
grant execute on function refund_sms(uuid, int) to service_role;
grant execute on function sms_add_credits(uuid, int) to service_role;

-- Check: expect 3 | 6
select
  (select count(*) from information_schema.tables where table_name in ('event_sms', 'message_log', 'guest_broadcasts')) as tables,
  (select count(*) from pg_proc where proname in ('sms_premium_grant', 'sms_set_enabled', 'sms_set_host_alerts', 'claim_sms', 'refund_sms', 'sms_add_credits')) as functions;
