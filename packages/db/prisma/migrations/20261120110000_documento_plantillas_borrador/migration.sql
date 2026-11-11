-- CAR-127 · Documentos v4, pantalla 06 «Editor de plantillas» (encargo de Carlos del 11-nov-2026).
-- Qué hace y por qué: el editor guarda un BORRADOR del texto antes de publicarlo como versión nueva
-- (las versiones son inmutables: guardar cada borrador como versión llenaría el historial de textos
-- que nunca rigieron) y fija QUIÉN FIRMA la plantilla (empleador, trabajador o ambos). ADITIVA: cuatro
-- columnas en `core.documento_plantillas`, nulas o con defecto; no crea tablas ni toca filas.
-- La tabla ya tiene RLS + FORCE + tenant_isolation (20261116120000); no cambia.
-- Sin migración de datos: el defecto `ambos` llena las filas existentes en el mismo ALTER, así que el
-- aviso de REGLAS-codigo sobre filas afectadas con FORCE RLS no aplica.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "core"."documento_plantillas"
  ADD COLUMN IF NOT EXISTS "borrador_contenido" TEXT,
  ADD COLUMN IF NOT EXISTS "borrador_actualizado_en" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "borrador_por_nombre" TEXT,
  ADD COLUMN IF NOT EXISTS "firmantes" TEXT NOT NULL DEFAULT 'ambos';

DO $$ BEGIN
  ALTER TABLE "core"."documento_plantillas" ADD CONSTRAINT "documento_plantillas_firmantes_check"
    CHECK ("firmantes" IN ('empleador', 'trabajador', 'ambos'));
  ALTER TABLE "core"."documento_plantillas" ADD CONSTRAINT "documento_plantillas_borrador_check"
    CHECK ("borrador_contenido" IS NULL OR char_length("borrador_contenido") <= 100000);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMIT;

-- Reversión (manual; se pierden los borradores sin publicar y la elección de firmantes):
--   ALTER TABLE "core"."documento_plantillas"
--     DROP CONSTRAINT IF EXISTS "documento_plantillas_borrador_check",
--     DROP CONSTRAINT IF EXISTS "documento_plantillas_firmantes_check",
--     DROP COLUMN IF EXISTS "firmantes",
--     DROP COLUMN IF EXISTS "borrador_por_nombre",
--     DROP COLUMN IF EXISTS "borrador_actualizado_en",
--     DROP COLUMN IF EXISTS "borrador_contenido";
