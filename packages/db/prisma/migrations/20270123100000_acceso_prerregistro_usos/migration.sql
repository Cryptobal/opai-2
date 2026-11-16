-- CAR-478 parte 2 (Sesión Acceso): uso de un prerregistro en la portería (R14, R15).
-- Migración ADITIVA: tabla nueva `acceso.prerregistro_usos`, un hecho por visitante y día que dice con qué registro
-- de entrada se usó (estado «Ingresó»). SOLO INSERCIÓN para opai_app; el par (visitante, día) es único, así que
-- la invitación de un día sirve una sola vez. No toca datos existentes ni secretos.

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "acceso"."prerregistro_usos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "visitante_id" UUID NOT NULL,
    "dia" DATE NOT NULL,
    "registro_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "prerregistro_usos_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "prerregistro_usos_dia_key" ON "acceso"."prerregistro_usos"("visitante_id", "dia");
CREATE UNIQUE INDEX "prerregistro_usos_registro_key" ON "acceso"."prerregistro_usos"("registro_id");
ALTER TABLE "acceso"."prerregistro_usos" ADD CONSTRAINT "prerregistro_usos_visitante_fkey"
  FOREIGN KEY ("visitante_id") REFERENCES "acceso"."prerregistro_visitantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "acceso"."prerregistro_usos" ADD CONSTRAINT "prerregistro_usos_registro_fkey"
  FOREIGN KEY ("registro_id") REFERENCES "acceso"."registros_acceso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "acceso"."prerregistro_usos" ADD CONSTRAINT "prerregistro_usos_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

GRANT SELECT, INSERT ON "acceso"."prerregistro_usos" TO opai_app;
REVOKE UPDATE, DELETE, TRUNCATE ON "acceso"."prerregistro_usos" FROM opai_app;
ALTER TABLE "acceso"."prerregistro_usos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "acceso"."prerregistro_usos" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "acceso"."prerregistro_usos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
CREATE TRIGGER mismo_tenant BEFORE INSERT ON "acceso"."prerregistro_usos" FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
  'visitante_id', 'acceso.prerregistro_visitantes', 'registro_id', 'acceso.registros_acceso');

COMMIT;

-- Reversión (manual, con el rol propietario, en una transacción). Solo si aún no hay usos reales:
--   DROP TABLE "acceso"."prerregistro_usos";
