-- CAR-99 · Cumplimiento DT: registro en Mi DT de altas, bajas y anexos (comprobante y fecha).
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "nomina"."registros_mi_dt" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "movimiento_tipo" TEXT NOT NULL,
    "referencia_id" UUID NOT NULL,
    "persona_id" UUID NOT NULL,
    "hecho_en" DATE NOT NULL,
    "registrado_en" DATE NOT NULL,
    "documento_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "registros_mi_dt_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "registros_mi_dt_tipo_check" CHECK ("movimiento_tipo" IN ('alta', 'baja', 'anexo')),
    CONSTRAINT "registros_mi_dt_tenant_movimiento_referencia_key" UNIQUE ("tenant_id", "movimiento_tipo", "referencia_id")
);

CREATE INDEX "registros_mi_dt_tenant_persona_idx" ON "nomina"."registros_mi_dt" ("tenant_id", "persona_id");

ALTER TABLE "nomina"."registros_mi_dt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "nomina"."registros_mi_dt" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "nomina"."registros_mi_dt" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "nomina"."registros_mi_dt"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'persona_id', 'core.personas',
    'documento_id', 'core.documentos');

COMMIT;

-- Reversión: DROP TABLE "nomina"."registros_mi_dt";