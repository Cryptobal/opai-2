-- CAR-137 · Finanzas Ventas DTE PR 1: libro de ventas, folios/CAF, configuración DTE y emisión 33/34/61.
-- Migración ADITIVA: solo crea tablas nuevas en schema `finanzas`. RLS tenant_isolation + FORCE para opai_app.

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "finanzas"."dte_folios" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tipo_dte" INTEGER NOT NULL,
    "folio_desde" INTEGER NOT NULL,
    "folio_hasta" INTEGER NOT NULL,
    "folio_actual" INTEGER NOT NULL,
    "caf_secreto_id" UUID,
    "caf_vence_en" DATE,
    "umbral_aviso" INTEGER NOT NULL DEFAULT 20,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "dte_folios_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "finanzas"."documentos_emitidos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "cuenta_id" UUID NOT NULL,
    "instalacion_id" UUID,
    "cotizacion_id" UUID,
    "tipo_dte" INTEGER NOT NULL,
    "folio" INTEGER,
    "fecha_emision" DATE,
    "fecha_vencimiento" DATE,
    "monto_neto" INTEGER NOT NULL DEFAULT 0,
    "monto_exento" INTEGER NOT NULL DEFAULT 0,
    "monto_iva" INTEGER NOT NULL DEFAULT 0,
    "monto_otros" INTEGER NOT NULL DEFAULT 0,
    "monto_total" INTEGER NOT NULL DEFAULT 0,
    "estado_dte" TEXT NOT NULL DEFAULT 'borrador',
    "estado_cobro" TEXT NOT NULL DEFAULT 'pendiente',
    "monto_cobrado" INTEGER NOT NULL DEFAULT 0,
    "glosa" TEXT,
    "xml_storage_key" TEXT,
    "timbre_pdf417" TEXT,
    "track_id_sii" TEXT,
    "documento_referencia_id" UUID,
    "codigo_referencia" INTEGER,
    "motivo_nc" TEXT,
    "cesion_estado" TEXT,
    "cesion_proveedor" TEXT,
    "cesion_operacion_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "documentos_emitidos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "finanzas"."documentos_emitidos_lineas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "documento_id" UUID NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "glosa" TEXT NOT NULL,
    "monto" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentos_emitidos_lineas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "finanzas"."documentos_emitidos_referencias" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "documento_id" UUID NOT NULL,
    "tipo_dte_ref" INTEGER NOT NULL,
    "folio_ref" INTEGER NOT NULL,
    "codigo_ref" INTEGER NOT NULL,
    "razon_ref" TEXT,

    CONSTRAINT "documentos_emitidos_referencias_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "finanzas"."dte_config" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "ambiente" TEXT NOT NULL DEFAULT 'certificacion',
    "rut_emisor" TEXT,
    "umbral_folios_pct" INTEGER NOT NULL DEFAULT 20,
    "aviso_caf_dias" INTEGER NOT NULL DEFAULT 30,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "dte_config_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "dte_folios_tenant_id_tipo_dte_activo_idx" ON "finanzas"."dte_folios"("tenant_id", "tipo_dte", "activo");
CREATE INDEX "documentos_emitidos_tenant_id_estado_dte_fecha_emision_idx" ON "finanzas"."documentos_emitidos"("tenant_id", "estado_dte", "fecha_emision");
CREATE INDEX "documentos_emitidos_tenant_id_cuenta_id_idx" ON "finanzas"."documentos_emitidos"("tenant_id", "cuenta_id");
CREATE INDEX "documentos_emitidos_tenant_id_cotizacion_id_idx" ON "finanzas"."documentos_emitidos"("tenant_id", "cotizacion_id");
CREATE INDEX "documentos_emitidos_lineas_tenant_id_documento_id_idx" ON "finanzas"."documentos_emitidos_lineas"("tenant_id", "documento_id");
CREATE INDEX "documentos_emitidos_referencias_tenant_id_documento_id_idx" ON "finanzas"."documentos_emitidos_referencias"("tenant_id", "documento_id");
CREATE UNIQUE INDEX "dte_config_tenant_id_key" ON "finanzas"."dte_config"("tenant_id");
CREATE UNIQUE INDEX "documentos_emitidos_tenant_tipo_folio_key" ON "finanzas"."documentos_emitidos"("tenant_id", "tipo_dte", "folio") WHERE "folio" IS NOT NULL;

