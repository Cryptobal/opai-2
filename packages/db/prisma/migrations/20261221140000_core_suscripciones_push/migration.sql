-- CAR-356 PR 4a · Aviso al celular (Web Push, ADR-044.4). Decisión de Carlos, 13-nov-2026: el guardia recibe el
-- aviso de su pauta en el portal y en el celular; sin WhatsApp.
--   · core.suscripciones_push: una fila por dispositivo suscrito (endpoint del servicio de push del navegador) de un
--     usuario en una empresa. El aviso viaja sin contenido (solo un «toque»), así que no se guardan claves de
--     cifrado del contenido. Quitar la suscripción borra la fila; un endpoint vencido (404/410) también se borra.
-- El endpoint (https) lo valida la capacidad en el borde (Zod). Tabla con tenant_id: RLS + FORCE + política tenant_isolation. Aditiva, sin datos.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "core"."suscripciones_push" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "endpoint" TEXT NOT NULL,
    "dispositivo" TEXT,
    "ultimo_aviso_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "suscripciones_push_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "suscripciones_push_tenant_id_endpoint_key"
    ON "core"."suscripciones_push"("tenant_id", "endpoint");
CREATE INDEX "suscripciones_push_tenant_id_usuario_id_idx"
    ON "core"."suscripciones_push"("tenant_id", "usuario_id");

ALTER TABLE "core"."suscripciones_push" ADD CONSTRAINT "suscripciones_push_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "core"."suscripciones_push" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."suscripciones_push" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."suscripciones_push" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "core"."suscripciones_push" TO opai_app;

COMMIT;

-- Reversión: DROP TABLE "core"."suscripciones_push"; (tabla nueva sin otras dependencias; se puede restaurar desde
-- el snapshot previo de Neon).
