-- CAR-84, Brief 13 · PR 1: schema `tickets` con tipos de ticket configurables, tickets (estados
-- ADR-025, prioridad) y su línea de tiempo (comentarios y cambios). Migración ADITIVA: solo crea
-- objetos nuevos, sin DROP ni cambios en tablas existentes. Toda tabla con tenant_id lleva RLS
-- `tenant_isolation` (ENABLE + FORCE) para opai_app, que es NOBYPASSRLS. El vínculo polimórfico a
-- otras entidades y los adjuntos vía `core.documentos` llegan en el PR 2.

BEGIN;
SET LOCAL lock_timeout = '5s';

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "tickets";

-- CreateTable
CREATE TABLE "tickets"."tipos_ticket" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "responsable_defecto_tipo" TEXT NOT NULL DEFAULT 'rol',
    "responsable_defecto_rol" TEXT,
    "responsable_defecto_usuario_id" UUID,
    "requiere_aprobacion" BOOLEAN NOT NULL DEFAULT false,
    "aprobador_rol" TEXT,
    "sla_horas" INTEGER,
    "roles_permitidos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tipos_ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets"."tickets" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tipo_id" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "prioridad" TEXT NOT NULL DEFAULT 'p3',
    "estado" TEXT NOT NULL DEFAULT 'abierto',
    "solicitante_id" UUID NOT NULL,
    "responsable_id" UUID NOT NULL,
    "motivo_rechazo" TEXT,
    "datos_solicitud" JSONB NOT NULL DEFAULT '{}',
    "sla_vence_en" TIMESTAMPTZ(6),
    "resuelto_en" TIMESTAMPTZ(6),
    "cerrado_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets"."ticket_eventos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "actor_id" UUID NOT NULL,
    "comentario" TEXT,
    "estado_desde" TEXT,
    "estado_hasta" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_eventos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tipos_ticket_tenant_id_nombre_key" ON "tickets"."tipos_ticket"("tenant_id", "nombre");
CREATE INDEX "tipos_ticket_tenant_id_idx" ON "tickets"."tipos_ticket"("tenant_id");

CREATE INDEX "tickets_tenant_id_estado_idx" ON "tickets"."tickets"("tenant_id", "estado");
CREATE INDEX "tickets_tenant_id_responsable_id_idx" ON "tickets"."tickets"("tenant_id", "responsable_id");
CREATE INDEX "tickets_tenant_id_solicitante_id_idx" ON "tickets"."tickets"("tenant_id", "solicitante_id");
CREATE INDEX "tickets_tenant_id_tipo_id_idx" ON "tickets"."tickets"("tenant_id", "tipo_id");

CREATE INDEX "ticket_eventos_tenant_id_ticket_id_idx" ON "tickets"."ticket_eventos"("tenant_id", "ticket_id");

-- AddForeignKey (schema propio y core.tenants/core.users; sin tocar tablas del núcleo)
ALTER TABLE "tickets"."tipos_ticket" ADD CONSTRAINT "tipos_ticket_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tickets"."tipos_ticket" ADD CONSTRAINT "tipos_ticket_responsable_defecto_usuario_id_fkey" FOREIGN KEY ("responsable_defecto_usuario_id") REFERENCES "core"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tickets"."tickets" ADD CONSTRAINT "tickets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tickets"."tickets" ADD CONSTRAINT "tickets_tipo_id_fkey" FOREIGN KEY ("tipo_id") REFERENCES "tickets"."tipos_ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tickets"."tickets" ADD CONSTRAINT "tickets_solicitante_id_fkey" FOREIGN KEY ("solicitante_id") REFERENCES "core"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tickets"."tickets" ADD CONSTRAINT "tickets_responsable_id_fkey" FOREIGN KEY ("responsable_id") REFERENCES "core"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tickets"."ticket_eventos" ADD CONSTRAINT "ticket_eventos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tickets"."ticket_eventos" ADD CONSTRAINT "ticket_eventos_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"."tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tickets"."ticket_eventos" ADD CONSTRAINT "ticket_eventos_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "core"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Grants (GRANT USAGE + ALTER DEFAULT PRIVILEGES al crear un schema nuevo, ver REGLAS-codigo.md)
GRANT USAGE ON SCHEMA "tickets" TO opai_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "tickets" TO opai_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "tickets" TO opai_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA "tickets" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO opai_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA "tickets" GRANT USAGE, SELECT ON SEQUENCES TO opai_app;

-- Row-Level Security: una política `tenant_isolation` por tabla, para opai_app (NOBYPASSRLS).
ALTER TABLE "tickets"."tipos_ticket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tickets"."tipos_ticket" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "tickets"."tipos_ticket" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "tickets"."tickets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tickets"."tickets" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "tickets"."tickets" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "tickets"."ticket_eventos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tickets"."ticket_eventos" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "tickets"."ticket_eventos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- Referencias dentro del mismo tenant (trigger del núcleo `core.verificar_mismo_tenant`); los FK a
-- core.users no llevan este trigger porque users no tiene tenant_id (identidad global, ADR-015).
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "tickets"."tickets"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('tipo_id', 'tickets.tipos_ticket');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "tickets"."ticket_eventos"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('ticket_id', 'tickets.tickets');

COMMIT;

-- Reversión (manual, con el rol propietario, en una transacción): sin datos de negocio que migrar
-- (el schema es nuevo), basta con:
--   DROP SCHEMA "tickets" CASCADE;
-- Elimina las 3 tablas, sus índices, FKs, triggers y la política tenant_isolation de cada una, y
-- revoca los GRANT/ALTER DEFAULT PRIVILEGES sobre el schema al desaparecer. Exige haber revertido
-- antes el código del módulo (manifest y capacidades `tickets.*`) para que nada siga escribiendo ahí.
