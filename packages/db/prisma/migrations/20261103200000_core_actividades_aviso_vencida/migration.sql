-- Plantilla de migración de OPAI 2.0 (CAR-47). Reglas en docs/2.0/migraciones.md.
--
-- Qué hace y por qué: CAR-162 (Actividad y tareas). Marca en cada tarea cuándo se emitió el aviso de
-- tarea vencida, para que el trabajo diario lo emita una sola vez por vencimiento (posponer lo limpia).
-- Además guarda el resultado de una llamada o correo registrado (contestó, no contestó, pidió volver
-- a llamar), que pide el diseño del compositor. Columnas nullable y un índice parcial: aditiva, sin reescritura de la tabla ni datos que migrar.
-- Tablas con tenant_id: core.actividades ya tiene RLS + FORCE + tenant_isolation (sin cambios).
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "core"."actividades" ADD COLUMN IF NOT EXISTS "aviso_vencida_en" TIMESTAMPTZ(6);
ALTER TABLE "core"."actividades" ADD COLUMN IF NOT EXISTS "resultado" TEXT;

CREATE INDEX IF NOT EXISTS "actividades_tareas_por_avisar_idx"
  ON "core"."actividades" ("tenant_id", "vencimiento")
  WHERE "tipo" = 'tarea' AND "estado" = 'pendiente' AND "aviso_vencida_en" IS NULL;

COMMIT;

-- Reversión: DROP INDEX IF EXISTS "core"."actividades_tareas_por_avisar_idx";
-- ALTER TABLE "core"."actividades" DROP COLUMN IF EXISTS "resultado";
-- ALTER TABLE "core"."actividades" DROP COLUMN IF EXISTS "aviso_vencida_en";
