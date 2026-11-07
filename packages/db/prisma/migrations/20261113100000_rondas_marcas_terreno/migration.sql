-- CAR-78 · E3: marcas de ronda que captura un equipo de terreno (QR y GPS). Migración ADITIVA: una tabla nueva
-- `rondas.marcas_ronda`, SOLO INSERCIÓN para `opai_app` (un hecho no se edita ni se borra, R28/ADR-023) y con RLS
-- `tenant_isolation`. Cada marca nace en la misma transacción que su hecho de `core.hechos_terreno` (misma clave +
-- dispositivo; sin FK compuesta, que el sembrador genérico de RLS no cubre) y no infiere presencia laboral.

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "rondas"."marcas_ronda" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "instalacion_id" UUID NOT NULL,
    "punto_id" UUID NOT NULL,
    "dispositivo_id" UUID NOT NULL,
    "clave" UUID NOT NULL,
    "persona_id" UUID,
    "hora_corregida" TIMESTAMPTZ(6) NOT NULL,
    "geocerca" TEXT NOT NULL,
    "distancia_m" DECIMAL(9,1),
    "precision_m" DECIMAL(9,1),
    "anomalias" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "marcas_ronda_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "marcas_ronda_tenant_id_dispositivo_id_clave_key" ON "rondas"."marcas_ronda"("tenant_id", "dispositivo_id", "clave");
CREATE INDEX "marcas_ronda_tenant_id_punto_id_hora_corregida_idx" ON "rondas"."marcas_ronda"("tenant_id", "punto_id", "hora_corregida" DESC);
CREATE INDEX "marcas_ronda_tenant_id_instalacion_id_hora_corregida_idx" ON "rondas"."marcas_ronda"("tenant_id", "instalacion_id", "hora_corregida" DESC);
ALTER TABLE "rondas"."marcas_ronda" ADD CONSTRAINT "marcas_ronda_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rondas"."marcas_ronda" ADD CONSTRAINT "marcas_ronda_punto_id_fkey" FOREIGN KEY ("punto_id") REFERENCES "rondas"."puntos_control"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rondas"."marcas_ronda" ADD CONSTRAINT "marcas_ronda_instalacion_id_fkey" FOREIGN KEY ("instalacion_id") REFERENCES "core"."instalaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rondas"."marcas_ronda" ADD CONSTRAINT "marcas_ronda_dispositivo_id_fkey" FOREIGN KEY ("dispositivo_id") REFERENCES "core"."dispositivos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rondas"."marcas_ronda" ADD CONSTRAINT "marcas_ronda_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "core"."personas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
REVOKE UPDATE, DELETE, TRUNCATE ON "rondas"."marcas_ronda" FROM opai_app;
GRANT SELECT, INSERT ON "rondas"."marcas_ronda" TO opai_app;

ALTER TABLE "rondas"."marcas_ronda" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rondas"."marcas_ronda" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "rondas"."marcas_ronda" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- Punto, instalación, dispositivo y persona deben ser de la misma empresa.
CREATE TRIGGER mismo_tenant BEFORE INSERT ON "rondas"."marcas_ronda"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'punto_id', 'rondas.puntos_control', 'instalacion_id', 'core.instalaciones',
    'dispositivo_id', 'core.dispositivos', 'persona_id', 'core.personas');

COMMIT;

-- Reversión (manual, con el rol propietario, en una transacción):
--   DROP TABLE IF EXISTS "rondas"."marcas_ronda";
-- Solo elimina la tabla nueva. Con marcas ya recibidas se perdería la proyección (los hechos de
-- core.hechos_terreno siguen); ante la duda, restaura desde el snapshot previo de Neon.
