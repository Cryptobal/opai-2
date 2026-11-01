-- Brief 15 · Portal Trabajador PR 1: schema `portal_trabajador` y `preferencias_notificacion`
-- (preferencias de aviso de la propia persona). Migración ADITIVA: solo crea objetos nuevos, sin
-- tocar tablas del Núcleo ni de maestros (solo FK hacia core.tenants y core.personas). La tabla
-- lleva RLS `tenant_isolation` (ENABLE + FORCE) para opai_app, que es NOBYPASSRLS, y el trigger de
-- mismo tenant sobre persona_id. No migra datos.

BEGIN;
SET LOCAL lock_timeout = '5s';

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "portal_trabajador";
GRANT USAGE ON SCHEMA "portal_trabajador" TO opai_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA "portal_trabajador" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO opai_app;

-- CreateTable
CREATE TABLE "portal_trabajador"."preferencias_notificacion" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "persona_id" UUID NOT NULL,
    "preferencias" JSONB NOT NULL,
    "silencio_desde" TEXT,
    "silencio_hasta" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "preferencias_notificacion_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "preferencias_notificacion_silencio_check" CHECK (
      ("silencio_desde" IS NULL) = ("silencio_hasta" IS NULL)
      AND ("silencio_desde" IS NULL OR ("silencio_desde" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "silencio_hasta" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'))
    )
);

-- Una fila por persona y empresa.
CREATE UNIQUE INDEX "preferencias_notificacion_tenant_id_persona_id_key"
    ON "portal_trabajador"."preferencias_notificacion"("tenant_id", "persona_id");

-- AddForeignKey
ALTER TABLE "portal_trabajador"."preferencias_notificacion"
    ADD CONSTRAINT "preferencias_notificacion_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "portal_trabajador"."preferencias_notificacion"
    ADD CONSTRAINT "preferencias_notificacion_persona_id_fkey"
    FOREIGN KEY ("persona_id") REFERENCES "core"."personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

GRANT SELECT, INSERT, UPDATE, DELETE ON "portal_trabajador"."preferencias_notificacion" TO opai_app;

-- Row-Level Security: una política `tenant_isolation` para opai_app (NOBYPASSRLS).
ALTER TABLE "portal_trabajador"."preferencias_notificacion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "portal_trabajador"."preferencias_notificacion" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "portal_trabajador"."preferencias_notificacion" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- La persona debe ser del mismo tenant (trigger del núcleo `core.verificar_mismo_tenant`).
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "portal_trabajador"."preferencias_notificacion"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('persona_id', 'core.personas');

COMMIT;

-- Reversión (manual, solo referencia): la tabla es nueva y solo guarda preferencias; no hay datos
-- de negocio que conservar. Con lock_timeout corto:
--   BEGIN; SET LOCAL lock_timeout = '5s';
--   DROP TABLE "portal_trabajador"."preferencias_notificacion";
--   DROP SCHEMA "portal_trabajador";
--   COMMIT;
