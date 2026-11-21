-- CAR-553 (Sesión Acceso): fondo y mensaje de bienvenida de la portería por instalación.
-- Migración ADITIVA: tabla nueva `acceso.apariencias`, una fila por instalación que se personaliza. Sin fila, la
-- portería usa la marca de la empresa. No toca datos existentes ni secretos.

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "acceso"."apariencias" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "instalacion_id" UUID NOT NULL,
    "mensaje" TEXT,
    "fondo_documento_id" UUID,
    "actualizado_por" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "apariencias_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "apariencias_instalacion_key" ON "acceso"."apariencias"("tenant_id", "instalacion_id");
ALTER TABLE "acceso"."apariencias" ADD CONSTRAINT "apariencias_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "acceso"."apariencias" ADD CONSTRAINT "apariencias_instalacion_id_fkey"
  FOREIGN KEY ("instalacion_id") REFERENCES "core"."instalaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "acceso"."apariencias" ADD CONSTRAINT "apariencias_fondo_documento_id_fkey"
  FOREIGN KEY ("fondo_documento_id") REFERENCES "core"."documentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

GRANT SELECT, INSERT, UPDATE ON "acceso"."apariencias" TO opai_app;
ALTER TABLE "acceso"."apariencias" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "acceso"."apariencias" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "acceso"."apariencias" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "acceso"."apariencias" FOR EACH ROW EXECUTE FUNCTION
  "core"."verificar_mismo_tenant"('instalacion_id', 'core.instalaciones', 'fondo_documento_id', 'core.documentos');

COMMIT;

-- Reversión: DROP TABLE "acceso"."apariencias";
