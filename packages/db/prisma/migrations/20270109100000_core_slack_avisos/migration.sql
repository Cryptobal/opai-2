-- Núcleo · CAR-293 (Slack F3, ADR-093): avisos de terreno a Slack. Migración aditiva: dos tablas nuevas
-- sin datos. No toca nada existente.
--   · core.slack_avisos: cada anomalía que la empresa eligió avisar (atraso, ausencia, fuera de zona,
--     incidente, pánico…), con el canal y el mensaje de Slack donde quedó y su gestión en OPAI
--     (abierto, tomado, cerrado; F4). La clave única por empresa hace idempotente el registro.
--   · core.slack_hilos: el mensaje padre de cada instalación por canal y día; los avisos van en su hilo
--     (nunca un canal por instalación).
-- Instalación y persona deben ser de la misma empresa (trigger verificar_mismo_tenant).
-- Tablas con tenant_id: RLS + FORCE + política tenant_isolation (docs/2.0/REGLAS-codigo.md).
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "core"."slack_hilos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "canal_id" TEXT NOT NULL,
    "instalacion_id" UUID NOT NULL,
    "fecha" DATE NOT NULL,
    "ts" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "slack_hilos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "slack_hilos_ts_check" CHECK ("ts" ~ '^\d+\.\d+$')
);
CREATE UNIQUE INDEX "slack_hilos_tenant_id_canal_id_instalacion_id_fecha_key"
  ON "core"."slack_hilos"("tenant_id", "canal_id", "instalacion_id", "fecha");

CREATE TABLE "core"."slack_avisos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "instalacion_id" UUID,
    "persona_id" UUID,
    "titulo" TEXT NOT NULL,
    "detalle" TEXT,
    "enlace" TEXT,
    "canal_id" TEXT,
    "hilo_ts" TEXT,
    "ts" TEXT,
    "envio" TEXT NOT NULL DEFAULT 'pendiente',
    "error" TEXT,
    "gestion" TEXT NOT NULL DEFAULT 'abierto',
    "tomado_por" UUID,
    "tomado_en" TIMESTAMPTZ(6),
    "cerrado_por" UUID,
    "cerrado_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "slack_avisos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "slack_avisos_tipo_check" CHECK ("tipo" IN
      ('atraso', 'ausencia', 'fuera_de_zona', 'sin_relevo', 'incidente', 'panico', 'mensaje_guardia')),
    CONSTRAINT "slack_avisos_envio_check" CHECK ("envio" IN ('pendiente', 'enviado', 'fallido')),
    CONSTRAINT "slack_avisos_gestion_check" CHECK ("gestion" IN ('abierto', 'tomado', 'cerrado'))
);
CREATE UNIQUE INDEX "slack_avisos_tenant_id_clave_key" ON "core"."slack_avisos"("tenant_id", "clave");
CREATE INDEX "slack_avisos_tenant_id_gestion_idx" ON "core"."slack_avisos"("tenant_id", "gestion", "created_at");
CREATE INDEX "slack_avisos_tenant_id_ts_idx" ON "core"."slack_avisos"("tenant_id", "canal_id", "ts");

ALTER TABLE "core"."slack_hilos" ADD CONSTRAINT "slack_hilos_instalacion_id_fkey"
  FOREIGN KEY ("instalacion_id") REFERENCES "core"."instalaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "core"."slack_avisos" ADD CONSTRAINT "slack_avisos_instalacion_id_fkey"
  FOREIGN KEY ("instalacion_id") REFERENCES "core"."instalaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "core"."slack_avisos" ADD CONSTRAINT "slack_avisos_persona_id_fkey"
  FOREIGN KEY ("persona_id") REFERENCES "core"."personas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."slack_hilos"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('instalacion_id', 'core.instalaciones');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."slack_avisos"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'instalacion_id', 'core.instalaciones', 'persona_id', 'core.personas');

ALTER TABLE "core"."slack_hilos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."slack_hilos" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."slack_hilos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
ALTER TABLE "core"."slack_avisos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."slack_avisos" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."slack_avisos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

COMMIT;

-- Reversión (manual, con el rol propietario, en una transacción):
--   DROP TABLE IF EXISTS "core"."slack_avisos";
--   DROP TABLE IF EXISTS "core"."slack_hilos";
-- Solo elimina tablas nuevas; nada existente depende de ellas. Lo ya publicado en Slack queda allí.
