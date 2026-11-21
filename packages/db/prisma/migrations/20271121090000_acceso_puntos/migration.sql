-- CAR-479 parte 2 (Sesión Acceso): puntos de acceso por instalación (portería principal, acceso vehicular, etc.).
-- Migración ADITIVA: tabla nueva `acceso.puntos` y columna nueva opcional `punto_id` en `acceso.registros_acceso`
-- (los registros existentes quedan sin punto). No toca datos existentes ni secretos.

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "acceso"."puntos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "instalacion_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'peatonal',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "puntos_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "puntos_instalacion_idx" ON "acceso"."puntos"("tenant_id", "instalacion_id", "orden");
ALTER TABLE "acceso"."puntos" ADD CONSTRAINT "puntos_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "acceso"."puntos" ADD CONSTRAINT "puntos_instalacion_id_fkey"
  FOREIGN KEY ("instalacion_id") REFERENCES "core"."instalaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Se desactivan, no se borran: los registros los referencian.
GRANT SELECT, INSERT, UPDATE ON "acceso"."puntos" TO opai_app;
ALTER TABLE "acceso"."puntos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "acceso"."puntos" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "acceso"."puntos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "acceso"."puntos" FOR EACH ROW EXECUTE FUNCTION
  "core"."verificar_mismo_tenant"('instalacion_id', 'core.instalaciones');

ALTER TABLE "acceso"."registros_acceso" ADD COLUMN "punto_id" UUID;
ALTER TABLE "acceso"."registros_acceso" ADD CONSTRAINT "registros_acceso_punto_fkey"
  FOREIGN KEY ("punto_id") REFERENCES "acceso"."puntos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TRIGGER mismo_tenant_punto BEFORE INSERT ON "acceso"."registros_acceso" FOR EACH ROW EXECUTE FUNCTION
  "core"."verificar_mismo_tenant"('punto_id', 'acceso.puntos');

COMMIT;

-- Reversión (manual, con el rol propietario, en una transacción). Solo si aún no hay puntos reales:
--   DROP TRIGGER mismo_tenant_punto ON "acceso"."registros_acceso";
--   ALTER TABLE "acceso"."registros_acceso" DROP COLUMN "punto_id";
--   DROP TABLE "acceso"."puntos";
