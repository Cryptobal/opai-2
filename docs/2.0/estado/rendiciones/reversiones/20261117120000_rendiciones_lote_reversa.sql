-- CAR-614: reversión manual de DDL antes del primer uso; no ejecutar en una base activa.
-- Si hay cualquier lote de reversa, abortar y usar el procedimiento de snapshot aprobado.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL row_security = off;
LOCK TABLE "rendiciones"."lotes_pago" IN ACCESS EXCLUSIVE MODE;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "rendiciones"."lotes_pago"
    WHERE "es_reversa" OR "estado" = 'aplicado' OR "aplicado_por_id" IS NOT NULL
      OR "aplicado_en" IS NOT NULL OR "motivo_reversa" IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'CAR-614: existen datos de reversa; no deshacer DDL en caliente.';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION "rendiciones"."lote_pago_estado_final"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.estado IN ('pagado', 'anulado') AND NEW.estado IS DISTINCT FROM OLD.estado THEN
    RAISE EXCEPTION 'Un lote % no cambia de estado', OLD.estado USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

ALTER TABLE "rendiciones"."lotes_pago"
  DROP CONSTRAINT "lotes_pago_aplicado_chk",
  DROP CONSTRAINT "lotes_pago_reversa_estado_chk",
  DROP CONSTRAINT "lotes_pago_aplicado_por_id_fkey",
  DROP CONSTRAINT "lotes_pago_estado_chk",
  ADD CONSTRAINT "lotes_pago_estado_chk"
    CHECK ("estado" IN ('borrador', 'aprobado', 'generado', 'pagado', 'anulado')),
  DROP COLUMN "es_reversa",
  DROP COLUMN "aplicado_por_id",
  DROP COLUMN "aplicado_en",
  DROP COLUMN "motivo_reversa";
COMMIT;
