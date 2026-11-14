-- CAR-83 (Brief 12, Supervisión y visitas, PR 1) · Visitas de supervisión. Decisiones B6–B8 (29-oct-2026, adenda del
-- 8-nov a ADR-083); detalle en docs/2.0/briefs/BRIEF-CAR-83-supervision-visitas.md.
--   · pauta.visitas: una fila por visita. Hora del servidor; ubicación opcional que nunca bloquea; lista de revisión
--     y observaciones al cerrar. Una sola visita en curso por supervisor (índice único parcial).
-- Tabla con tenant_id: RLS + FORCE + política tenant_isolation. Aditiva, sin datos.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "pauta"."visitas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "instalacion_id" UUID NOT NULL,
    "supervisor_id" UUID NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'en_curso',
    "iniciada_en" TIMESTAMPTZ(6) NOT NULL,
    "cerrada_en" TIMESTAMPTZ(6),
    "lat" DECIMAL(10,7),
    "lng" DECIMAL(10,7),
    "precision_m" INTEGER,
    "distancia_m" INTEGER,
    "geocerca" TEXT NOT NULL,
    "checklist" JSONB NOT NULL DEFAULT '[]',
    "observaciones" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "visitas_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "visitas_estado_check" CHECK ("estado" IN ('en_curso', 'cerrada')),
    CONSTRAINT "visitas_geocerca_check" CHECK ("geocerca" IN ('dentro', 'fuera', 'sin_gps', 'sin_ubicacion')),
    CONSTRAINT "visitas_cierre_check" CHECK (("estado" = 'cerrada') = ("cerrada_en" IS NOT NULL)),
    CONSTRAINT "visitas_precision_check" CHECK ("precision_m" IS NULL OR "precision_m" >= 0),
    CONSTRAINT "visitas_distancia_check" CHECK ("distancia_m" IS NULL OR "distancia_m" >= 0)
);
CREATE INDEX "visitas_tenant_id_instalacion_id_iniciada_en_idx" ON "pauta"."visitas"("tenant_id", "instalacion_id", "iniciada_en");
CREATE INDEX "visitas_tenant_id_supervisor_id_iniciada_en_idx" ON "pauta"."visitas"("tenant_id", "supervisor_id", "iniciada_en");
CREATE UNIQUE INDEX "visitas_una_en_curso_por_supervisor"
    ON "pauta"."visitas"("tenant_id", "supervisor_id") WHERE "estado" = 'en_curso';

ALTER TABLE "pauta"."visitas" ADD CONSTRAINT "visitas_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pauta"."visitas" ADD CONSTRAINT "visitas_instalacion_id_fkey"
    FOREIGN KEY ("instalacion_id") REFERENCES "core"."instalaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pauta"."visitas" ADD CONSTRAINT "visitas_supervisor_id_fkey"
    FOREIGN KEY ("supervisor_id") REFERENCES "core"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "pauta"."visitas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pauta"."visitas" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "pauta"."visitas" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE ON "pauta"."visitas" TO opai_app;

COMMIT;

-- Reversión: DROP TABLE "pauta"."visitas"; (tabla nueva sin otras dependencias; se puede restaurar desde el snapshot
-- previo de Neon).
