-- Central · CAR-509 (Brief 15b · PR 4b): propuestas del agente (R10, CA3). Migración aditiva, sin
-- datos: una tabla con RLS + FORCE + tenant_isolation y FK compuesta a la alerta del mismo tenant.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "central"."propuestas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "alerta_id" UUID NOT NULL,
    "accion" TEXT NOT NULL,
    "nota" TEXT,
    "minutos" INTEGER,
    "severidad" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "api_key_id" UUID,
    "propuesta_por_id" UUID,
    "resuelta_por_id" UUID,
    "resuelta_en" TIMESTAMPTZ(6),
    "motivo_rechazo" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "propuestas_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "propuestas_accion_check" CHECK ("accion" IN ('resolver', 'falsa_alarma', 'reabrir', 'posponer', 'bajar_severidad')),
    CONSTRAINT "propuestas_estado_check" CHECK ("estado" IN ('pendiente', 'aceptada', 'rechazada')),
    CONSTRAINT "propuestas_minutos_check" CHECK (("accion" = 'posponer') = ("minutos" IS NOT NULL)),
    CONSTRAINT "propuestas_severidad_check" CHECK (("accion" = 'bajar_severidad') = ("severidad" IS NOT NULL)
      AND ("severidad" IS NULL OR "severidad" IN ('critica', 'alta', 'media', 'baja'))),
    CONSTRAINT "propuestas_resuelta_check" CHECK (("estado" = 'pendiente') = ("resuelta_en" IS NULL))
);

-- Una sola propuesta pendiente por alerta y acción.
CREATE UNIQUE INDEX "propuestas_una_pendiente" ON "central"."propuestas"("tenant_id", "alerta_id", "accion")
  WHERE "estado" = 'pendiente';
CREATE INDEX "propuestas_tenant_id_estado_idx" ON "central"."propuestas"("tenant_id", "estado");
CREATE INDEX "propuestas_tenant_id_alerta_id_idx" ON "central"."propuestas"("tenant_id", "alerta_id");

ALTER TABLE "central"."propuestas" ADD CONSTRAINT "propuestas_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "central"."propuestas" ADD CONSTRAINT "propuestas_tenant_id_alerta_id_fkey"
  FOREIGN KEY ("tenant_id", "alerta_id") REFERENCES "central"."alertas"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "central"."propuestas" ADD CONSTRAINT "propuestas_propuesta_por_id_fkey"
  FOREIGN KEY ("propuesta_por_id") REFERENCES "core"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "central"."propuestas" ADD CONSTRAINT "propuestas_resuelta_por_id_fkey"
  FOREIGN KEY ("resuelta_por_id") REFERENCES "core"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "central"."propuestas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "central"."propuestas" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "central"."propuestas" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "central"."propuestas" TO opai_app;

COMMIT;

-- Reversión: DROP TABLE IF EXISTS "central"."propuestas";
