-- CAR-477 (Sesión Acceso): anular un registro de acceso, registrar la salida desde el ERP y cerrar en bloque.
-- Migración ADITIVA:
--   · acceso.anulaciones_registro  hecho nuevo que anula un registro con motivo (R24, ADR-023). SOLO INSERCIÓN,
--                                  una por registro. El registro original no se toca.
--   · acceso.salidas_acceso        admite salidas sin equipo: registradas desde el ERP por una persona o por el
--                                  cierre en bloque (R25). `dispositivo_id` deja de ser obligatorio y se agregan
--                                  `origen`, `registrada_por` y `motivo`. Las filas existentes quedan con
--                                  origen «dispositivo» (el valor por defecto) y no cambian.
-- No toca datos existentes ni secretos.

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "acceso"."anulaciones_registro" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "instalacion_id" UUID NOT NULL,
    "registro_id" UUID NOT NULL,
    "motivo" TEXT NOT NULL,
    "anulada_por" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "anulaciones_registro_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "anulaciones_registro_motivo_check" CHECK (char_length(btrim("motivo")) BETWEEN 3 AND 300)
);
CREATE UNIQUE INDEX "anulaciones_registro_registro_key" ON "acceso"."anulaciones_registro"("registro_id");
ALTER TABLE "acceso"."anulaciones_registro" ADD CONSTRAINT "anulaciones_registro_registro_fkey"
  FOREIGN KEY ("registro_id") REFERENCES "acceso"."registros_acceso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "acceso"."anulaciones_registro" ADD CONSTRAINT "anulaciones_registro_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "acceso"."anulaciones_registro" ADD CONSTRAINT "anulaciones_registro_instalacion_id_fkey"
  FOREIGN KEY ("instalacion_id") REFERENCES "core"."instalaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

GRANT SELECT, INSERT ON "acceso"."anulaciones_registro" TO opai_app;
REVOKE UPDATE, DELETE, TRUNCATE ON "acceso"."anulaciones_registro" FROM opai_app;
ALTER TABLE "acceso"."anulaciones_registro" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "acceso"."anulaciones_registro" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "acceso"."anulaciones_registro" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
CREATE TRIGGER mismo_tenant BEFORE INSERT ON "acceso"."anulaciones_registro" FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
  'registro_id', 'acceso.registros_acceso', 'instalacion_id', 'core.instalaciones');

ALTER TABLE "acceso"."salidas_acceso" ALTER COLUMN "dispositivo_id" DROP NOT NULL;
ALTER TABLE "acceso"."salidas_acceso" ADD COLUMN "origen" TEXT NOT NULL DEFAULT 'dispositivo';
ALTER TABLE "acceso"."salidas_acceso" ADD COLUMN "registrada_por" UUID;
ALTER TABLE "acceso"."salidas_acceso" ADD COLUMN "motivo" TEXT;
ALTER TABLE "acceso"."salidas_acceso" ADD CONSTRAINT "salidas_acceso_origen_check"
  CHECK ("origen" IN ('dispositivo', 'erp', 'cierre'));
-- Una salida del ERP o del cierre en bloque nunca lleva equipo. La base no exige equipo en las de origen
-- «dispositivo»: lo garantiza la ingesta de Terreno (que siempre lo pone), igual que antes de esta migración.
ALTER TABLE "acceso"."salidas_acceso" ADD CONSTRAINT "salidas_acceso_dispositivo_check"
  CHECK ("origen" = 'dispositivo' OR "dispositivo_id" IS NULL);

COMMIT;

-- Reversión (manual, con el rol propietario, en una transacción). Solo si aún no hay salidas sin equipo:
--   ALTER TABLE "acceso"."salidas_acceso" DROP CONSTRAINT "salidas_acceso_dispositivo_check",
--     DROP CONSTRAINT "salidas_acceso_origen_check", DROP COLUMN "motivo", DROP COLUMN "registrada_por",
--     DROP COLUMN "origen", ALTER COLUMN "dispositivo_id" SET NOT NULL;
--   DROP TABLE "acceso"."anulaciones_registro";
-- Con anulaciones o salidas del ERP ya hechas se perdería historial: ante la duda, restaura el snapshot previo de Neon.