ALTER TABLE "finanzas"."documentos_emitidos_lineas" ADD CONSTRAINT "documentos_emitidos_lineas_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "finanzas"."documentos_emitidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finanzas"."documentos_emitidos_referencias" ADD CONSTRAINT "documentos_emitidos_referencias_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "finanzas"."documentos_emitidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "finanzas"."dte_folios" ADD CONSTRAINT "dte_folios_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finanzas"."documentos_emitidos" ADD CONSTRAINT "documentos_emitidos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finanzas"."documentos_emitidos" ADD CONSTRAINT "documentos_emitidos_cuenta_id_fkey" FOREIGN KEY ("cuenta_id") REFERENCES "core"."cuentas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finanzas"."documentos_emitidos" ADD CONSTRAINT "documentos_emitidos_instalacion_id_fkey" FOREIGN KEY ("instalacion_id") REFERENCES "core"."instalaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finanzas"."documentos_emitidos" ADD CONSTRAINT "documentos_emitidos_cotizacion_id_fkey" FOREIGN KEY ("cotizacion_id") REFERENCES "cpq"."cotizaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finanzas"."documentos_emitidos_lineas" ADD CONSTRAINT "documentos_emitidos_lineas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finanzas"."documentos_emitidos_referencias" ADD CONSTRAINT "documentos_emitidos_referencias_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finanzas"."dte_config" ADD CONSTRAINT "dte_config_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "finanzas"."dte_folios" ADD CONSTRAINT "dte_folios_rango_chk"
  CHECK ("folio_desde" >= 1 AND "folio_hasta" >= "folio_desde" AND "folio_actual" BETWEEN "folio_desde" AND "folio_hasta" + 1);
ALTER TABLE "finanzas"."documentos_emitidos" ADD CONSTRAINT "documentos_emitidos_estado_dte_chk"
  CHECK ("estado_dte" IN ('borrador', 'enviado', 'aceptado', 'rechazado', 'anulado_nc'));
ALTER TABLE "finanzas"."documentos_emitidos" ADD CONSTRAINT "documentos_emitidos_estado_cobro_chk"
  CHECK ("estado_cobro" IN ('pendiente', 'pagada_parcial', 'pagada'));
ALTER TABLE "finanzas"."documentos_emitidos" ADD CONSTRAINT "documentos_emitidos_cesion_estado_chk"
  CHECK ("cesion_estado" IS NULL OR "cesion_estado" IN ('emitido', 'cedido', 'no_cedido'));
ALTER TABLE "finanzas"."documentos_emitidos" ADD CONSTRAINT "documentos_emitidos_montos_chk"
  CHECK ("monto_neto" >= 0 AND "monto_exento" >= 0 AND "monto_iva" >= 0 AND "monto_otros" >= 0
    AND "monto_total" = "monto_neto" + "monto_exento" + "monto_iva" + "monto_otros");
ALTER TABLE "finanzas"."dte_config" ADD CONSTRAINT "dte_config_ambiente_chk"
  CHECK ("ambiente" IN ('certificacion', 'produccion'));
ALTER TABLE "finanzas"."dte_config" ADD CONSTRAINT "dte_config_umbral_folios_pct_chk"
  CHECK ("umbral_folios_pct" BETWEEN 1 AND 100);
ALTER TABLE "finanzas"."dte_config" ADD CONSTRAINT "dte_config_aviso_caf_dias_chk"
  CHECK ("aviso_caf_dias" BETWEEN 1 AND 365);

ALTER TABLE "finanzas"."dte_folios" ADD CONSTRAINT "dte_folios_caf_secreto_id_fkey" FOREIGN KEY ("caf_secreto_id") REFERENCES "core"."secretos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "finanzas"."dte_folios"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('caf_secreto_id', 'core.secretos');

ALTER TABLE "finanzas"."dte_folios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finanzas"."dte_folios" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "finanzas"."dte_folios" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "finanzas"."documentos_emitidos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finanzas"."documentos_emitidos" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "finanzas"."documentos_emitidos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "finanzas"."documentos_emitidos_lineas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finanzas"."documentos_emitidos_lineas" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "finanzas"."documentos_emitidos_lineas" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "finanzas"."documentos_emitidos_referencias" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finanzas"."documentos_emitidos_referencias" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "finanzas"."documentos_emitidos_referencias" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "finanzas"."dte_config" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finanzas"."dte_config" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "finanzas"."dte_config" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "finanzas"."documentos_emitidos"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('cuenta_id', 'core.cuentas', 'instalacion_id', 'core.instalaciones', 'cotizacion_id', 'cpq.cotizaciones', 'documento_referencia_id', 'finanzas.documentos_emitidos');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "finanzas"."documentos_emitidos_lineas"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('documento_id', 'finanzas.documentos_emitidos');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "finanzas"."documentos_emitidos_referencias"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('documento_id', 'finanzas.documentos_emitidos');

COMMIT;

-- Reversión (manual, rol propietario). NO DROP SCHEMA CASCADE. Orden:
--   DROP TABLE "finanzas"."documentos_emitidos_referencias";
--   DROP TABLE "finanzas"."documentos_emitidos_lineas";
--   DROP TABLE "finanzas"."documentos_emitidos";
--   DROP TABLE "finanzas"."dte_folios";
--   DROP TABLE "finanzas"."dte_config";
