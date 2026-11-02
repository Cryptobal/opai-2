-- CAR-97 · Finanzas Bancos PR 1: cuentas, cartolas, movimientos, conciliaciones y reglas.
-- Migración ADITIVA sobre schema `finanzas`. RLS FORCE + tenant_isolation en tablas con tenant_id.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "finanzas"."cuentas_bancarias" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "banco" TEXT NOT NULL,
    "numero_visible" TEXT NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'CLP',
    "flujo_fila_id" UUID,
    "mapeo_columnas" JSONB,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "cuentas_bancarias_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "finanzas"."cartolas_importadas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "cuenta_id" UUID NOT NULL,
    "formato" TEXT NOT NULL,
    "nombre_archivo" TEXT,
    "fecha_desde" DATE,
    "fecha_hasta" DATE,
    "saldo_final" BIGINT NOT NULL,
    "movimientos_nuevos" INTEGER NOT NULL DEFAULT 0,
    "duplicados" INTEGER NOT NULL DEFAULT 0,
    "rechazados" INTEGER NOT NULL DEFAULT 0,
    "idempotency_key" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cartolas_importadas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "finanzas"."movimientos_bancarios" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "cuenta_id" UUID NOT NULL,
    "cartola_id" UUID,
    "fecha" DATE NOT NULL,
    "monto" BIGINT NOT NULL,
    "glosa" TEXT NOT NULL,
    "referencia" TEXT,
    "sucursal" TEXT,
    "saldo_despues" BIGINT,
    "clave_dedupe" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "origen" TEXT NOT NULL DEFAULT 'cartola',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "movimientos_bancarios_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "finanzas"."conciliaciones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "movimiento_id" UUID NOT NULL,
    "tipo_enlace" TEXT NOT NULL,
    "enlace_id" UUID NOT NULL,
    "monto" BIGINT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "propuesta" BOOLEAN NOT NULL DEFAULT false,
    "confirmada" BOOLEAN NOT NULL DEFAULT false,
    "explicacion" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" UUID,
    CONSTRAINT "conciliaciones_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "finanzas"."reglas_conciliacion" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "prioridad" INTEGER NOT NULL DEFAULT 0,
    "modo" TEXT NOT NULL DEFAULT 'todas',
    "condiciones" JSONB NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "reglas_conciliacion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "finanzas"."banco_avisos_emitidos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "cuenta_id" UUID NOT NULL,
    "dia" DATE NOT NULL,
    "saldo" BIGINT NOT NULL,
    "emitido_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "banco_avisos_emitidos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cuentas_bancarias_tenant_id_banco_numero_visible_key"
  ON "finanzas"."cuentas_bancarias"("tenant_id", "banco", "numero_visible");
CREATE INDEX "cuentas_bancarias_tenant_id_activa_idx"
  ON "finanzas"."cuentas_bancarias"("tenant_id", "activa");

CREATE UNIQUE INDEX "cartolas_importadas_tenant_id_idempotency_key_key"
  ON "finanzas"."cartolas_importadas"("tenant_id", "idempotency_key");
CREATE INDEX "cartolas_importadas_tenant_id_cuenta_id_created_at_idx"
  ON "finanzas"."cartolas_importadas"("tenant_id", "cuenta_id", "created_at");

CREATE UNIQUE INDEX "movimientos_bancarios_tenant_id_cuenta_id_clave_dedupe_key"
  ON "finanzas"."movimientos_bancarios"("tenant_id", "cuenta_id", "clave_dedupe");
CREATE INDEX "movimientos_bancarios_tenant_id_cuenta_id_estado_fecha_idx"
  ON "finanzas"."movimientos_bancarios"("tenant_id", "cuenta_id", "estado", "fecha");

CREATE INDEX "conciliaciones_tenant_id_movimiento_id_activa_idx"
  ON "finanzas"."conciliaciones"("tenant_id", "movimiento_id", "activa");
CREATE INDEX "conciliaciones_tenant_id_tipo_enlace_enlace_id_idx"
  ON "finanzas"."conciliaciones"("tenant_id", "tipo_enlace", "enlace_id");

CREATE INDEX "reglas_conciliacion_tenant_id_activa_prioridad_idx"
  ON "finanzas"."reglas_conciliacion"("tenant_id", "activa", "prioridad");

CREATE UNIQUE INDEX "banco_avisos_emitidos_tenant_id_cuenta_id_dia_key"
  ON "finanzas"."banco_avisos_emitidos"("tenant_id", "cuenta_id", "dia");

