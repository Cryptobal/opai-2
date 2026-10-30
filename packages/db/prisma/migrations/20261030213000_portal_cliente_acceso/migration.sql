-- Brief 16 · Portal Cliente PR 1 (CAR-88): schema `portal_cliente` con el acceso de los contactos de
-- una cuenta cliente a su portal (cuenta + instalaciones habilitadas) y la configuración del portal
-- por cuenta. Migración ADITIVA: solo crea objetos nuevos, sin DROP ni cambios en tablas del Núcleo
-- ni de maestros (las FK apuntan a lo que ya existe en main). Toda tabla con tenant_id lleva RLS
-- `tenant_isolation` (ENABLE + FORCE) para opai_app, que es NOBYPASSRLS. Sin migración de datos.
BEGIN;
SET LOCAL lock_timeout = '5s';

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "portal_cliente";

-- CreateTable
CREATE TABLE "portal_cliente"."accesos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "cuenta_id" UUID NOT NULL,
    "contacto_id" UUID,
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "todas_instalaciones" BOOLEAN NOT NULL DEFAULT false,
    "creado_por" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "accesos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "accesos_estado_check" CHECK ("estado" IN ('activo', 'suspendido', 'revocado'))
);

-- CreateTable
CREATE TABLE "portal_cliente"."acceso_instalaciones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "acceso_id" UUID NOT NULL,
    "instalacion_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "acceso_instalaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portal_cliente"."config_cuentas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "cuenta_id" UUID NOT NULL,
    "tipos_documento_visibles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "secciones_visibles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "muestra_foto_guardias" BOOLEAN NOT NULL DEFAULT true,
    "muestra_rut_guardias" BOOLEAN NOT NULL DEFAULT true,
    "rut_en_reportes" TEXT NOT NULL DEFAULT 'omitido',
    "gestiona_listas" BOOLEAN NOT NULL DEFAULT true,
    "destinatarios_informe" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "actualizado_por" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "config_cuentas_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "config_cuentas_rut_en_reportes_check" CHECK ("rut_en_reportes" IN ('omitido', 'incluido'))
);

-- CreateIndex
CREATE UNIQUE INDEX "accesos_tenant_id_membership_id_key" ON "portal_cliente"."accesos"("tenant_id", "membership_id");
CREATE INDEX "accesos_tenant_id_cuenta_id_idx" ON "portal_cliente"."accesos"("tenant_id", "cuenta_id");
CREATE UNIQUE INDEX "acceso_instalaciones_acceso_id_instalacion_id_key" ON "portal_cliente"."acceso_instalaciones"("acceso_id", "instalacion_id");
CREATE INDEX "acceso_instalaciones_tenant_id_instalacion_id_idx" ON "portal_cliente"."acceso_instalaciones"("tenant_id", "instalacion_id");
CREATE UNIQUE INDEX "config_cuentas_tenant_id_cuenta_id_key" ON "portal_cliente"."config_cuentas"("tenant_id", "cuenta_id");

-- AddForeignKey
ALTER TABLE "portal_cliente"."accesos" ADD CONSTRAINT "accesos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "portal_cliente"."accesos" ADD CONSTRAINT "accesos_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "core"."memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "portal_cliente"."accesos" ADD CONSTRAINT "accesos_cuenta_id_fkey" FOREIGN KEY ("cuenta_id") REFERENCES "core"."cuentas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "portal_cliente"."accesos" ADD CONSTRAINT "accesos_contacto_id_fkey" FOREIGN KEY ("contacto_id") REFERENCES "core"."contactos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "portal_cliente"."acceso_instalaciones" ADD CONSTRAINT "acceso_instalaciones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "portal_cliente"."acceso_instalaciones" ADD CONSTRAINT "acceso_instalaciones_acceso_id_fkey" FOREIGN KEY ("acceso_id") REFERENCES "portal_cliente"."accesos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "portal_cliente"."acceso_instalaciones" ADD CONSTRAINT "acceso_instalaciones_instalacion_id_fkey" FOREIGN KEY ("instalacion_id") REFERENCES "core"."instalaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "portal_cliente"."config_cuentas" ADD CONSTRAINT "config_cuentas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "portal_cliente"."config_cuentas" ADD CONSTRAINT "config_cuentas_cuenta_id_fkey" FOREIGN KEY ("cuenta_id") REFERENCES "core"."cuentas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Permisos del rol de aplicación sobre el schema nuevo (REGLAS-codigo.md)
GRANT USAGE ON SCHEMA "portal_cliente" TO opai_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "portal_cliente" TO opai_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "portal_cliente" TO opai_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA "portal_cliente" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO opai_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA "portal_cliente" GRANT USAGE, SELECT ON SEQUENCES TO opai_app;

-- Row-Level Security: una política `tenant_isolation` por tabla, para opai_app (NOBYPASSRLS).
ALTER TABLE "portal_cliente"."accesos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "portal_cliente"."accesos" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "portal_cliente"."accesos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "portal_cliente"."acceso_instalaciones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "portal_cliente"."acceso_instalaciones" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "portal_cliente"."acceso_instalaciones" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "portal_cliente"."config_cuentas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "portal_cliente"."config_cuentas" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "portal_cliente"."config_cuentas" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- Referencias dentro del mismo tenant (trigger del núcleo `core.verificar_mismo_tenant`): las FK de
-- Postgres no pasan por RLS. Un acceso solo une una membresía, una cuenta y un contacto de su empresa,
-- y una instalación habilitada es de la misma empresa; la que sea de OTRA cuenta de la misma empresa
-- la rechaza el trigger propio de abajo (aislamiento entre cuentas; su nombre `zz_` lo hace disparar
-- DESPUÉS de mismo_tenant, para que una referencia de otra empresa falle como tal).
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "portal_cliente"."accesos"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('membership_id', 'core.memberships', 'cuenta_id', 'core.cuentas', 'contacto_id', 'core.contactos');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "portal_cliente"."acceso_instalaciones"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('acceso_id', 'portal_cliente.accesos', 'instalacion_id', 'core.instalaciones');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "portal_cliente"."config_cuentas"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('cuenta_id', 'core.cuentas');

-- Una instalación habilitada pertenece a la cuenta del acceso (no a otra cuenta de la misma empresa).
CREATE FUNCTION "portal_cliente"."verificar_instalacion_de_la_cuenta"() RETURNS trigger
  LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM "portal_cliente"."accesos" a
      JOIN "core"."instalaciones" i ON i."cuenta_id" = a."cuenta_id"
     WHERE a."id" = NEW."acceso_id" AND i."id" = NEW."instalacion_id"
  ) THEN
    RAISE EXCEPTION 'La instalación no pertenece a la cuenta del acceso al portal'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER zz_instalacion_de_la_cuenta BEFORE INSERT OR UPDATE ON "portal_cliente"."acceso_instalaciones"
  FOR EACH ROW EXECUTE FUNCTION "portal_cliente"."verificar_instalacion_de_la_cuenta"();

COMMIT;

-- Reversión (manual, con el rol propietario, en una transacción): sin datos de negocio que migrar
-- (el schema es nuevo), basta con:
--   DROP SCHEMA "portal_cliente" CASCADE;
-- Elimina las 3 tablas, la función de verificación, sus índices, FKs, triggers y la política
-- tenant_isolation de cada una, y revoca los GRANT/ALTER DEFAULT PRIVILEGES al desaparecer el schema.
-- Exige haber revertido antes el código del módulo (manifest y capacidades `portal_cliente.*`) para
-- que nada siga escribiendo ahí.
