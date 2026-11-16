-- CAR-479 parte 1 (Sesión Acceso): configuración de acceso por empresa y por instalación (R1, R2, R25).
-- Migración ADITIVA: tabla nueva `acceso.configuraciones` (una fila de la empresa con `instalacion_id` nulo y, si se
-- personaliza, una por instalación) y columna nueva `campos_extra` en `acceso.registros_acceso`, con valor por defecto
-- (los registros existentes quedan con `[]`). No toca datos existentes ni secretos.

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "acceso"."configuraciones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "instalacion_id" UUID,
    "valor" JSONB NOT NULL,
    "actualizado_por" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "configuraciones_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "configuraciones_empresa_key" ON "acceso"."configuraciones"("tenant_id")
  WHERE "instalacion_id" IS NULL;
CREATE UNIQUE INDEX "configuraciones_instalacion_key" ON "acceso"."configuraciones"("tenant_id", "instalacion_id")
  WHERE "instalacion_id" IS NOT NULL;
ALTER TABLE "acceso"."configuraciones" ADD CONSTRAINT "configuraciones_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "acceso"."configuraciones" ADD CONSTRAINT "configuraciones_instalacion_id_fkey"
  FOREIGN KEY ("instalacion_id") REFERENCES "core"."instalaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

GRANT SELECT, INSERT, UPDATE, DELETE ON "acceso"."configuraciones" TO opai_app;
ALTER TABLE "acceso"."configuraciones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "acceso"."configuraciones" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "acceso"."configuraciones" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "acceso"."configuraciones" FOR EACH ROW EXECUTE FUNCTION
  "core"."verificar_mismo_tenant"('instalacion_id', 'core.instalaciones');

ALTER TABLE "acceso"."registros_acceso" ADD COLUMN "campos_extra" JSONB NOT NULL DEFAULT '[]';

COMMIT;

-- Reversión (manual, con el rol propietario, en una transacción). Solo si aún no hay configuraciones reales:
--   DROP TABLE "acceso"."configuraciones";
--   ALTER TABLE "acceso"."registros_acceso" DROP COLUMN "campos_extra";
