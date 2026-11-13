-- CAR-356 (Estándares O-1) · Publicar la pauta y avisar a cada trabajador su turno. Decisión de Carlos, 13-nov-2026:
-- paso «Publicar» por instalación y mes; aviso al guardia en la campana de su portal (y en el celular, en un PR aparte);
-- sin WhatsApp.
--   · pauta.publicaciones: una fila por instalación y mes publicado (aaaa-mm), con quién y cuándo. Republicar
--     actualiza la misma fila; la pauta sigue rigiendo como antes (publicar marca cuándo se avisó, no oculta turnos).
-- Tabla con tenant_id: RLS + FORCE + política tenant_isolation. Aditiva, sin datos.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "pauta"."publicaciones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "instalacion_id" UUID NOT NULL,
    "mes" TEXT NOT NULL,
    "publicada_en" TIMESTAMPTZ(6) NOT NULL,
    "publicada_por" UUID,
    "avisados" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "publicaciones_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "publicaciones_mes_check" CHECK ("mes" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
    CONSTRAINT "publicaciones_avisados_check" CHECK ("avisados" >= 0)
);
CREATE UNIQUE INDEX "publicaciones_tenant_id_instalacion_id_mes_key"
    ON "pauta"."publicaciones"("tenant_id", "instalacion_id", "mes");
CREATE INDEX "publicaciones_tenant_id_mes_idx" ON "pauta"."publicaciones"("tenant_id", "mes");

ALTER TABLE "pauta"."publicaciones" ADD CONSTRAINT "publicaciones_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pauta"."publicaciones" ADD CONSTRAINT "publicaciones_instalacion_id_fkey"
    FOREIGN KEY ("instalacion_id") REFERENCES "core"."instalaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "pauta"."publicaciones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pauta"."publicaciones" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "pauta"."publicaciones" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE ON "pauta"."publicaciones" TO opai_app;

COMMIT;
