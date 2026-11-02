-- Finanzas · CAF endurecido PR 3 (CAR-143): fecha corte 1.0 y metadatos de CAF en folios.

BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "finanzas"."dte_config"
  ADD COLUMN IF NOT EXISTS "fecha_corte_1_0" DATE;

ALTER TABLE "finanzas"."dte_folios"
  ADD COLUMN IF NOT EXISTS "caf_autorizado_en" DATE,
  ADD COLUMN IF NOT EXISTS "caf_idk" TEXT;

COMMIT;

-- Reversión (manual, rol propietario):
--   ALTER TABLE "finanzas"."dte_folios" DROP COLUMN IF EXISTS "caf_idk";
--   ALTER TABLE "finanzas"."dte_folios" DROP COLUMN IF EXISTS "caf_autorizado_en";
--   ALTER TABLE "finanzas"."dte_config" DROP COLUMN IF EXISTS "fecha_corte_1_0";
