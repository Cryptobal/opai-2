-- CAR-140 · Finanzas Ventas DTE PR 2: seguimiento envíos SII, cesiones/factoring y conectores por tenant.
-- Aditiva sobre ventas_pr1. RLS tenant_isolation + FORCE.

BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "finanzas"."dte_config"
  ADD COLUMN "emision_proveedor" TEXT NOT NULL DEFAULT 'simulado',
  ADD COLUMN "cesion_proveedor" TEXT,
  ADD COLUMN "certificado_secreto_id" UUID,
  ADD COLUMN "emision_api_key_secreto_id" UUID;

ALTER TABLE "finanzas"."dte_config" ADD CONSTRAINT "dte_config_emision_proveedor_chk"
  CHECK ("emision_proveedor" IN ('simulado', 'simpleapi'));
ALTER TABLE "finanzas"."dte_config" ADD CONSTRAINT "dte_config_cesion_proveedor_chk"
  CHECK ("cesion_proveedor" IS NULL OR "cesion_proveedor" IN ('octava'));

ALTER TABLE "finanzas"."dte_config" ADD CONSTRAINT "dte_config_certificado_secreto_id_fkey"
  FOREIGN KEY ("certificado_secreto_id") REFERENCES "core"."secretos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finanzas"."dte_config" ADD CONSTRAINT "dte_config_emision_api_key_secreto_id_fkey"
  FOREIGN KEY ("emision_api_key_secreto_id") REFERENCES "core"."secretos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "finanzas"."dte_config"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('certificado_secreto_id', 'core.secretos', 'emision_api_key_secreto_id', 'core.secretos');

CREATE TABLE "finanzas"."dte_envios" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "documento_id" UUID NOT NULL,
    "track_id" TEXT NOT NULL,
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "max_intentos" INTEGER NOT NULL DEFAULT 7,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "glosa" TEXT,
    "proxima_consulta_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "dte_envios_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "finanzas"."cesiones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "documento_id" UUID NOT NULL,
    "secuencia" INTEGER NOT NULL DEFAULT 1,
    "factor_rut" TEXT NOT NULL,
    "factor_nombre" TEXT,
    "tasa_bps" INTEGER NOT NULL DEFAULT 0,
    "anticipo" INTEGER NOT NULL,
    "merma" INTEGER NOT NULL DEFAULT 0,
    "saldo_factor" INTEGER NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'simulada',
    "proveedor" TEXT NOT NULL DEFAULT 'octava',
    "operacion_externa_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cesiones_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "dte_envios_tenant_id_estado_idx" ON "finanzas"."dte_envios"("tenant_id", "estado");
CREATE INDEX "dte_envios_tenant_id_documento_id_idx" ON "finanzas"."dte_envios"("tenant_id", "documento_id");
CREATE UNIQUE INDEX "cesiones_tenant_documento_secuencia_key" ON "finanzas"."cesiones"("tenant_id", "documento_id", "secuencia");
CREATE INDEX "cesiones_tenant_id_estado_idx" ON "finanzas"."cesiones"("tenant_id", "estado");

ALTER TABLE "finanzas"."dte_envios" ADD CONSTRAINT "dte_envios_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finanzas"."dte_envios" ADD CONSTRAINT "dte_envios_documento_id_fkey"
  FOREIGN KEY ("documento_id") REFERENCES "finanzas"."documentos_emitidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finanzas"."cesiones" ADD CONSTRAINT "cesiones_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finanzas"."cesiones" ADD CONSTRAINT "cesiones_documento_id_fkey"
  FOREIGN KEY ("documento_id") REFERENCES "finanzas"."documentos_emitidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "finanzas"."dte_envios" ADD CONSTRAINT "dte_envios_estado_chk"
  CHECK ("estado" IN ('pendiente', 'aceptado', 'rechazado'));
ALTER TABLE "finanzas"."dte_envios" ADD CONSTRAINT "dte_envios_intentos_chk"
  CHECK ("intentos" >= 0 AND "max_intentos" BETWEEN 1 AND 20);
ALTER TABLE "finanzas"."cesiones" ADD CONSTRAINT "cesiones_estado_chk"
  CHECK ("estado" IN ('simulada', 'enviada', 'aprobada', 'financiada', 'cobrada', 'cerrada', 'anulada'));
ALTER TABLE "finanzas"."cesiones" ADD CONSTRAINT "cesiones_montos_chk"
  CHECK ("anticipo" >= 0 AND "merma" >= 0 AND "saldo_factor" >= 0);

CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "finanzas"."dte_envios"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('documento_id', 'finanzas.documentos_emitidos');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "finanzas"."cesiones"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('documento_id', 'finanzas.documentos_emitidos');

ALTER TABLE "finanzas"."dte_envios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finanzas"."dte_envios" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "finanzas"."dte_envios" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "finanzas"."cesiones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finanzas"."cesiones" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "finanzas"."cesiones" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

COMMIT;
