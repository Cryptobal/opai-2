-- Central · CAR-461 (Brief 15b · PR 1, spec docs/2.0/modulos/central.md). Migración aditiva, sin
-- datos: schema nuevo `central` con dos tablas.
-- Qué hace y por qué: la alerta es el caso que atiende la central (§2, estados de §6) y su línea de
-- tiempo es append-only (R18). Cada hecho se encadena además en core.bitacora desde la capacidad.
-- Tablas con tenant_id: RLS + FORCE + política tenant_isolation (docs/2.0/REGLAS-codigo.md).
-- Instalación, persona y usuario se validan del mismo tenant en la capacidad; aquí van FK simples
-- (core.instalaciones no tiene índice único (tenant_id, id)).
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE SCHEMA IF NOT EXISTS "central";

CREATE TABLE "central"."alertas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "instalacion_id" UUID NOT NULL,
    "persona_id" UUID,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL DEFAULT '',
    "severidad" TEXT NOT NULL,
    "origen" TEXT NOT NULL DEFAULT 'manual',
    "estado" TEXT NOT NULL DEFAULT 'nueva',
    "estado_previo" TEXT,
    "pospuesta_hasta" TIMESTAMPTZ(6),
    "nota_cierre" TEXT,
    "abierta_por_id" UUID,
    "cerrada_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "alertas_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "alertas_severidad_check" CHECK ("severidad" IN ('critica', 'alta', 'media', 'baja')),
    CONSTRAINT "alertas_estado_check" CHECK ("estado" IN
      ('nueva', 'en_contacto', 'escalada', 'en_atencion', 'resuelta', 'falsa_alarma', 'pospuesta')),
    CONSTRAINT "alertas_pospuesta_check" CHECK (
      ("estado" = 'pospuesta') = ("pospuesta_hasta" IS NOT NULL AND "estado_previo" IS NOT NULL))
);

CREATE TABLE "central"."alerta_eventos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "alerta_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "actor_tipo" TEXT NOT NULL,
    "actor_id" UUID,
    "nota" TEXT,
    "estado_desde" TEXT,
    "estado_hacia" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "alerta_eventos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "alerta_eventos_actor_tipo_check" CHECK ("actor_tipo" IN ('persona', 'agente', 'sistema'))
);

CREATE UNIQUE INDEX "alertas_tenant_id_id_key" ON "central"."alertas"("tenant_id", "id");
CREATE INDEX "alertas_tenant_id_estado_idx" ON "central"."alertas"("tenant_id", "estado");
CREATE INDEX "alertas_tenant_id_instalacion_id_idx" ON "central"."alertas"("tenant_id", "instalacion_id");
CREATE INDEX "alerta_eventos_tenant_id_alerta_id_idx" ON "central"."alerta_eventos"("tenant_id", "alerta_id");

ALTER TABLE "central"."alertas" ADD CONSTRAINT "alertas_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "central"."alertas" ADD CONSTRAINT "alertas_instalacion_id_fkey"
  FOREIGN KEY ("instalacion_id") REFERENCES "core"."instalaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "central"."alertas" ADD CONSTRAINT "alertas_persona_id_fkey"
  FOREIGN KEY ("persona_id") REFERENCES "core"."personas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "central"."alertas" ADD CONSTRAINT "alertas_abierta_por_id_fkey"
  FOREIGN KEY ("abierta_por_id") REFERENCES "core"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "central"."alerta_eventos" ADD CONSTRAINT "alerta_eventos_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "central"."alerta_eventos" ADD CONSTRAINT "alerta_eventos_tenant_id_alerta_id_fkey"
  FOREIGN KEY ("tenant_id", "alerta_id") REFERENCES "central"."alertas"("tenant_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "central"."alerta_eventos" ADD CONSTRAINT "alerta_eventos_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "core"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Línea de tiempo append-only (R18): las correcciones son hechos nuevos.
CREATE OR REPLACE FUNCTION "central"."alerta_eventos_inmutable"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'central.alerta_eventos es append-only: % no permitido', TG_OP;
END;
$$;
CREATE TRIGGER "alerta_eventos_sin_update_delete" BEFORE UPDATE OR DELETE ON "central"."alerta_eventos"
  FOR EACH ROW EXECUTE FUNCTION "central"."alerta_eventos_inmutable"();
CREATE TRIGGER "alerta_eventos_sin_truncate" BEFORE TRUNCATE ON "central"."alerta_eventos"
  FOR EACH STATEMENT EXECUTE FUNCTION "central"."alerta_eventos_inmutable"();

ALTER TABLE "central"."alertas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "central"."alertas" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "central"."alertas" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "central"."alerta_eventos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "central"."alerta_eventos" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "central"."alerta_eventos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- Grants (GRANT USAGE + ALTER DEFAULT PRIVILEGES al crear un schema nuevo, ver REGLAS-codigo.md)
GRANT USAGE ON SCHEMA "central" TO opai_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "central" TO opai_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "central" TO opai_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA "central" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO opai_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA "central" GRANT USAGE, SELECT ON SEQUENCES TO opai_app;
REVOKE UPDATE, DELETE, TRUNCATE ON "central"."alerta_eventos" FROM opai_app;

COMMIT;

-- Reversión: DROP TABLE IF EXISTS "central"."alerta_eventos"; DROP TABLE IF EXISTS "central"."alertas";
-- DROP FUNCTION IF EXISTS "central"."alerta_eventos_inmutable"(); DROP SCHEMA IF EXISTS "central";
