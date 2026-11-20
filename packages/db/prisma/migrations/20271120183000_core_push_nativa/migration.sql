-- Push nativo (app Capacitor): tipo web | nativa, token FCM/APNs. Aditivo sobre CAR-356 PR 4a. RLS sin cambios.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TYPE "core"."PushSuscripcionTipo" AS ENUM ('web', 'nativa');

ALTER TABLE "core"."suscripciones_push"
  ADD COLUMN "tipo" "core"."PushSuscripcionTipo" NOT NULL DEFAULT 'web',
  ADD COLUMN "token" TEXT,
  ADD COLUMN "plataforma" TEXT;

ALTER TABLE "core"."suscripciones_push" ALTER COLUMN "endpoint" DROP NOT NULL;

UPDATE "core"."suscripciones_push" SET "tipo" = 'web' WHERE "endpoint" IS NOT NULL;

DROP INDEX IF EXISTS "core"."suscripciones_push_tenant_id_endpoint_key";

CREATE UNIQUE INDEX "suscripciones_push_tenant_endpoint_web"
  ON "core"."suscripciones_push" ("tenant_id", "endpoint")
  WHERE "tipo" = 'web' AND "endpoint" IS NOT NULL;

CREATE UNIQUE INDEX "suscripciones_push_tenant_token_nativa"
  ON "core"."suscripciones_push" ("tenant_id", "token")
  WHERE "tipo" = 'nativa' AND "token" IS NOT NULL;

COMMIT;