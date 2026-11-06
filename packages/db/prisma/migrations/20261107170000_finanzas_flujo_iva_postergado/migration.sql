-- Flujo de caja C (CAR-193, ADR-073 regla 5): meses cuyo IVA se posterga de M+1 a M+2 en el flujo.
-- Qué hace y por qué: Carlos marca o desmarca, mes a mes, la postergación del IVA; el PPM siempre se paga en M+1.
-- Sin fila para un mes rige el pago en M+1. Migración ADITIVA: solo crea una tabla nueva, con RLS
-- `tenant_isolation` (ENABLE + FORCE) para opai_app; no toca datos.

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "finanzas"."flujo_iva_postergado" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "periodo" TEXT NOT NULL,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "flujo_iva_postergado_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "flujo_iva_postergado_periodo_chk" CHECK ("periodo" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$')
);

CREATE UNIQUE INDEX "flujo_iva_postergado_tenant_id_periodo_key" ON "finanzas"."flujo_iva_postergado"("tenant_id", "periodo");

ALTER TABLE "finanzas"."flujo_iva_postergado" ADD CONSTRAINT "flujo_iva_postergado_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

GRANT SELECT, INSERT, UPDATE, DELETE ON "finanzas"."flujo_iva_postergado" TO opai_app;

ALTER TABLE "finanzas"."flujo_iva_postergado" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finanzas"."flujo_iva_postergado" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "finanzas"."flujo_iva_postergado" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

COMMIT;

-- Reversión: migración aditiva; si hace falta deshacerla antes de usarla:
-- DROP TABLE "finanzas"."flujo_iva_postergado"; (borra su política e índices). Con meses ya marcados no se borra:
-- se restaura desde el snapshot previo de Neon.
