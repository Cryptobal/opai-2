-- Central · CAR-468 (Brief 15b · PR 2): cadenas de escalamiento e intentos de contacto (R7, R8).
-- Migración aditiva, sin datos: dos tablas nuevas y columnas nullable o con defecto en alertas.
-- Tablas con tenant_id: RLS + FORCE + política tenant_isolation. Los intentos son append-only.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "central"."alertas"
  ADD COLUMN "cadena_id" UUID,
  ADD COLUMN "paso_actual" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "paso_vence_en" TIMESTAMPTZ(6),
  ADD COLUMN "atencion_por_id" UUID,
  ADD COLUMN "atencion_vence_en" TIMESTAMPTZ(6),
  ADD CONSTRAINT "alertas_paso_actual_check" CHECK ("paso_actual" BETWEEN 0 AND 6);

CREATE TABLE "central"."cadenas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "instalacion_id" UUID,
    "severidad" TEXT,
    "pasos" JSONB NOT NULL,
    "plazo_atencion_min" INTEGER NOT NULL DEFAULT 30,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cadenas_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "cadenas_severidad_check" CHECK ("severidad" IS NULL OR "severidad" IN ('critica', 'alta', 'media', 'baja')),
    CONSTRAINT "cadenas_pasos_check" CHECK (jsonb_typeof("pasos") = 'array' AND jsonb_array_length("pasos") BETWEEN 1 AND 6),
    CONSTRAINT "cadenas_plazo_check" CHECK ("plazo_atencion_min" BETWEEN 5 AND 1440)
);

CREATE TABLE "central"."intentos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "alerta_id" UUID NOT NULL,
    "paso" INTEGER NOT NULL,
    "destinatario_id" UUID,
    "canal" TEXT NOT NULL,
    "resultado" TEXT NOT NULL,
    "nota" TEXT,
    "registrado_por_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "intentos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "intentos_canal_check" CHECK ("canal" IN ('campana', 'push', 'whatsapp', 'sms', 'correo', 'llamada')),
    CONSTRAINT "intentos_resultado_check" CHECK ("resultado" IN
      ('avisado', 'apagado', 'contesto', 'no_contesto', 'confirmo', 'rechazo')),
    CONSTRAINT "intentos_paso_check" CHECK ("paso" BETWEEN 0 AND 6)
);

-- Una sola cadena por empresa, instalación y severidad (null cuenta como «todas»).
CREATE UNIQUE INDEX "cadenas_tenant_instalacion_severidad_key"
  ON "central"."cadenas"("tenant_id", "instalacion_id", "severidad") NULLS NOT DISTINCT;
CREATE INDEX "cadenas_tenant_id_idx" ON "central"."cadenas"("tenant_id");
CREATE INDEX "intentos_tenant_id_alerta_id_idx" ON "central"."intentos"("tenant_id", "alerta_id");

ALTER TABLE "central"."cadenas" ADD CONSTRAINT "cadenas_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "central"."cadenas" ADD CONSTRAINT "cadenas_instalacion_id_fkey"
  FOREIGN KEY ("instalacion_id") REFERENCES "core"."instalaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "central"."cadenas"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('instalacion_id', 'core.instalaciones');

ALTER TABLE "central"."alertas" ADD CONSTRAINT "alertas_cadena_id_fkey"
  FOREIGN KEY ("cadena_id") REFERENCES "central"."cadenas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "central"."alertas" ADD CONSTRAINT "alertas_atencion_por_id_fkey"
  FOREIGN KEY ("atencion_por_id") REFERENCES "core"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "central"."intentos" ADD CONSTRAINT "intentos_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "central"."intentos" ADD CONSTRAINT "intentos_tenant_id_alerta_id_fkey"
  FOREIGN KEY ("tenant_id", "alerta_id") REFERENCES "central"."alertas"("tenant_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "central"."intentos" ADD CONSTRAINT "intentos_destinatario_id_fkey"
  FOREIGN KEY ("destinatario_id") REFERENCES "core"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "central"."intentos" ADD CONSTRAINT "intentos_registrado_por_id_fkey"
  FOREIGN KEY ("registrado_por_id") REFERENCES "core"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TRIGGER "intentos_sin_update_delete" BEFORE UPDATE OR DELETE ON "central"."intentos"
  FOR EACH ROW EXECUTE FUNCTION "central"."alerta_eventos_inmutable"();
CREATE TRIGGER "intentos_sin_truncate" BEFORE TRUNCATE ON "central"."intentos"
  FOR EACH STATEMENT EXECUTE FUNCTION "central"."alerta_eventos_inmutable"();

ALTER TABLE "central"."cadenas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "central"."cadenas" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "central"."cadenas" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "central"."intentos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "central"."intentos" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "central"."intentos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "central"."cadenas", "central"."intentos" TO opai_app;
REVOKE UPDATE, DELETE, TRUNCATE ON "central"."intentos" FROM opai_app;

COMMIT;

-- Reversión: DROP TABLE IF EXISTS "central"."intentos"; ALTER TABLE "central"."alertas"
-- DROP COLUMN "cadena_id", DROP COLUMN "paso_actual", DROP COLUMN "paso_vence_en",
-- DROP COLUMN "atencion_por_id", DROP COLUMN "atencion_vence_en"; DROP TABLE IF EXISTS "central"."cadenas";
