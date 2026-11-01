-- Brief 15 · Portal Trabajador PR 2: detalle y campos en solicitudes ARCO del titular (origen portal).
-- Aditiva: columnas nullable en core.solicitudes_arco. RLS sin cambios.

BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "core"."solicitudes_arco"
  ADD COLUMN IF NOT EXISTS "detalle" TEXT,
  ADD COLUMN IF NOT EXISTS "campos" JSONB;

COMMIT;

-- Reversión (manual): las columnas pueden tener datos de solicitudes del portal; avisar antes de borrar.
--   BEGIN; SET LOCAL lock_timeout = '5s';
--   ALTER TABLE "core"."solicitudes_arco" DROP COLUMN IF EXISTS "campos";
--   ALTER TABLE "core"."solicitudes_arco" DROP COLUMN IF EXISTS "detalle";
--   COMMIT;
