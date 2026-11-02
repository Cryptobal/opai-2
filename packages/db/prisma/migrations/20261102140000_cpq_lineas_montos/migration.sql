-- CAR-134 · CPQ PR 10.2b: columnas de línea y margen por sección (aditivo, reversible).
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "cpq"."secciones" ADD COLUMN IF NOT EXISTS "margen_pct" INTEGER;

ALTER TABLE "cpq"."lineas" ADD COLUMN IF NOT EXISTS "patron" TEXT;
ALTER TABLE "cpq"."lineas" ADD COLUMN IF NOT EXISTS "hora_inicio" TEXT;
ALTER TABLE "cpq"."lineas" ADD COLUMN IF NOT EXISTS "hora_fin" TEXT;
ALTER TABLE "cpq"."lineas" ADD COLUMN IF NOT EXISTS "dias_cobertura" INTEGER;
ALTER TABLE "cpq"."lineas" ADD COLUMN IF NOT EXISTS "personas_por_posicion_escaladas" INTEGER;
ALTER TABLE "cpq"."lineas" ADD COLUMN IF NOT EXISTS "personas_motivo" TEXT;
ALTER TABLE "cpq"."lineas" ADD COLUMN IF NOT EXISTS "sueldo_base_clp" INTEGER;
ALTER TABLE "cpq"."lineas" ADD COLUMN IF NOT EXISTS "item_codigo" TEXT;
ALTER TABLE "cpq"."lineas" ADD COLUMN IF NOT EXISTS "cantidad_escalada" INTEGER;
ALTER TABLE "cpq"."lineas" ADD COLUMN IF NOT EXISTS "rateo_json" TEXT;
ALTER TABLE "cpq"."lineas" ADD COLUMN IF NOT EXISTS "precio_unitario_clp" INTEGER;
ALTER TABLE "cpq"."lineas" ADD COLUMN IF NOT EXISTS "margen_propio_pct" INTEGER;
ALTER TABLE "cpq"."lineas" ADD COLUMN IF NOT EXISTS "alcance_dotacion" TEXT;
ALTER TABLE "cpq"."lineas" ADD COLUMN IF NOT EXISTS "huella_juego_valores" TEXT;

COMMIT;

-- Reversión manual (rol propietario):
-- ALTER TABLE "cpq"."lineas" DROP COLUMN IF EXISTS "patron", DROP COLUMN IF EXISTS "hora_inicio", DROP COLUMN IF EXISTS "hora_fin", DROP COLUMN IF EXISTS "dias_cobertura", DROP COLUMN IF EXISTS "personas_por_posicion_escaladas", DROP COLUMN IF EXISTS "personas_motivo", DROP COLUMN IF EXISTS "sueldo_base_clp", DROP COLUMN IF EXISTS "item_codigo", DROP COLUMN IF EXISTS "cantidad_escalada", DROP COLUMN IF EXISTS "rateo_json", DROP COLUMN IF EXISTS "precio_unitario_clp", DROP COLUMN IF EXISTS "margen_propio_pct", DROP COLUMN IF EXISTS "alcance_dotacion", DROP COLUMN IF EXISTS "huella_juego_valores";
-- ALTER TABLE "cpq"."secciones" DROP COLUMN IF EXISTS "margen_pct";
