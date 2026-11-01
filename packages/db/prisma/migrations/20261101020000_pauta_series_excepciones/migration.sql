-- Operaciones · Pauta PR 1 (Brief 11b, CAR-81): schema `pauta` con series por puesto, excepciones por
-- día e historial de cambios. Migración ADITIVA: solo crea objetos nuevos (schema, 3 tablas, índices,
-- FK, políticas, triggers); no altera ni toca filas de tablas existentes ni migra datos. Toda tabla
-- con tenant_id lleva RLS `tenant_isolation` (ENABLE + FORCE) para opai_app, que es NOBYPASSRLS. Las
-- FK apuntan solo a core.tenants, core.puestos, core.patrones_turno y core.instalaciones; las
-- personas (titular, persona de la excepción) se validan en la capacidad y por el trigger de mismo
-- tenant, sin FK nueva sobre el maestro de personas.

BEGIN;
SET LOCAL lock_timeout = '5s';

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "pauta";

-- CreateTable
CREATE TABLE "pauta"."series" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "puesto_id" UUID NOT NULL,
    "patron_id" UUID NOT NULL,
    "inicio_ciclo" DATE NOT NULL,
    "titular_persona_id" UUID,
    "vigente_desde" DATE NOT NULL,
    "vigente_hasta" DATE,
    "creada_por" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "series_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "series_vigencia_chk" CHECK ("vigente_hasta" IS NULL OR "vigente_hasta" >= "vigente_desde")
);

CREATE TABLE "pauta"."excepciones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "puesto_id" UUID NOT NULL,
    "fecha" DATE NOT NULL,
    "tipo" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "persona_id" UUID,
    "estado" TEXT NOT NULL DEFAULT 'activa',
    "creada_por" UUID,
    "anulada_por" UUID,
    "anulada_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "excepciones_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "excepciones_tipo_chk" CHECK ("tipo" IN ('ausencia', 'licencia', 'vacaciones', 'permiso')),
    CONSTRAINT "excepciones_estado_chk" CHECK ("estado" IN ('activa', 'anulada'))
);

CREATE TABLE "pauta"."historial" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "instalacion_id" UUID NOT NULL,
    "puesto_id" UUID NOT NULL,
    "accion" TEXT NOT NULL,
    "actor_tipo" TEXT NOT NULL,
    "actor_id" UUID,
    "fecha_desde" DATE NOT NULL,
    "fecha_hasta" DATE NOT NULL,
    "detalle" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historial_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "historial_accion_chk" CHECK ("accion" IN ('serie_fijada', 'excepcion_creada', 'excepcion_anulada'))
);

-- Índices. Una sola serie abierta por puesto (vigente_hasta nula) y una sola excepción activa por
-- puesto y día: la carrera entre dos escrituras se traduce a CONFLICT en la capacidad.
CREATE INDEX "series_tenant_id_puesto_id_vigente_desde_idx" ON "pauta"."series"("tenant_id", "puesto_id", "vigente_desde");
CREATE UNIQUE INDEX "series_puesto_abierta_key" ON "pauta"."series"("tenant_id", "puesto_id") WHERE "vigente_hasta" IS NULL;
CREATE INDEX "series_tenant_id_titular_persona_id_idx" ON "pauta"."series"("tenant_id", "titular_persona_id") WHERE "titular_persona_id" IS NOT NULL;
CREATE INDEX "excepciones_tenant_id_puesto_id_fecha_idx" ON "pauta"."excepciones"("tenant_id", "puesto_id", "fecha");
CREATE UNIQUE INDEX "excepciones_puesto_fecha_activa_key" ON "pauta"."excepciones"("tenant_id", "puesto_id", "fecha") WHERE "estado" = 'activa';
CREATE INDEX "historial_tenant_id_instalacion_id_created_at_idx" ON "pauta"."historial"("tenant_id", "instalacion_id", "created_at" DESC);
CREATE INDEX "historial_tenant_id_puesto_id_created_at_idx" ON "pauta"."historial"("tenant_id", "puesto_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "pauta"."series" ADD CONSTRAINT "series_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pauta"."series" ADD CONSTRAINT "series_puesto_id_fkey" FOREIGN KEY ("puesto_id") REFERENCES "core"."puestos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pauta"."series" ADD CONSTRAINT "series_patron_id_fkey" FOREIGN KEY ("patron_id") REFERENCES "core"."patrones_turno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pauta"."excepciones" ADD CONSTRAINT "excepciones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pauta"."excepciones" ADD CONSTRAINT "excepciones_puesto_id_fkey" FOREIGN KEY ("puesto_id") REFERENCES "core"."puestos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pauta"."historial" ADD CONSTRAINT "historial_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pauta"."historial" ADD CONSTRAINT "historial_instalacion_id_fkey" FOREIGN KEY ("instalacion_id") REFERENCES "core"."instalaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pauta"."historial" ADD CONSTRAINT "historial_puesto_id_fkey" FOREIGN KEY ("puesto_id") REFERENCES "core"."puestos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Permisos del rol de aplicación sobre el schema nuevo (como en la migración inicial de rondas).
GRANT USAGE ON SCHEMA "pauta" TO opai_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "pauta" TO opai_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "pauta" TO opai_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA "pauta" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO opai_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA "pauta" GRANT USAGE, SELECT ON SEQUENCES TO opai_app;
-- El historial es append-only: la app lo lee y lo agrega, nunca lo modifica ni lo borra.
REVOKE UPDATE, DELETE ON "pauta"."historial" FROM opai_app;

-- Row-Level Security: una política `tenant_isolation` para opai_app (NOBYPASSRLS), con FORCE.
ALTER TABLE "pauta"."series" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pauta"."series" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "pauta"."series" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
ALTER TABLE "pauta"."excepciones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pauta"."excepciones" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "pauta"."excepciones" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
ALTER TABLE "pauta"."historial" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pauta"."historial" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "pauta"."historial" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- Referencias dentro del mismo tenant (trigger del núcleo `core.verificar_mismo_tenant`).
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "pauta"."series"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('puesto_id', 'core.puestos', 'patron_id', 'core.patrones_turno', 'titular_persona_id', 'core.personas');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "pauta"."excepciones"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('puesto_id', 'core.puestos', 'persona_id', 'core.personas');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "pauta"."historial"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('instalacion_id', 'core.instalaciones', 'puesto_id', 'core.puestos');

COMMIT;

-- Reversión (manual, con el rol propietario, en una transacción; la migración no toca nada previo):
--   DROP SCHEMA "pauta" CASCADE;
-- Elimina las tres tablas con sus índices, FK, triggers y políticas tenant_isolation, y revoca los
-- GRANT / ALTER DEFAULT PRIVILEGES del schema. No hay datos previos que restaurar.
