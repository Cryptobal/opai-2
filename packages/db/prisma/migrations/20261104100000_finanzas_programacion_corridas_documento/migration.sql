-- Qué hace y por qué: CAR-159 (BRIEF-26). La corrida de una programación guarda el borrador que generó,
-- la fecha de generación, la UF usada y el total. ADITIVA: columnas nulas y una FK.
-- La tabla ya tiene RLS FORCE y su política; el trigger mismo_tenant se reemplaza para
-- validar también el documento.

BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "finanzas"."ventas_programaciones_corridas"
  ADD COLUMN "documento_id" UUID,
  ADD COLUMN "fecha_generacion" DATE,
  ADD COLUMN "uf_centavos" BIGINT,
  ADD COLUMN "monto_total" BIGINT;

ALTER TABLE "finanzas"."ventas_programaciones_corridas"
  ADD CONSTRAINT "ventas_programaciones_corridas_documento_id_fkey"
  FOREIGN KEY ("documento_id") REFERENCES "finanzas"."documentos_emitidos"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "ventas_programaciones_corridas_documento_id_idx"
  ON "finanzas"."ventas_programaciones_corridas" ("documento_id");

DROP TRIGGER IF EXISTS mismo_tenant ON "finanzas"."ventas_programaciones_corridas";
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "finanzas"."ventas_programaciones_corridas"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'programacion_id', 'finanzas.ventas_programaciones', 'documento_id', 'finanzas.documentos_emitidos');

COMMIT;

-- Reversión: DROP TRIGGER mismo_tenant ON "finanzas"."ventas_programaciones_corridas"; recrearlo solo
-- con ('programacion_id', 'finanzas.ventas_programaciones'); DROP INDEX
-- "finanzas"."ventas_programaciones_corridas_documento_id_idx"; DROP CONSTRAINT
-- "ventas_programaciones_corridas_documento_id_fkey"; DROP COLUMN documento_id, fecha_generacion,
-- uf_centavos y monto_total. Las columnas son nulas: no hay datos que restaurar.
