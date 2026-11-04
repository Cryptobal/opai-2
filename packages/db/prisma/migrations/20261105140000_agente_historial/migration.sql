-- Qué hace y por qué: CAR-120 PR 5c. Agrega el control de concurrencia optimista de las conversaciones
-- del agente (`version`: dos pestañas ya no se pisan los mensajes) y un índice por empresa y fecha para
-- el barrido diario de las vencidas. ADITIVA: una columna con valor por defecto constante y un índice;
-- la tabla ya tiene RLS `tenant_isolation` + FORCE (migración 20261105130000). Sin backfill.

BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "core"."agente_conversaciones" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "agente_conversaciones_tenant_id_ultima_actividad_idx"
  ON "core"."agente_conversaciones"("tenant_id", "ultima_actividad");

COMMIT;

-- Reversión: la columna y el índice son inertes sin el código nuevo; solo si hiciera falta:
-- BEGIN;
-- SET LOCAL lock_timeout = '5s';
-- DROP INDEX IF EXISTS "core"."agente_conversaciones_tenant_id_ultima_actividad_idx";
-- ALTER TABLE "core"."agente_conversaciones" DROP COLUMN IF EXISTS "version";
-- COMMIT;
