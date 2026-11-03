-- CAR-25 · Finanzas Ventas: plantillas de facturación recurrente (import 1.0 + UI mínima).
-- ADITIVA: tablas nuevas en schema `finanzas`. RLS tenant_isolation + FORCE para opai_app.

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "finanzas"."ventas_programaciones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "cuenta_id" UUID NOT NULL,
    "instalacion_id" UUID,
    "nombre" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "tipo_dte" INTEGER NOT NULL,
    "frecuencia" TEXT NOT NULL DEFAULT 'mensual',
    "dia_generacion" INTEGER NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'CLP',
    "plazo_pago_dias" INTEGER NOT NULL DEFAULT 30,
    "factura_timing" TEXT NOT NULL,
    "factura_dia" INTEGER,
    "factura_mes_relativo" TEXT NOT NULL,
    "dias_facturacion" INTEGER,
    "modo_periodo_facturado" TEXT NOT NULL DEFAULT 'CURRENT_MONTH',
    "politica_texto_periodo" TEXT NOT NULL DEFAULT 'CURRENT_MONTH',
    "monto_variable" BOOLEAN NOT NULL DEFAULT false,
    "auto_envio_proforma" BOOLEAN NOT NULL DEFAULT false,
    "auto_envio_estado_pago" BOOLEAN NOT NULL DEFAULT false,
    "notas" TEXT,
    "referencias_adicionales" JSONB NOT NULL DEFAULT '[]',
    "proxima_ejecucion_en" TIMESTAMPTZ(6),
    "ultima_ejecucion_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ventas_programaciones_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "finanzas"."ventas_programaciones_lineas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "programacion_id" UUID NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "glosa" TEXT NOT NULL,
    "monto" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ventas_programaciones_lineas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "finanzas"."ventas_programaciones_destinatarios" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "programacion_id" UUID NOT NULL,
    "contacto_id" UUID NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ventas_programaciones_destinatarios_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ventas_programaciones_tenant_id_cuenta_id_idx" ON "finanzas"."ventas_programaciones"("tenant_id", "cuenta_id");
CREATE INDEX "ventas_programaciones_tenant_id_activa_idx" ON "finanzas"."ventas_programaciones"("tenant_id", "activa");
CREATE INDEX "ventas_programaciones_lineas_tenant_id_programacion_id_idx" ON "finanzas"."ventas_programaciones_lineas"("tenant_id", "programacion_id");
CREATE INDEX "ventas_programaciones_destinatarios_tenant_id_programacion_id_idx" ON "finanzas"."ventas_programaciones_destinatarios"("tenant_id", "programacion_id");
CREATE UNIQUE INDEX "ventas_programaciones_destinatarios_tenant_programacion_contacto_key" ON "finanzas"."ventas_programaciones_destinatarios"("tenant_id", "programacion_id", "contacto_id");

ALTER TABLE "finanzas"."ventas_programaciones" ADD CONSTRAINT "ventas_programaciones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finanzas"."ventas_programaciones" ADD CONSTRAINT "ventas_programaciones_cuenta_id_fkey" FOREIGN KEY ("cuenta_id") REFERENCES "core"."cuentas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finanzas"."ventas_programaciones" ADD CONSTRAINT "ventas_programaciones_instalacion_id_fkey" FOREIGN KEY ("instalacion_id") REFERENCES "core"."instalaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finanzas"."ventas_programaciones_lineas" ADD CONSTRAINT "ventas_programaciones_lineas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finanzas"."ventas_programaciones_lineas" ADD CONSTRAINT "ventas_programaciones_lineas_programacion_id_fkey" FOREIGN KEY ("programacion_id") REFERENCES "finanzas"."ventas_programaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finanzas"."ventas_programaciones_destinatarios" ADD CONSTRAINT "ventas_programaciones_destinatarios_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finanzas"."ventas_programaciones_destinatarios" ADD CONSTRAINT "ventas_programaciones_destinatarios_programacion_id_fkey" FOREIGN KEY ("programacion_id") REFERENCES "finanzas"."ventas_programaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finanzas"."ventas_programaciones_destinatarios" ADD CONSTRAINT "ventas_programaciones_destinatarios_contacto_id_fkey" FOREIGN KEY ("contacto_id") REFERENCES "core"."contactos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "finanzas"."ventas_programaciones" ADD CONSTRAINT "ventas_programaciones_tipo_dte_chk"
  CHECK ("tipo_dte" IN (33, 34));
ALTER TABLE "finanzas"."ventas_programaciones" ADD CONSTRAINT "ventas_programaciones_dia_generacion_chk"
  CHECK ("dia_generacion" BETWEEN 1 AND 31);
ALTER TABLE "finanzas"."ventas_programaciones" ADD CONSTRAINT "ventas_programaciones_plazo_pago_chk"
  CHECK ("plazo_pago_dias" BETWEEN 0 AND 365);
ALTER TABLE "finanzas"."ventas_programaciones_lineas" ADD CONSTRAINT "ventas_programaciones_lineas_monto_chk"
  CHECK ("monto" >= 0);

ALTER TABLE "finanzas"."ventas_programaciones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finanzas"."ventas_programaciones" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "finanzas"."ventas_programaciones" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "finanzas"."ventas_programaciones_lineas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finanzas"."ventas_programaciones_lineas" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "finanzas"."ventas_programaciones_lineas" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "finanzas"."ventas_programaciones_destinatarios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finanzas"."ventas_programaciones_destinatarios" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "finanzas"."ventas_programaciones_destinatarios" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "finanzas"."ventas_programaciones"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('cuenta_id', 'core.cuentas', 'instalacion_id', 'core.instalaciones');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "finanzas"."ventas_programaciones_lineas"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('programacion_id', 'finanzas.ventas_programaciones');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "finanzas"."ventas_programaciones_destinatarios"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('programacion_id', 'finanzas.ventas_programaciones', 'contacto_id', 'core.contactos');

COMMIT;

-- Reversión (manual, rol propietario):
--   DROP TABLE "finanzas"."ventas_programaciones_destinatarios";
--   DROP TABLE "finanzas"."ventas_programaciones_lineas";
--   DROP TABLE "finanzas"."ventas_programaciones";
