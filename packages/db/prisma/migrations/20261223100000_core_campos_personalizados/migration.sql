-- CAR-27 · Campos personalizados por empresa en cuentas, contactos y negocios.
-- Migración ADITIVA e IDEMPOTENTE: crea `core.campos_personalizados` y `core.campo_valores` con sus
-- índices, FK, checks, RLS (ENABLE + FORCE) y el trigger de mismo tenant. No toca tablas ni datos
-- existentes.

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE IF NOT EXISTS "core"."campos_personalizados" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "entidad" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "etiqueta" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "opciones" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "obligatorio" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "campos_personalizados_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "campos_personalizados_entidad_check" CHECK ("entidad" IN ('cuenta', 'contacto', 'negocio')),
    CONSTRAINT "campos_personalizados_tipo_check"
      CHECK ("tipo" IN ('texto', 'numero', 'fecha', 'lista', 'si_no')),
    CONSTRAINT "campos_personalizados_clave_check" CHECK ("clave" ~ '^[a-z][a-z0-9_]{0,39}$'),
    CONSTRAINT "campos_personalizados_etiqueta_check" CHECK (length(btrim("etiqueta")) BETWEEN 1 AND 60),
    -- Una lista necesita al menos una opción.
    CONSTRAINT "campos_personalizados_lista_check"
      CHECK ("tipo" <> 'lista' OR cardinality("opciones") > 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS "campos_personalizados_tenant_id_entidad_clave_key"
    ON "core"."campos_personalizados"("tenant_id", "entidad", "clave");
CREATE INDEX IF NOT EXISTS "campos_personalizados_tenant_id_entidad_orden_idx"
    ON "core"."campos_personalizados"("tenant_id", "entidad", "orden");

CREATE TABLE IF NOT EXISTS "core"."campo_valores" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "campo_id" UUID NOT NULL,
    "cuenta_id" UUID,
    "contacto_id" UUID,
    "negocio_id" UUID,
    "valor" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "campo_valores_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "campo_valores_una_entidad_check"
      CHECK (num_nonnulls("cuenta_id", "contacto_id", "negocio_id") = 1)
);
CREATE INDEX IF NOT EXISTS "campo_valores_tenant_id_cuenta_id_idx"
    ON "core"."campo_valores"("tenant_id", "cuenta_id");
CREATE INDEX IF NOT EXISTS "campo_valores_tenant_id_contacto_id_idx"
    ON "core"."campo_valores"("tenant_id", "contacto_id");
CREATE INDEX IF NOT EXISTS "campo_valores_tenant_id_negocio_id_idx"
    ON "core"."campo_valores"("tenant_id", "negocio_id");
CREATE UNIQUE INDEX IF NOT EXISTS "campo_valores_cuenta_unico"
    ON "core"."campo_valores"("campo_id", "cuenta_id") WHERE "cuenta_id" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "campo_valores_contacto_unico"
    ON "core"."campo_valores"("campo_id", "contacto_id") WHERE "contacto_id" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "campo_valores_negocio_unico"
    ON "core"."campo_valores"("campo_id", "negocio_id") WHERE "negocio_id" IS NOT NULL;

DO $$ BEGIN
  ALTER TABLE "core"."campos_personalizados" ADD CONSTRAINT "campos_personalizados_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "core"."campo_valores" ADD CONSTRAINT "campo_valores_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "core"."campo_valores" ADD CONSTRAINT "campo_valores_campo_id_fkey"
    FOREIGN KEY ("campo_id") REFERENCES "core"."campos_personalizados"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "core"."campo_valores" ADD CONSTRAINT "campo_valores_cuenta_id_fkey"
    FOREIGN KEY ("cuenta_id") REFERENCES "core"."cuentas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "core"."campo_valores" ADD CONSTRAINT "campo_valores_contacto_id_fkey"
    FOREIGN KEY ("contacto_id") REFERENCES "core"."contactos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "core"."campo_valores" ADD CONSTRAINT "campo_valores_negocio_id_fkey"
    FOREIGN KEY ("negocio_id") REFERENCES "comercial"."negocios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Permisos y Row-Level Security: una política `tenant_isolation` para opai_app (NOBYPASSRLS), con FORCE.
GRANT SELECT, INSERT, UPDATE, DELETE ON "core"."campos_personalizados" TO opai_app;
ALTER TABLE "core"."campos_personalizados" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."campos_personalizados" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "core"."campos_personalizados";
CREATE POLICY tenant_isolation ON "core"."campos_personalizados" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "core"."campo_valores" TO opai_app;
ALTER TABLE "core"."campo_valores" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."campo_valores" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "core"."campo_valores";
CREATE POLICY tenant_isolation ON "core"."campo_valores" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- Referencias dentro del mismo tenant (las FK de Postgres no pasan por RLS).
DROP TRIGGER IF EXISTS mismo_tenant ON "core"."campo_valores";
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."campo_valores"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'campo_id', 'core.campos_personalizados', 'cuenta_id', 'core.cuentas',
    'contacto_id', 'core.contactos', 'negocio_id', 'comercial.negocios');

COMMIT;
