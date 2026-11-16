-- Inventario · CAR-237 (ADR-116): existencias de ropa por talla y sus movimientos. Migración aditiva,
-- sin datos: tablas nuevas `inventario.existencias` y `inventario.movimientos`.
-- Qué hace y por qué: cada prenda del uniforme se controla por cantidad y talla. Toda variación
-- (ingreso, ajuste, entrega, devolución) queda como movimiento que solo se agrega; la existencia nunca
-- queda bajo cero. FK compuestas por empresa hacia inventario.tipos.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "inventario"."existencias" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tipo_id" UUID NOT NULL,
    "talla" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "existencias_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "existencias_cantidad_check" CHECK ("cantidad" BETWEEN 0 AND 100000),
    CONSTRAINT "existencias_talla_check" CHECK (char_length("talla") BETWEEN 1 AND 10)
);

CREATE TABLE "inventario"."movimientos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tipo_id" UUID NOT NULL,
    "talla" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "motivo" TEXT NOT NULL,
    "nota" TEXT,
    "actor_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "movimientos_delta_check" CHECK ("delta" <> 0),
    CONSTRAINT "movimientos_talla_check" CHECK (char_length("talla") BETWEEN 1 AND 10),
    CONSTRAINT "movimientos_motivo_check" CHECK ("motivo" IN ('ingreso', 'ajuste', 'entrega', 'devolucion'))
);

CREATE UNIQUE INDEX "existencias_tenant_id_tipo_id_talla_key"
  ON "inventario"."existencias"("tenant_id", "tipo_id", "talla");
CREATE INDEX "movimientos_tenant_id_tipo_id_created_at_idx"
  ON "inventario"."movimientos"("tenant_id", "tipo_id", "created_at");

ALTER TABLE "inventario"."existencias" ADD CONSTRAINT "existencias_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventario"."existencias" ADD CONSTRAINT "existencias_tenant_id_tipo_id_fkey"
  FOREIGN KEY ("tenant_id", "tipo_id") REFERENCES "inventario"."tipos"("tenant_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventario"."movimientos" ADD CONSTRAINT "movimientos_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventario"."movimientos" ADD CONSTRAINT "movimientos_tenant_id_tipo_id_fkey"
  FOREIGN KEY ("tenant_id", "tipo_id") REFERENCES "inventario"."tipos"("tenant_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventario"."existencias" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventario"."existencias" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "inventario"."existencias" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "inventario"."movimientos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventario"."movimientos" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "inventario"."movimientos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE ON "inventario"."existencias" TO opai_app;
-- Los movimientos solo se agregan (R18): la app no los cambia ni los borra.
GRANT SELECT, INSERT ON "inventario"."movimientos" TO opai_app;
REVOKE UPDATE, DELETE ON "inventario"."movimientos" FROM opai_app;
REVOKE DELETE ON "inventario"."existencias" FROM opai_app;

COMMIT;

-- Reversión: DROP TABLE IF EXISTS "inventario"."movimientos"; DROP TABLE IF EXISTS "inventario"."existencias";
