-- CAR-188 · Cobro por módulo (ADR-071, BRIEF-35): condiciones comerciales por empresa y módulo y el
-- cargo mensual listo para facturar. Aditiva y reversible:
--   DROP TABLE "core"."cobro_cargos"; DROP TABLE "core"."cobro_condiciones";
-- No toca tablas existentes ni cobra nada: sin filas, nada cambia para las empresas.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "core"."cobro_condiciones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "modulo_id" TEXT NOT NULL,
    "moneda" TEXT NOT NULL,
    "precio_mensual" INTEGER NOT NULL,
    "cobro_desde" DATE,
    "prueba_hasta" DATE,
    "descuento_pct" INTEGER NOT NULL DEFAULT 0,
    "nota" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cobro_condiciones_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "cobro_condiciones_moneda_check" CHECK ("moneda" IN ('CLP', 'UF')),
    CONSTRAINT "cobro_condiciones_precio_check" CHECK ("precio_mensual" >= 0),
    CONSTRAINT "cobro_condiciones_descuento_check" CHECK ("descuento_pct" BETWEEN 0 AND 1000000),
    CONSTRAINT "cobro_condiciones_nucleo_check" CHECK ("modulo_id" <> 'core')
);

CREATE UNIQUE INDEX "cobro_condiciones_tenant_id_modulo_id_key" ON "core"."cobro_condiciones"("tenant_id", "modulo_id");
ALTER TABLE "core"."cobro_condiciones" ADD CONSTRAINT "cobro_condiciones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "core"."cobro_cargos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "modulo_id" TEXT NOT NULL,
    "periodo" DATE NOT NULL,
    "moneda" TEXT NOT NULL,
    "precio_mensual" INTEGER NOT NULL,
    "descuento_pct" INTEGER NOT NULL,
    "dias_cobrados" INTEGER NOT NULL,
    "dias_mes" INTEGER NOT NULL,
    "monto" INTEGER NOT NULL,
    "uf_centavos" INTEGER,
    "monto_clp" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'listo',
    "motivo_anulacion" TEXT,
    "anulado_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cobro_cargos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "cobro_cargos_moneda_check" CHECK ("moneda" IN ('CLP', 'UF')),
    CONSTRAINT "cobro_cargos_estado_check" CHECK ("estado" IN ('listo', 'anulado')),
    CONSTRAINT "cobro_cargos_periodo_check" CHECK (EXTRACT(DAY FROM "periodo") = 1),
    CONSTRAINT "cobro_cargos_montos_check" CHECK ("monto" > 0 AND "monto_clp" > 0),
    CONSTRAINT "cobro_cargos_dias_check" CHECK ("dias_cobrados" BETWEEN 1 AND "dias_mes"),
    CONSTRAINT "cobro_cargos_uf_check" CHECK (("moneda" = 'UF') = ("uf_centavos" IS NOT NULL)),
    CONSTRAINT "cobro_cargos_anulacion_check" CHECK (("estado" = 'anulado') = ("anulado_en" IS NOT NULL))
);

CREATE INDEX "cobro_cargos_tenant_id_periodo_idx" ON "core"."cobro_cargos"("tenant_id", "periodo");
-- Un solo cargo vigente por empresa, módulo y mes: generar dos veces no duplica.
CREATE UNIQUE INDEX "cobro_cargos_vigente_unico" ON "core"."cobro_cargos"("tenant_id", "modulo_id", "periodo")
  WHERE "estado" = 'listo';
ALTER TABLE "core"."cobro_cargos" ADD CONSTRAINT "cobro_cargos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "core"."cobro_condiciones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."cobro_condiciones" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."cobro_condiciones" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core"."cobro_cargos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."cobro_cargos" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."cobro_cargos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

COMMIT;
