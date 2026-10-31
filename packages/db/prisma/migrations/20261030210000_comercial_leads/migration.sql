-- Brief 07 · Leads PR 1: solicitudes entrantes y canales de entrada del módulo Comercial. Migración
-- ADITIVA e IDEMPOTENTE: solo crea las tablas nuevas `comercial.solicitudes` y
-- `comercial.canales_solicitud`, sus índices, FK, checks, RLS (ENABLE + FORCE) y triggers de mismo
-- tenant; no toca tablas existentes ni datos. Los canales por defecto (formulario web y correo «sin
-- conectar», agente y manual «conectado») los crea la capacidad al leer la configuración, no esta migración.

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE IF NOT EXISTS "comercial"."solicitudes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "canal" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'nueva',
    "texto_original" TEXT NOT NULL,
    "asunto" TEXT,
    "nombre" TEXT,
    "empresa" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "rut" TEXT,
    "comuna" TEXT,
    "servicio" TEXT,
    "responsable_id" UUID,
    "registrada_por_tipo" TEXT NOT NULL,
    "registrada_por_id" UUID,
    "motivo_descarte" TEXT,
    "descartada_en" TIMESTAMPTZ(6),
    "convertida_en" TIMESTAMPTZ(6),
    "duplicada_de_id" UUID,
    "negocio_id" UUID,
    "cuenta_id" UUID,
    "contacto_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "solicitudes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "solicitudes_canal_check"
      CHECK ("canal" IN ('formulario_web', 'correo', 'agente', 'manual')),
    CONSTRAINT "solicitudes_estado_check"
      CHECK ("estado" IN ('nueva', 'en_revision', 'convertida', 'descartada')),
    CONSTRAINT "solicitudes_duplicada_propia_check"
      CHECK ("duplicada_de_id" IS NULL OR "duplicada_de_id" <> "id"),
    CONSTRAINT "solicitudes_descartada_motivo_check"
      CHECK ("estado" <> 'descartada' OR ("motivo_descarte" IS NOT NULL AND "descartada_en" IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS "solicitudes_tenant_id_estado_created_at_idx"
    ON "comercial"."solicitudes"("tenant_id", "estado", "created_at");
CREATE INDEX IF NOT EXISTS "solicitudes_tenant_id_canal_idx"
    ON "comercial"."solicitudes"("tenant_id", "canal");
CREATE INDEX IF NOT EXISTS "solicitudes_tenant_id_responsable_id_idx"
    ON "comercial"."solicitudes"("tenant_id", "responsable_id");
CREATE INDEX IF NOT EXISTS "solicitudes_tenant_id_negocio_id_idx"
    ON "comercial"."solicitudes"("tenant_id", "negocio_id");

CREATE TABLE IF NOT EXISTS "comercial"."canales_solicitud" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "canal" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'sin_conectar',
    "dominio_autorizado" TEXT,
    "remitentes_ignorados" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "responsable_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "canales_solicitud_pkey" PRIMARY KEY ("id"),
    -- `canal` va sin CHECK: es parte del único (tenant, canal) y la prueba genérica de dos empresas
    -- regenera las columnas únicas; la lista de canales la valida la capacidad (Zod).
    CONSTRAINT "canales_solicitud_estado_check"
      CHECK ("estado" IN ('sin_conectar', 'conectado', 'revocado'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "canales_solicitud_tenant_id_canal_key"
    ON "comercial"."canales_solicitud"("tenant_id", "canal");

-- Llaves foráneas (idempotentes: solo si faltan).
DO $$ BEGIN
  ALTER TABLE "comercial"."solicitudes" ADD CONSTRAINT "solicitudes_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "comercial"."solicitudes" ADD CONSTRAINT "solicitudes_duplicada_de_id_fkey"
    FOREIGN KEY ("duplicada_de_id") REFERENCES "comercial"."solicitudes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "comercial"."solicitudes" ADD CONSTRAINT "solicitudes_negocio_id_fkey"
    FOREIGN KEY ("negocio_id") REFERENCES "comercial"."negocios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "comercial"."canales_solicitud" ADD CONSTRAINT "canales_solicitud_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON "comercial"."solicitudes" TO opai_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "comercial"."canales_solicitud" TO opai_app;

-- Row-Level Security: una política `tenant_isolation` para opai_app (NOBYPASSRLS), con FORCE.
ALTER TABLE "comercial"."solicitudes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "comercial"."solicitudes" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "comercial"."solicitudes";
CREATE POLICY tenant_isolation ON "comercial"."solicitudes" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "comercial"."canales_solicitud" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "comercial"."canales_solicitud" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "comercial"."canales_solicitud";
CREATE POLICY tenant_isolation ON "comercial"."canales_solicitud" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- Referencias dentro del mismo tenant (las FK de Postgres no pasan por RLS).
DROP TRIGGER IF EXISTS mismo_tenant ON "comercial"."solicitudes";
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "comercial"."solicitudes"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'duplicada_de_id', 'comercial.solicitudes', 'negocio_id', 'comercial.negocios',
    'cuenta_id', 'core.cuentas', 'contacto_id', 'core.contactos');

COMMIT;

-- Reversión (manual, con el rol propietario, en una transacción):
--   DROP TABLE "comercial"."solicitudes" CASCADE;
--   DROP TABLE "comercial"."canales_solicitud" CASCADE;
-- Elimina las tablas con sus índices, checks, FK, triggers y políticas tenant_isolation.
