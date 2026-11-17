-- CAR-506: alcance de listas (empresa, cuenta, instalación, grupo), grupos de instalaciones y autor en la entrada.
-- Migración ADITIVA: tablas nuevas, columnas nuevas; las filas existentes quedan con alcance `instalacion`.

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "acceso"."grupos_lista" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "grupos_lista_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "grupos_lista_tenant_idx" ON "acceso"."grupos_lista"("tenant_id", "nombre");

CREATE TABLE "acceso"."grupos_lista_instalaciones" (
    "tenant_id" UUID NOT NULL,
    "grupo_id" UUID NOT NULL,
    "instalacion_id" UUID NOT NULL,
    CONSTRAINT "grupos_lista_instalaciones_pkey" PRIMARY KEY ("grupo_id", "instalacion_id")
);
CREATE INDEX "grupos_lista_instalaciones_inst_idx" ON "acceso"."grupos_lista_instalaciones"("tenant_id", "instalacion_id");

ALTER TABLE "acceso"."entradas_lista" ADD COLUMN "alcance" TEXT NOT NULL DEFAULT 'instalacion';
ALTER TABLE "acceso"."entradas_lista" ADD COLUMN "cuenta_id" UUID;
ALTER TABLE "acceso"."entradas_lista" ADD COLUMN "grupo_id" UUID;
ALTER TABLE "acceso"."entradas_lista" ADD COLUMN "agregada_por" UUID;
ALTER TABLE "acceso"."entradas_lista" ALTER COLUMN "instalacion_id" DROP NOT NULL;

CREATE INDEX "entradas_lista_cuenta_idx" ON "acceso"."entradas_lista"("tenant_id", "cuenta_id", "doc_tipo", "huella");
CREATE INDEX "entradas_lista_empresa_idx" ON "acceso"."entradas_lista"("tenant_id", "doc_tipo", "huella");

ALTER TABLE "acceso"."grupos_lista" ADD CONSTRAINT "grupos_lista_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "acceso"."grupos_lista_instalaciones" ADD CONSTRAINT "grupos_lista_instalaciones_grupo_fkey"
  FOREIGN KEY ("grupo_id") REFERENCES "acceso"."grupos_lista"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "acceso"."grupos_lista_instalaciones" ADD CONSTRAINT "grupos_lista_instalaciones_instalacion_fkey"
  FOREIGN KEY ("instalacion_id") REFERENCES "core"."instalaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "acceso"."grupos_lista_instalaciones" ADD CONSTRAINT "grupos_lista_instalaciones_tenant_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "acceso"."entradas_lista" ADD CONSTRAINT "entradas_lista_cuenta_fkey"
  FOREIGN KEY ("cuenta_id") REFERENCES "core"."cuentas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "acceso"."entradas_lista" ADD CONSTRAINT "entradas_lista_grupo_fkey"
  FOREIGN KEY ("grupo_id") REFERENCES "acceso"."grupos_lista"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "acceso"."entradas_lista" ADD CONSTRAINT "entradas_lista_agregada_por_fkey"
  FOREIGN KEY ("agregada_por") REFERENCES "core"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

GRANT SELECT, INSERT, UPDATE, DELETE ON "acceso"."grupos_lista" TO opai_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "acceso"."grupos_lista_instalaciones" TO opai_app;
ALTER TABLE "acceso"."grupos_lista" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "acceso"."grupos_lista" FORCE ROW LEVEL SECURITY;
ALTER TABLE "acceso"."grupos_lista_instalaciones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "acceso"."grupos_lista_instalaciones" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "acceso"."grupos_lista" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
CREATE POLICY tenant_isolation ON "acceso"."grupos_lista_instalaciones" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

DROP TRIGGER IF EXISTS mismo_tenant ON "acceso"."entradas_lista";
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "acceso"."entradas_lista" FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
  'instalacion_id', 'core.instalaciones', 'cuenta_id', 'core.cuentas', 'grupo_id', 'acceso.grupos_lista',
  'agregada_por', 'core.users');

CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "acceso"."grupos_lista_instalaciones" FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
  'grupo_id', 'acceso.grupos_lista', 'instalacion_id', 'core.instalaciones');

COMMIT;