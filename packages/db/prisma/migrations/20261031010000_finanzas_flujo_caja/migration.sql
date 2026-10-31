-- CAR-91, Brief 20: schema `finanzas` con el flujo de caja (filas, celdas por semana, cierres
-- semanales y ajustes). Migración ADITIVA: solo crea objetos nuevos, sin DROP ni cambios en tablas
-- existentes. Toda tabla con tenant_id lleva RLS `tenant_isolation` (ENABLE + FORCE) para opai_app,
-- que es NOBYPASSRLS. Sin migración de datos: no hay filas que verificar.
BEGIN;
SET LOCAL lock_timeout = '5s';

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "finanzas";

-- CreateTable
CREATE TABLE "finanzas"."flujo_filas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "seccion" TEXT NOT NULL,
    "etiqueta" TEXT NOT NULL,
    "vinculo" TEXT,
    "arrastre" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "flujo_filas_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "flujo_filas_seccion_check" CHECK ("seccion" IN ('ingreso', 'egreso'))
);

-- CreateTable
CREATE TABLE "finanzas"."flujo_celdas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "fila_id" UUID NOT NULL,
    "semana" DATE NOT NULL,
    "capa" TEXT NOT NULL DEFAULT 'plan',
    "monto" INTEGER NOT NULL,
    "nota" TEXT,
    "cumplida_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "flujo_celdas_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "flujo_celdas_capa_check" CHECK ("capa" IN ('plan', 'comprometido', 'real')),
    CONSTRAINT "flujo_celdas_monto_check" CHECK ("monto" >= 0),
    CONSTRAINT "flujo_celdas_semana_lunes_check" CHECK (EXTRACT(ISODOW FROM "semana") = 1)
);

-- CreateTable
CREATE TABLE "finanzas"."flujo_cierres" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "semana" DATE NOT NULL,
    "saldo_sugerido" INTEGER NOT NULL,
    "saldo_banco" INTEGER NOT NULL,
    "motivo" TEXT,
    "sellada" BOOLEAN NOT NULL DEFAULT true,
    "sellada_en" TIMESTAMPTZ(6),
    "sellada_por_id" UUID,
    "motivo_reapertura" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "flujo_cierres_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "flujo_cierres_semana_lunes_check" CHECK (EXTRACT(ISODOW FROM "semana") = 1)
);

-- CreateTable
CREATE TABLE "finanzas"."flujo_ajustes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "saldo_inicial" INTEGER NOT NULL DEFAULT 0,
    "umbral" INTEGER NOT NULL DEFAULT 0,
    "desde" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "flujo_ajustes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "flujo_ajustes_desde_lunes_check" CHECK (EXTRACT(ISODOW FROM "desde") = 1)
);

-- CreateIndex
CREATE UNIQUE INDEX "flujo_filas_tenant_id_etiqueta_key" ON "finanzas"."flujo_filas"("tenant_id", "etiqueta");
CREATE INDEX "flujo_filas_tenant_id_seccion_orden_idx" ON "finanzas"."flujo_filas"("tenant_id", "seccion", "orden");
CREATE UNIQUE INDEX "flujo_celdas_tenant_id_fila_id_semana_key" ON "finanzas"."flujo_celdas"("tenant_id", "fila_id", "semana");
CREATE INDEX "flujo_celdas_tenant_id_semana_idx" ON "finanzas"."flujo_celdas"("tenant_id", "semana");
CREATE UNIQUE INDEX "flujo_cierres_tenant_id_semana_key" ON "finanzas"."flujo_cierres"("tenant_id", "semana");
CREATE UNIQUE INDEX "flujo_ajustes_tenant_id_key" ON "finanzas"."flujo_ajustes"("tenant_id");

-- AddForeignKey (schema propio y core.tenants/core.users; sin tocar tablas del núcleo)
ALTER TABLE "finanzas"."flujo_filas" ADD CONSTRAINT "flujo_filas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finanzas"."flujo_celdas" ADD CONSTRAINT "flujo_celdas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finanzas"."flujo_celdas" ADD CONSTRAINT "flujo_celdas_fila_id_fkey" FOREIGN KEY ("fila_id") REFERENCES "finanzas"."flujo_filas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finanzas"."flujo_cierres" ADD CONSTRAINT "flujo_cierres_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finanzas"."flujo_cierres" ADD CONSTRAINT "flujo_cierres_sellada_por_id_fkey" FOREIGN KEY ("sellada_por_id") REFERENCES "core"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "finanzas"."flujo_ajustes" ADD CONSTRAINT "flujo_ajustes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Grants (GRANT USAGE + ALTER DEFAULT PRIVILEGES al crear un schema nuevo, ver REGLAS-codigo.md)
GRANT USAGE ON SCHEMA "finanzas" TO opai_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "finanzas" TO opai_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "finanzas" TO opai_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA "finanzas" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO opai_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA "finanzas" GRANT USAGE, SELECT ON SEQUENCES TO opai_app;

-- Row-Level Security: una política `tenant_isolation` por tabla, para opai_app (NOBYPASSRLS).
ALTER TABLE "finanzas"."flujo_filas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finanzas"."flujo_filas" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "finanzas"."flujo_filas" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "finanzas"."flujo_celdas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finanzas"."flujo_celdas" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "finanzas"."flujo_celdas" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "finanzas"."flujo_cierres" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finanzas"."flujo_cierres" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "finanzas"."flujo_cierres" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "finanzas"."flujo_ajustes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finanzas"."flujo_ajustes" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "finanzas"."flujo_ajustes" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- Referencias dentro del mismo tenant (trigger del núcleo `core.verificar_mismo_tenant`); el FK a
-- core.users no lleva este trigger porque users no tiene tenant_id (identidad global, ADR-015).
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "finanzas"."flujo_celdas"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('fila_id', 'finanzas.flujo_filas');

COMMIT;

-- Reversión (manual, con el rol propietario, en una transacción). NO usar DROP SCHEMA ... CASCADE: el
-- schema `finanzas` es compartido con Compras (cuentas, proveedores, documentos recibidos) y se
-- perderían sus datos. Se borran solo las 4 tablas de este módulo, la de celdas primero (FK a filas):
--   DROP TABLE "finanzas"."flujo_celdas";
--   DROP TABLE "finanzas"."flujo_cierres";
--   DROP TABLE "finanzas"."flujo_ajustes";
--   DROP TABLE "finanzas"."flujo_filas";
-- Cada DROP TABLE elimina también sus índices, triggers y la política tenant_isolation. Exige haber
-- revertido antes el código del flujo de caja (capacidades `finanzas.flujo_*`).
