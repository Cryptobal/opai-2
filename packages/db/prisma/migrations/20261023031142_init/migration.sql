-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "core";

-- CreateTable
CREATE TABLE "core"."tenants" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "vertical" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Santiago',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."audit_events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "actor_type" TEXT NOT NULL,
    "actor_id" TEXT,
    "via_user_id" TEXT,
    "capability" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "payload" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "core"."tenants"("slug");

-- CreateIndex
CREATE INDEX "audit_events_tenant_id_created_at_idx" ON "core"."audit_events"("tenant_id", "created_at");

-- AddForeignKey
ALTER TABLE "core"."audit_events" ADD CONSTRAINT "audit_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- SQL manual (ADR-002): rol de aplicación y Row-Level Security.
-- Toda tabla con tenant_id que se agregue en migraciones futuras debe repetir el bloque
-- ENABLE ROW LEVEL SECURITY + CREATE POLICY tenant_isolation (ver CLAUDE.md).
-- ---------------------------------------------------------------------------

-- Rol de aplicación: sin BYPASSRLS ni privilegios de propietario. La contraseña se fija aparte
-- (pnpm --filter @opai/db role:password) y nunca se escribe en archivos versionados.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'opai_app') THEN
    CREATE ROLE opai_app LOGIN NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA "core" TO opai_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "core" TO opai_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "core" TO opai_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA "core" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO opai_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA "core" GRANT USAGE, SELECT ON SEQUENCES TO opai_app;

-- Aislamiento por tenant. ENABLE (no FORCE): el rol propietario se usa solo para migraciones,
-- importaciones y seeds; la aplicación siempre se conecta como opai_app, que no puede saltarse la RLS.
-- `tenants` no lleva tenant_id (es el tenant): se protege por permisos de aplicación.
ALTER TABLE "core"."audit_events" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."audit_events"
  AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
