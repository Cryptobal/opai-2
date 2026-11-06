-- CAR-222 · Prueba gratis por empresa (decisión de Carlos del 6-nov-2026): `core.pruebas_gratis`, una
-- fila por (empresa, módulo o parte de Finanzas). La empresa la activa una vez desde su ERP, dura 10
-- días y se desactiva sola; Plataforma puede extenderla o reactivarla. NO es una condición de cobro:
-- no guarda precios ni genera cargos. Migración ADITIVA: una tabla nueva con RLS (ENABLE + FORCE).

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "core"."pruebas_gratis" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "modulo_id" TEXT NOT NULL,
    "inicio" DATE NOT NULL,
    "hasta" DATE NOT NULL,
    "extensiones" INTEGER NOT NULL DEFAULT 0,
    "activada_por" UUID,
    "cerrada_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "pruebas_gratis_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "pruebas_gratis_fechas_chk" CHECK ("hasta" >= "inicio"),
    CONSTRAINT "pruebas_gratis_extensiones_chk" CHECK ("extensiones" >= 0)
);

-- Una vez por empresa y módulo: la unicidad es la regla de negocio.
CREATE UNIQUE INDEX "pruebas_gratis_tenant_id_modulo_id_key" ON "core"."pruebas_gratis"("tenant_id", "modulo_id");
CREATE INDEX "pruebas_gratis_hasta_idx" ON "core"."pruebas_gratis"("hasta") WHERE "cerrada_en" IS NULL;

ALTER TABLE "core"."pruebas_gratis" ADD CONSTRAINT "pruebas_gratis_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

GRANT SELECT, INSERT, UPDATE, DELETE ON "core"."pruebas_gratis" TO opai_app;

ALTER TABLE "core"."pruebas_gratis" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."pruebas_gratis" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."pruebas_gratis" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

COMMIT;

-- Reversión: DROP TABLE "core"."pruebas_gratis";
