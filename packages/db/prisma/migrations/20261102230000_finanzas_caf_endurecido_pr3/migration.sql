-- Finanzas · CAF endurecido PR 3 (CAR-143): fecha corte 1.0, metadatos de CAF y solape de rangos.

BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "finanzas"."dte_config"
  ADD COLUMN IF NOT EXISTS "fecha_corte_1_0" DATE;

ALTER TABLE "finanzas"."dte_folios"
  ADD COLUMN IF NOT EXISTS "caf_autorizado_en" DATE,
  ADD COLUMN IF NOT EXISTS "caf_idk" TEXT;

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "finanzas"."dte_folios"
  ADD COLUMN IF NOT EXISTS "folio_rango" int4range
  GENERATED ALWAYS AS (int4range("folio_desde", "folio_hasta", '[]')) STORED;

ALTER TABLE "finanzas"."dte_folios"
  ADD CONSTRAINT "dte_folios_rango_sin_solape"
  EXCLUDE USING gist (
    "tenant_id" WITH =,
    "tipo_dte" WITH =,
    "folio_rango" WITH &&
  );

COMMIT;

-- Reversión (manual, rol propietario):
--   ALTER TABLE "finanzas"."dte_folios" DROP CONSTRAINT IF EXISTS "dte_folios_rango_sin_solape";
--   ALTER TABLE "finanzas"."dte_folios" DROP COLUMN IF EXISTS "folio_rango";
--   ALTER TABLE "finanzas"."dte_folios" DROP COLUMN IF EXISTS "caf_idk";
--   ALTER TABLE "finanzas"."dte_folios" DROP COLUMN IF EXISTS "caf_autorizado_en";
--   ALTER TABLE "finanzas"."dte_config" DROP COLUMN IF EXISTS "fecha_corte_1_0";
