-- RSVP Studio — each design locked to its kinds of event (Oct 23 2026). Safe to re-run.
-- Run on LIVE before pushing the code that reads it.
-- templates.event_types lists the events a design is for (events.event_type: wedding,
-- birthday, anniversary, other). The builder only offers a design for those events, and a
-- design picked on /build only lets the host create those kinds of event. Change them any
-- time in Studio → Templates (the occasion chips). None set = any event.

update templates set event_types = '{wedding}', updated_at = now() where id in ('editorial-formal', 'capiz', 'promenade', 'botanical');
update templates set event_types = '{wedding,anniversary}', updated_at = now() where id in ('scrapbook', 'love-letter');
update templates set event_types = '{wedding,anniversary,other}', updated_at = now() where id = 'modern-minimal';
update templates set event_types = '{birthday,other}', updated_at = now() where id in ('cinematic', 'pickleball', 'open-play');
-- A debut is an 18th birthday (there's no "debut" event type).
update templates set event_types = '{birthday,debut}', updated_at = now() where id = 'debut';

-- Check: every listed design has its events
select id, status, event_types from templates order by sort;
