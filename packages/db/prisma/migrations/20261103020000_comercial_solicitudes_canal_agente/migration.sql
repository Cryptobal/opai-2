-- Canal agente (GrowthBot): campos de enriquecimiento, trazabilidad de la API key y campos propuestos
-- por el agente. ADITIVA e idempotente; no toca el endpoint público del formulario web (PR 2 paralelo).

BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "comercial"."solicitudes"
  ADD COLUMN IF NOT EXISTS "fuente" TEXT,
  ADD COLUMN IF NOT EXISTS "notas_agente" TEXT,
  ADD COLUMN IF NOT EXISTS "registrada_por_api_key_id" UUID,
  ADD COLUMN IF NOT EXISTS "campos_propuestos_agente" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

DO $$ BEGIN
  ALTER TABLE "comercial"."solicitudes"
    ADD CONSTRAINT "solicitudes_registrada_por_api_key_id_fkey"
    FOREIGN KEY ("registrada_por_api_key_id") REFERENCES "core"."api_keys"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMIT;

-- Reversión:
-- ALTER TABLE "comercial"."solicitudes" DROP CONSTRAINT IF EXISTS "solicitudes_registrada_por_api_key_id_fkey";
-- ALTER TABLE "comercial"."solicitudes"
--   DROP COLUMN IF EXISTS "campos_propuestos_agente",
--   DROP COLUMN IF EXISTS "registrada_por_api_key_id",
--   DROP COLUMN IF EXISTS "notas_agente",
--   DROP COLUMN IF EXISTS "fuente";
