-- CAR-138 (PR 6) · Capítulo por instalación de la propuesta técnica: texto de cada sección narrativa
-- (comprensión, alcance, exclusiones, turnos, accesos, rondas, protocolos, equipamiento, supervisión,
-- reportes y arranque). ADITIVA: tabla nueva y vacía; no toca tablas existentes ni migra datos. Con RLS
-- ENABLE + FORCE y la política `tenant_isolation`. Lo derivado del CPQ no se guarda: se calcula al generar el PDF.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "cpq"."propuesta_capitulos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "propuesta_id" UUID NOT NULL,
    "instalacion_id" UUID NOT NULL,
    "seccion_clave" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "origen" TEXT NOT NULL DEFAULT 'manual',
    "actualizado_por_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "propuesta_capitulos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "propuesta_capitulos_seccion_check" CHECK ("seccion_clave" IN (
      'comprension_servicio', 'alcance', 'exclusiones', 'turnos', 'accesos', 'rondas',
      'protocolos', 'equipamiento', 'supervision', 'reportes', 'arranque')),
    CONSTRAINT "propuesta_capitulos_origen_check" CHECK ("origen" IN ('manual', 'ia_aceptada')),
    CONSTRAINT "propuesta_capitulos_contenido_check" CHECK (char_length(btrim("contenido")) BETWEEN 1 AND 8000)
);
CREATE UNIQUE INDEX "propuesta_capitulos_propuesta_id_instalacion_id_seccion_clave_key"
  ON "cpq"."propuesta_capitulos"("propuesta_id", "instalacion_id", "seccion_clave");
CREATE INDEX "propuesta_capitulos_tenant_id_propuesta_id_idx" ON "cpq"."propuesta_capitulos"("tenant_id", "propuesta_id");

ALTER TABLE "cpq"."propuesta_capitulos" ADD CONSTRAINT "propuesta_capitulos_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cpq"."propuesta_capitulos" ADD CONSTRAINT "propuesta_capitulos_propuesta_id_fkey"
  FOREIGN KEY ("propuesta_id") REFERENCES "cpq"."propuestas_tecnicas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cpq"."propuesta_capitulos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cpq"."propuesta_capitulos" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "cpq"."propuesta_capitulos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TRIGGER mismo_tenant_propuesta_capitulos BEFORE INSERT OR UPDATE ON "cpq"."propuesta_capitulos"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('propuesta_id', 'cpq.propuestas_tecnicas');

COMMIT;

-- Reversión: DROP TABLE "cpq"."propuesta_capitulos"; (solo guarda textos del capítulo; ninguna otra tabla depende de ella).
