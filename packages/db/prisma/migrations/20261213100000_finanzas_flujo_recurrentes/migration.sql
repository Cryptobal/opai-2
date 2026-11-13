-- Gastos recurrentes del flujo de caja (CAR-349, Sesión Caja; decisiones de Carlos del 12-nov-2026).
-- Qué hace y por qué: en OPAI 1 cada regla recurrente se copiaba a celdas de plan y un proceso las reescribía.
-- En OPAI 2 la regla se guarda una vez y el flujo la expande al leer (ADR-026); cada cuota queda pagada sola cuando
-- un cargo conciliado a su fila cae en su ventana. Migración ADITIVA: solo crea una tabla nueva, con RLS
-- `tenant_isolation` (ENABLE + FORCE) para opai_app y trigger mismo_tenant sobre la fila del flujo.

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "finanzas"."flujo_recurrentes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "fila_id" UUID NOT NULL,
    "concepto" TEXT NOT NULL,
    "monto" BIGINT NOT NULL,
    "frecuencia" TEXT NOT NULL,
    "dia_del_mes" INTEGER,
    "inicio" DATE NOT NULL,
    "fin" DATE,
    "repeticiones" INTEGER,
    "ventana_antes" INTEGER NOT NULL DEFAULT 5,
    "ventana_despues" INTEGER NOT NULL DEFAULT 10,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "nota" TEXT,
    "clave_origen" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "flujo_recurrentes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "flujo_recurrentes_monto_positivo" CHECK ("monto" > 0),
    CONSTRAINT "flujo_recurrentes_frecuencia" CHECK ("frecuencia" IN ('semanal', 'quincenal', 'mensual')),
    CONSTRAINT "flujo_recurrentes_dia" CHECK ("dia_del_mes" IS NULL OR "dia_del_mes" = -1 OR "dia_del_mes" BETWEEN 1 AND 31),
    CONSTRAINT "flujo_recurrentes_fin" CHECK ("fin" IS NULL OR "fin" >= "inicio"),
    CONSTRAINT "flujo_recurrentes_repeticiones" CHECK ("repeticiones" IS NULL OR "repeticiones" > 0),
    CONSTRAINT "flujo_recurrentes_ventana" CHECK ("ventana_antes" BETWEEN 0 AND 31 AND "ventana_despues" BETWEEN 0 AND 31)
);

CREATE UNIQUE INDEX "flujo_recurrentes_tenant_id_clave_origen_key" ON "finanzas"."flujo_recurrentes"("tenant_id", "clave_origen");
CREATE INDEX "flujo_recurrentes_tenant_id_activa_idx" ON "finanzas"."flujo_recurrentes"("tenant_id", "activa");
CREATE INDEX "flujo_recurrentes_fila_id_idx" ON "finanzas"."flujo_recurrentes"("fila_id");

ALTER TABLE "finanzas"."flujo_recurrentes" ADD CONSTRAINT "flujo_recurrentes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finanzas"."flujo_recurrentes" ADD CONSTRAINT "flujo_recurrentes_fila_id_fkey" FOREIGN KEY ("fila_id") REFERENCES "finanzas"."flujo_filas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

GRANT SELECT, INSERT, UPDATE, DELETE ON "finanzas"."flujo_recurrentes" TO opai_app;

ALTER TABLE "finanzas"."flujo_recurrentes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finanzas"."flujo_recurrentes" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "finanzas"."flujo_recurrentes" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- La fila del flujo debe ser de la misma empresa.
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "finanzas"."flujo_recurrentes"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('fila_id', 'finanzas.flujo_filas');

COMMIT;

-- Reversión: migración aditiva; antes de usarla: DROP TABLE "finanzas"."flujo_recurrentes";
-- Con recurrentes ya cargados no se borra: se restaura desde el respaldo previo de Neon.
