-- CAR-632 (Sesión Acceso): cursor de reportes periódicos por instalación (R27). Aditiva, sin datos previos.

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "acceso"."reportes_cursor" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "instalacion_id" UUID NOT NULL,
    "ultimo_hasta" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "reportes_cursor_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "reportes_cursor_instalacion_key"
  ON "acceso"."reportes_cursor"("tenant_id", "instalacion_id");
ALTER TABLE "acceso"."reportes_cursor" ADD CONSTRAINT "reportes_cursor_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "acceso"."reportes_cursor" ADD CONSTRAINT "reportes_cursor_instalacion_id_fkey"
  FOREIGN KEY ("instalacion_id") REFERENCES "core"."instalaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

GRANT SELECT, INSERT, UPDATE, DELETE ON "acceso"."reportes_cursor" TO opai_app;
ALTER TABLE "acceso"."reportes_cursor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "acceso"."reportes_cursor" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "acceso"."reportes_cursor" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "acceso"."reportes_cursor" FOR EACH ROW EXECUTE FUNCTION
  "core"."verificar_mismo_tenant"('instalacion_id', 'core.instalaciones');

COMMIT;