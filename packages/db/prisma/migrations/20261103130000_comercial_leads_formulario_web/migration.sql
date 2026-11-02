-- Brief 07 · Leads PR 2: formulario web por tenant (token hash, UTM y origen en solicitudes).
-- ADITIVA e IDEMPOTENTE: solo agrega columnas e índices; no toca datos existentes.

BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "comercial"."canales_solicitud"
  ADD COLUMN IF NOT EXISTS "token_hash" TEXT,
  ADD COLUMN IF NOT EXISTS "token_sufijo" TEXT,
  ADD COLUMN IF NOT EXISTS "token_creado_en" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "ultima_solicitud_en" TIMESTAMPTZ(6);

ALTER TABLE "comercial"."solicitudes"
  ADD COLUMN IF NOT EXISTS "utm_source" TEXT,
  ADD COLUMN IF NOT EXISTS "utm_medium" TEXT,
  ADD COLUMN IF NOT EXISTS "utm_campaign" TEXT,
  ADD COLUMN IF NOT EXISTS "utm_content" TEXT,
  ADD COLUMN IF NOT EXISTS "utm_term" TEXT,
  ADD COLUMN IF NOT EXISTS "pagina_origen" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "canales_solicitud_token_hash_key"
  ON "comercial"."canales_solicitud"("token_hash")
  WHERE "token_hash" IS NOT NULL;

COMMIT;

-- Reversión (manual, con el rol propietario, en una transacción):
--   DROP INDEX IF EXISTS "comercial"."canales_solicitud_token_hash_key";
--   ALTER TABLE "comercial"."solicitudes"
--     DROP COLUMN IF EXISTS "pagina_origen",
--     DROP COLUMN IF EXISTS "utm_term",
--     DROP COLUMN IF EXISTS "utm_content",
--     DROP COLUMN IF EXISTS "utm_campaign",
--     DROP COLUMN IF EXISTS "utm_medium",
--     DROP COLUMN IF EXISTS "utm_source";
--   ALTER TABLE "comercial"."canales_solicitud"
--     DROP COLUMN IF EXISTS "ultima_solicitud_en",
--     DROP COLUMN IF EXISTS "token_creado_en",
--     DROP COLUMN IF EXISTS "token_sufijo",
--     DROP COLUMN IF EXISTS "token_hash";
