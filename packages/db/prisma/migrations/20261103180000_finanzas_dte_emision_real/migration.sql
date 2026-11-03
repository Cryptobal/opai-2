-- CAR-154 · resolución SII en dte_config (aditiva).

BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "finanzas"."dte_config"
  ADD COLUMN IF NOT EXISTS "resolucion_sii_numero" INTEGER,
  ADD COLUMN IF NOT EXISTS "resolucion_sii_fecha" DATE;

ALTER TABLE "finanzas"."dte_config" ADD CONSTRAINT "dte_config_resolucion_sii_numero_chk"
  CHECK ("resolucion_sii_numero" IS NULL OR ("resolucion_sii_numero" >= 1 AND "resolucion_sii_numero" <= 999999));

COMMIT;

-- Reversión:
--   ALTER TABLE "finanzas"."dte_config" DROP CONSTRAINT IF EXISTS "dte_config_resolucion_sii_numero_chk";
--   ALTER TABLE "finanzas"."dte_config" DROP COLUMN IF EXISTS "resolucion_sii_fecha", DROP COLUMN IF EXISTS "resolucion_sii_numero";