ALTER TABLE "finanzas"."cuentas_bancarias" ADD CONSTRAINT "cuentas_bancarias_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finanzas"."cartolas_importadas" ADD CONSTRAINT "cartolas_importadas_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finanzas"."cartolas_importadas" ADD CONSTRAINT "cartolas_importadas_cuenta_id_fkey"
  FOREIGN KEY ("cuenta_id") REFERENCES "finanzas"."cuentas_bancarias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finanzas"."movimientos_bancarios" ADD CONSTRAINT "movimientos_bancarios_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finanzas"."movimientos_bancarios" ADD CONSTRAINT "movimientos_bancarios_cuenta_id_fkey"
  FOREIGN KEY ("cuenta_id") REFERENCES "finanzas"."cuentas_bancarias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finanzas"."movimientos_bancarios" ADD CONSTRAINT "movimientos_bancarios_cartola_id_fkey"
  FOREIGN KEY ("cartola_id") REFERENCES "finanzas"."cartolas_importadas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "finanzas"."conciliaciones" ADD CONSTRAINT "conciliaciones_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finanzas"."conciliaciones" ADD CONSTRAINT "conciliaciones_movimiento_id_fkey"
  FOREIGN KEY ("movimiento_id") REFERENCES "finanzas"."movimientos_bancarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finanzas"."reglas_conciliacion" ADD CONSTRAINT "reglas_conciliacion_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finanzas"."banco_avisos_emitidos" ADD CONSTRAINT "banco_avisos_emitidos_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "finanzas"."cuentas_bancarias" ADD CONSTRAINT "cuentas_bancarias_formato_chk"
  CHECK ("moneda" IN ('CLP'));
ALTER TABLE "finanzas"."cartolas_importadas" ADD CONSTRAINT "cartolas_importadas_formato_chk"
  CHECK ("formato" IN ('santander', 'generico'));
ALTER TABLE "finanzas"."movimientos_bancarios" ADD CONSTRAINT "movimientos_bancarios_estado_chk"
  CHECK ("estado" IN ('pendiente', 'sugerido', 'conciliado', 'por_autorizar', 'ignorado'));
ALTER TABLE "finanzas"."movimientos_bancarios" ADD CONSTRAINT "movimientos_bancarios_origen_chk"
  CHECK ("origen" IN ('cartola', 'manual', 'web4leads'));
ALTER TABLE "finanzas"."conciliaciones" ADD CONSTRAINT "conciliaciones_tipo_enlace_chk"
  CHECK ("tipo_enlace" IN ('documento_emitido', 'documento_recibido', 'flujo_fila'));
ALTER TABLE "finanzas"."conciliaciones" ADD CONSTRAINT "conciliaciones_monto_chk"
  CHECK ("monto" <> 0);
ALTER TABLE "finanzas"."reglas_conciliacion" ADD CONSTRAINT "reglas_conciliacion_modo_chk"
  CHECK ("modo" IN ('todas', 'alguna'));

CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "finanzas"."cuentas_bancarias"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('flujo_fila_id', 'finanzas.flujo_filas');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "finanzas"."cartolas_importadas"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('cuenta_id', 'finanzas.cuentas_bancarias');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "finanzas"."movimientos_bancarios"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('cuenta_id', 'finanzas.cuentas_bancarias', 'cartola_id', 'finanzas.cartolas_importadas');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "finanzas"."conciliaciones"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('movimiento_id', 'finanzas.movimientos_bancarios');

ALTER TABLE "finanzas"."cuentas_bancarias" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finanzas"."cuentas_bancarias" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "finanzas"."cuentas_bancarias" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "finanzas"."cartolas_importadas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finanzas"."cartolas_importadas" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "finanzas"."cartolas_importadas" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "finanzas"."movimientos_bancarios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finanzas"."movimientos_bancarios" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "finanzas"."movimientos_bancarios" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "finanzas"."conciliaciones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finanzas"."conciliaciones" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "finanzas"."conciliaciones" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "finanzas"."reglas_conciliacion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finanzas"."reglas_conciliacion" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "finanzas"."reglas_conciliacion" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "finanzas"."banco_avisos_emitidos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finanzas"."banco_avisos_emitidos" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "finanzas"."banco_avisos_emitidos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

COMMIT;

-- Reversión (manual, con respaldo previo): DROP en orden inverso de dependencias:
--   DROP TABLE "finanzas"."banco_avisos_emitidos";
--   DROP TABLE "finanzas"."conciliaciones";
--   DROP TABLE "finanzas"."movimientos_bancarios";
--   DROP TABLE "finanzas"."cartolas_importadas";
--   DROP TABLE "finanzas"."reglas_conciliacion";
--   DROP TABLE "finanzas"."cuentas_bancarias";
