-- CAR-78 · B3: hechos que el equipo de terreno captura (posiblemente sin señal) y envía en lote. Migración
-- ADITIVA: una tabla nueva, SOLO INSERCIÓN para `opai_app` (nada se edita ni se borra; una corrección es un
-- hecho nuevo, ADR-023) y con RLS `tenant_isolation`. La hora del servidor manda: `hora_corregida` lleva la
-- hora del equipo a la del servidor con el desfase del envío.

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "core"."hechos_terreno" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "dispositivo_id" UUID NOT NULL,
    "instalacion_id" UUID NOT NULL,
    "clave" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "persona_id" UUID,
    "hora_hecho" TIMESTAMPTZ(6) NOT NULL,
    "hora_envio" TIMESTAMPTZ(6) NOT NULL,
    "recibido_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "desfase_segundos" INTEGER NOT NULL,
    "hora_corregida" TIMESTAMPTZ(6) NOT NULL,
    "desfase_alto" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "hechos_terreno_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "hechos_terreno_tipo_chk" CHECK (length("tipo") BETWEEN 1 AND 80),
    CONSTRAINT "hechos_terreno_payload_chk" CHECK (pg_column_size("payload") <= 65536)
);
CREATE UNIQUE INDEX "hechos_terreno_tenant_id_dispositivo_id_clave_key" ON "core"."hechos_terreno"("tenant_id", "dispositivo_id", "clave");
CREATE INDEX "hechos_terreno_tenant_id_instalacion_id_hora_corregida_idx" ON "core"."hechos_terreno"("tenant_id", "instalacion_id", "hora_corregida" DESC);
ALTER TABLE "core"."hechos_terreno" ADD CONSTRAINT "hechos_terreno_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core"."hechos_terreno" ADD CONSTRAINT "hechos_terreno_dispositivo_id_fkey" FOREIGN KEY ("dispositivo_id") REFERENCES "core"."dispositivos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core"."hechos_terreno" ADD CONSTRAINT "hechos_terreno_instalacion_id_fkey" FOREIGN KEY ("instalacion_id") REFERENCES "core"."instalaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core"."hechos_terreno" ADD CONSTRAINT "hechos_terreno_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "core"."personas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

GRANT SELECT, INSERT ON "core"."hechos_terreno" TO opai_app;
REVOKE UPDATE, DELETE, TRUNCATE ON "core"."hechos_terreno" FROM opai_app;

ALTER TABLE "core"."hechos_terreno" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."hechos_terreno" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."hechos_terreno" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- El dispositivo, la instalación y la persona deben ser de la misma empresa.
CREATE TRIGGER mismo_tenant BEFORE INSERT ON "core"."hechos_terreno"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'dispositivo_id', 'core.dispositivos', 'instalacion_id', 'core.instalaciones', 'persona_id', 'core.personas');

COMMIT;

-- Reversión (manual, con el rol propietario, en una transacción):
--   DROP TABLE IF EXISTS "core"."hechos_terreno";
-- Solo elimina la tabla nueva de esta migración. Con hechos ya recibidos se perdería lo que enviaron los
-- equipos: ante la duda, restaura desde el snapshot previo de Neon.
