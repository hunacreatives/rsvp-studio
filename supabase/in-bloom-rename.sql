-- RSVP Studio — "Cinematic" is now "In Bloom" (Oct 23 2026). Safe to re-run.
-- The id stays "cinematic", so sites already on it keep working. The catalog's label is the
-- name shown in the gallery, the builder and the design preview.
update templates set label = 'In Bloom', updated_at = now() where id = 'cinematic';

-- Check: should print In Bloom
select label from templates where id = 'cinematic';
