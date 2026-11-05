-- Flujo de caja B2 (CAR-193, ADR-073): fecha esperada de cobro fijada a mano por factura.
-- Qué hace y por qué: la fecha con que el flujo ubica un cobro futuro es automática (promedio real de pago del
-- cliente con 3 o más facturas pagadas; si no, el vencimiento). Esta tabla guarda solo la que alguien fija a mano
-- sobre una factura; sin fila rige la automática. Migración ADITIVA: solo crea una tabla nueva, con RLS
-- `tenant_isolation` (ENABLE + FORCE) para opai_app y trigger mismo_tenant sobre la factura.

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "finanzas"."flujo_cobro_esperado" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "documento_id" UUID NOT NULL,
    "fecha" DATE NOT NULL,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "flujo_cobro_esperado_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "flujo_cobro_esperado_documento_id_key" ON "finanzas"."flujo_cobro_esperado"("documento_id");
CREATE INDEX "flujo_cobro_esperado_tenant_id_idx" ON "finanzas"."flujo_cobro_esperado"("tenant_id");

ALTER TABLE "finanzas"."flujo_cobro_esperado" ADD CONSTRAINT "flujo_cobro_esperado_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finanzas"."flujo_cobro_esperado" ADD CONSTRAINT "flujo_cobro_esperado_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "finanzas"."documentos_emitidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

GRANT SELECT, INSERT, UPDATE, DELETE ON "finanzas"."flujo_cobro_esperado" TO opai_app;

ALTER TABLE "finanzas"."flujo_cobro_esperado" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finanzas"."flujo_cobro_esperado" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "finanzas"."flujo_cobro_esperado" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- La factura debe ser de la misma empresa.
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "finanzas"."flujo_cobro_esperado"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('documento_id', 'finanzas.documentos_emitidos');

COMMIT;

-- Reversión: migración aditiva; si hace falta deshacerla antes de usarla:
-- DROP TABLE "finanzas"."flujo_cobro_esperado"; (borra su política, índices y trigger). Con fechas ya fijadas
-- no se borra: se restaura desde el snapshot previo de Neon.
