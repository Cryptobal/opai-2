-- Push nativo (app Capacitor): tipo web | nativa, token FCM/APNs. Aditivo sobre CAR-356 PR 4a. RLS sin cambios.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TYPE "core"."PushSuscripcionTipo" AS ENUM ('web', 'nativa');
CREATE TYPE "core"."PlataformaPush" AS ENUM ('ios', 'android');

ALTER TABLE "core"."suscripciones_push"
  ADD COLUMN "tipo" "core"."PushSuscripcionTipo" NOT NULL DEFAULT 'web',
  ADD COLUMN "token" TEXT,
  ADD COLUMN "plataforma" "core"."PlataformaPush";

ALTER TABLE "core"."suscripciones_push" ALTER COLUMN "endpoint" DROP NOT NULL;

CREATE UNIQUE INDEX "suscripciones_push_tenant_id_token_key"
  ON "core"."suscripciones_push" ("tenant_id", "token");

COMMIT;

-- Reversión (manual): antes de `endpoint SET NOT NULL`, borrar filas nativas (`tipo = 'nativa'`) o backfill de endpoint.
-- DROP INDEX IF EXISTS "core"."suscripciones_push_tenant_id_token_key";
-- ALTER TABLE "core"."suscripciones_push" DROP COLUMN "plataforma", DROP COLUMN "token", DROP COLUMN "tipo";
-- ALTER TABLE "core"."suscripciones_push" ALTER COLUMN "endpoint" SET NOT NULL;
-- DROP TYPE "core"."PlataformaPush";
-- DROP TYPE "core"."PushSuscripcionTipo";