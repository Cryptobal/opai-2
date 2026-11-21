-- Central · CAR-751: cadena desactivable y franja nocturna en ajustes (sin datos nuevos).
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "central"."cadenas"
  ADD COLUMN IF NOT EXISTS "activa" BOOLEAN NOT NULL DEFAULT true;

COMMIT;