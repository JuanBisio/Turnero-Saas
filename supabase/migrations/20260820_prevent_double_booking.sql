-- Prevent double-booking: reject overlapping appointments for the same
-- professional at the database level. Today only the availability query
-- checks for collisions, so two near-simultaneous requests for the same
-- slot both pass that check and both inserts succeed. This constraint
-- closes that race by making Postgres itself reject the second insert.
--
-- IMPORTANT: run this check BEFORE applying the migration. If it returns
-- any rows, resolve those overlaps manually first or the ALTER TABLE below
-- will fail with "conflicting key value violates exclusion constraint":
--
--   SELECT a.id, b.id
--   FROM appointments a
--   JOIN appointments b ON a.professional_id = b.professional_id
--     AND a.id < b.id
--     AND tstzrange(a.start_time, a.end_time) && tstzrange(b.start_time, b.end_time)
--   WHERE a.status <> 'cancelado' AND b.status <> 'cancelado';

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_no_overlap
  EXCLUDE USING gist (
    professional_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  )
  WHERE (status <> 'cancelado');
