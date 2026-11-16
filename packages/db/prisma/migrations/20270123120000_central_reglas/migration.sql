-- Central · CAR-469 (Brief 15b · PR 3): reglas de vigilancia por empresa (R1–R6). Migración aditiva,
-- sin datos: una tabla nueva con RLS + FORCE + tenant_isolation. Sin fila rige el catálogo por defecto.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "central"."reglas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "evento" TEXT NOT NULL,
    "severidad" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "reglas_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "reglas_severidad_check" CHECK ("severidad" IN ('critica', 'alta', 'media', 'baja'))
);

CREATE UNIQUE INDEX "reglas_tenant_id_evento_key" ON "central"."reglas"("tenant_id", "evento");
-- Las señales abiertas de una instalación se buscan por instalación y persona al agrupar (R4).
CREATE INDEX "alertas_tenant_instalacion_persona_idx" ON "central"."alertas"("tenant_id", "instalacion_id", "persona_id");

ALTER TABLE "central"."reglas" ADD CONSTRAINT "reglas_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "central"."reglas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "central"."reglas" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "central"."reglas" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "central"."reglas" TO opai_app;

COMMIT;

-- Reversión: DROP TABLE IF EXISTS "central"."reglas"; DROP INDEX IF EXISTS "central"."alertas_tenant_instalacion_persona_idx";
