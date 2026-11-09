-- CAR-78 · E3d: ejecución de rondas desde Terreno. Migración ADITIVA: dos tablas nuevas y una columna nueva en
-- `rondas.marcas_ronda`.
--   · ejecuciones   el INICIO de una ronda (hecho, SOLO INSERCIÓN).
--   · cierres_ronda el CIERRE de una ronda (hecho, SOLO INSERCIÓN, uno por ejecución). Una ejecución sin cierre está
--                   «en curso»: el estado se deriva, nunca se edita (R28, ADR-023).
--   · marcas_ronda.ejecucion_id: la ronda a la que pertenece una marca (opcional: una marca suelta sigue valiendo).
-- Aplica RLS `tenant_isolation` y `mismo_tenant`. No toca asistencia: una ronda no marca presencia laboral.

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "rondas"."ejecuciones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "instalacion_id" UUID NOT NULL,
    "plantilla_id" UUID NOT NULL,
    "dispositivo_id" UUID NOT NULL,
    "clave" UUID NOT NULL,
    "persona_id" UUID,
    "adhoc" BOOLEAN NOT NULL DEFAULT true,
    "hora_inicio" TIMESTAMPTZ(6) NOT NULL,
    "recibido_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ejecuciones_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ejecuciones_clave_key" ON "rondas"."ejecuciones"("tenant_id", "dispositivo_id", "clave");
CREATE INDEX "ejecuciones_instalacion_idx" ON "rondas"."ejecuciones"("tenant_id", "instalacion_id", "hora_inicio" DESC);

CREATE TABLE "rondas"."cierres_ronda" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "instalacion_id" UUID NOT NULL,
    "ejecucion_id" UUID NOT NULL,
    "dispositivo_id" UUID NOT NULL,
    "clave" UUID NOT NULL,
    "persona_id" UUID,
    "estado" TEXT NOT NULL,
    "motivo" TEXT,
    "puntos_obligatorios" INTEGER NOT NULL,
    "puntos_marcados" INTEGER NOT NULL,
    "hora_cierre" TIMESTAMPTZ(6) NOT NULL,
    "recibido_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cierres_ronda_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "cierres_ronda_ejecucion_key" ON "rondas"."cierres_ronda"("ejecucion_id");
CREATE UNIQUE INDEX "cierres_ronda_clave_key" ON "rondas"."cierres_ronda"("tenant_id", "dispositivo_id", "clave");

ALTER TABLE "rondas"."marcas_ronda" ADD COLUMN "ejecucion_id" UUID;
CREATE INDEX "marcas_ronda_ejecucion_idx" ON "rondas"."marcas_ronda"("tenant_id", "ejecucion_id");

ALTER TABLE "rondas"."cierres_ronda" ADD CONSTRAINT "cierres_ronda_ejecucion_fkey" FOREIGN KEY ("ejecucion_id") REFERENCES "rondas"."ejecuciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rondas"."marcas_ronda" ADD CONSTRAINT "marcas_ronda_ejecucion_fkey" FOREIGN KEY ("ejecucion_id") REFERENCES "rondas"."ejecuciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rondas"."ejecuciones" ADD CONSTRAINT "ejecuciones_plantilla_fkey" FOREIGN KEY ("plantilla_id") REFERENCES "rondas"."plantillas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ejecuciones', 'cierres_ronda'] LOOP
    EXECUTE format('ALTER TABLE "rondas".%I ADD CONSTRAINT %I FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE', t, t || '_tenant_id_fkey');
    EXECUTE format('ALTER TABLE "rondas".%I ADD CONSTRAINT %I FOREIGN KEY ("instalacion_id") REFERENCES "core"."instalaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE', t, t || '_instalacion_id_fkey');
    EXECUTE format('ALTER TABLE "rondas".%I ADD CONSTRAINT %I FOREIGN KEY ("dispositivo_id") REFERENCES "core"."dispositivos"("id") ON DELETE RESTRICT ON UPDATE CASCADE', t, t || '_dispositivo_id_fkey');
    EXECUTE format('ALTER TABLE "rondas".%I ADD CONSTRAINT %I FOREIGN KEY ("persona_id") REFERENCES "core"."personas"("id") ON DELETE RESTRICT ON UPDATE CASCADE', t, t || '_persona_id_fkey');
    EXECUTE format('REVOKE UPDATE, DELETE, TRUNCATE ON "rondas".%I FROM opai_app', t);
    EXECUTE format('GRANT SELECT, INSERT ON "rondas".%I TO opai_app', t);
    EXECUTE format('ALTER TABLE "rondas".%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE "rondas".%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format($p$CREATE POLICY tenant_isolation ON "rondas".%I AS PERMISSIVE FOR ALL TO opai_app
      USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
      WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)$p$, t);
  END LOOP;
END $$;

-- Plantilla, instalación, dispositivo, persona y ejecución deben ser de la misma empresa.
CREATE TRIGGER mismo_tenant BEFORE INSERT ON "rondas"."ejecuciones" FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
  'plantilla_id', 'rondas.plantillas', 'instalacion_id', 'core.instalaciones',
  'dispositivo_id', 'core.dispositivos', 'persona_id', 'core.personas');
CREATE TRIGGER mismo_tenant BEFORE INSERT ON "rondas"."cierres_ronda" FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
  'ejecucion_id', 'rondas.ejecuciones', 'instalacion_id', 'core.instalaciones',
  'dispositivo_id', 'core.dispositivos', 'persona_id', 'core.personas');
-- marcas_ronda: se recrea el trigger para cubrir también la ejecución.
DROP TRIGGER mismo_tenant ON "rondas"."marcas_ronda";
CREATE TRIGGER mismo_tenant BEFORE INSERT ON "rondas"."marcas_ronda" FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
  'punto_id', 'rondas.puntos_control', 'instalacion_id', 'core.instalaciones',
  'dispositivo_id', 'core.dispositivos', 'persona_id', 'core.personas', 'ejecucion_id', 'rondas.ejecuciones');

COMMIT;

-- Reversión (manual, con el rol propietario, en una transacción):
--   ALTER TABLE "rondas"."marcas_ronda" DROP COLUMN "ejecucion_id";
--   (volver a crear el trigger mismo_tenant de marcas_ronda sin 'ejecucion_id', como en 20261113100000)
--   DROP TABLE IF EXISTS "rondas"."cierres_ronda"; DROP TABLE IF EXISTS "rondas"."ejecuciones";
-- Con rondas ya ejecutadas se perdería su historial de inicio y cierre (las marcas siguen): ante la duda, restaura
-- desde el snapshot previo de Neon.
