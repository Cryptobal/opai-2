-- CAR-614: lotes de reversa de pago (rendiciones pagadas → aprobadas con aprobación humana).
-- Migración aditiva sobre lotes_pago; no migra filas existentes.

BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "rendiciones"."lotes_pago" ADD COLUMN "es_reversa" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "rendiciones"."lotes_pago" ADD COLUMN "aplicado_por_id" UUID;
ALTER TABLE "rendiciones"."lotes_pago" ADD COLUMN "aplicado_en" TIMESTAMPTZ(6);
ALTER TABLE "rendiciones"."lotes_pago" ADD COLUMN "motivo_reversa" TEXT;

ALTER TABLE "rendiciones"."lotes_pago" DROP CONSTRAINT IF EXISTS "lotes_pago_estado_chk";
ALTER TABLE "rendiciones"."lotes_pago" ADD CONSTRAINT "lotes_pago_estado_chk"
  CHECK ("estado" IN ('borrador', 'aprobado', 'generado', 'pagado', 'anulado', 'aplicado'));

ALTER TABLE "rendiciones"."lotes_pago" ADD CONSTRAINT "lotes_pago_reversa_estado_chk"
  CHECK (NOT "es_reversa" OR "estado" IN ('borrador', 'aprobado', 'aplicado', 'anulado'));

ALTER TABLE "rendiciones"."lotes_pago" ADD CONSTRAINT "lotes_pago_aplicado_chk"
  CHECK ("estado" <> 'aplicado' OR ("es_reversa" AND "aplicado_en" IS NOT NULL AND "aplicado_por_id" IS NOT NULL AND "motivo_reversa" IS NOT NULL));

ALTER TABLE "rendiciones"."lotes_pago"
  ADD CONSTRAINT "lotes_pago_aplicado_por_id_fkey"
  FOREIGN KEY ("aplicado_por_id") REFERENCES "core"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "rendiciones"."lote_pago_estado_final"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.estado IN ('pagado', 'anulado', 'aplicado') AND NEW.estado IS DISTINCT FROM OLD.estado THEN
    RAISE EXCEPTION 'Un lote % no cambia de estado', OLD.estado USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

COMMIT;

-- Reversión: quitar columnas y constraints de reversa y restaurar el CHECK de estado anterior;
-- si ya hay lotes con es_reversa o estado aplicado, no se deshace en caliente: restaurar desde el
-- snapshot previo de Neon (docs/2.0/migraciones.md).