-- CAR-213 · Costos predefinidos por empresa que se cargan solos en cada cotización (aditivo, reversible:
-- DROP TABLE "cpq"."costos_predefinidos"). Sin filas no cambia nada.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "cpq"."costos_predefinidos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "categoria" TEXT NOT NULL,
    "monto_clp" INTEGER NOT NULL,
    "alcance" TEXT NOT NULL DEFAULT 'global',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "costos_predefinidos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "costos_predefinidos_monto_check" CHECK ("monto_clp" >= 0),
    CONSTRAINT "costos_predefinidos_categoria_check" CHECK ("categoria" <> 'feriados'),
    CONSTRAINT "costos_predefinidos_alcance_check" CHECK ("alcance" IN ('global', 'por_puesto'))
);
CREATE UNIQUE INDEX "costos_predefinidos_tenant_id_categoria_alcance_key" ON "cpq"."costos_predefinidos"("tenant_id", "categoria", "alcance");
CREATE INDEX "costos_predefinidos_tenant_id_activo_idx" ON "cpq"."costos_predefinidos"("tenant_id", "activo");

ALTER TABLE "cpq"."costos_predefinidos" ADD CONSTRAINT "costos_predefinidos_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cpq"."costos_predefinidos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cpq"."costos_predefinidos" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "cpq"."costos_predefinidos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

COMMIT;

-- Reversión: DROP TABLE "cpq"."costos_predefinidos"; (solo guarda la configuración; los costos ya cargados en cotizaciones viven en cpq.costos_categoria).
