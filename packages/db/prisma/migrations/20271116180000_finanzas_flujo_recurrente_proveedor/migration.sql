-- CAR-582: proveedor opcional en gastos recurrentes; limpieza de filas TEST QA fuera de empresas ficticias qa-*.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "finanzas"."flujo_recurrentes"
  ADD COLUMN IF NOT EXISTS "proveedor_id" UUID;

ALTER TABLE "finanzas"."flujo_recurrentes" DROP CONSTRAINT IF EXISTS "flujo_recurrentes_proveedor_id_fkey";
ALTER TABLE "finanzas"."flujo_recurrentes" ADD CONSTRAINT "flujo_recurrentes_proveedor_id_fkey"
  FOREIGN KEY ("proveedor_id") REFERENCES "finanzas"."proveedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "flujo_recurrentes_proveedor_id_idx"
  ON "finanzas"."flujo_recurrentes"("tenant_id", "proveedor_id");

DROP TRIGGER IF EXISTS mismo_tenant ON "finanzas"."flujo_recurrentes";
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "finanzas"."flujo_recurrentes"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('fila_id', 'finanzas.flujo_filas', 'proveedor_id', 'finanzas.proveedores');

-- Celdas de filas de prueba en tenants reales (p. ej. etiqueta «TEST QA» desde pruebas manuales).
DELETE FROM "finanzas"."flujo_celdas" c
USING "finanzas"."flujo_filas" f, "core"."tenants" t
WHERE c.fila_id = f.id
  AND f.tenant_id = t.id
  AND t.slug NOT LIKE 'qa-%'
  AND (f.etiqueta ILIKE 'TEST QA%' OR f.etiqueta ILIKE '%(QA)%');

DELETE FROM "finanzas"."flujo_recurrentes" r
USING "finanzas"."flujo_filas" f, "core"."tenants" t
WHERE r.fila_id = f.id
  AND f.tenant_id = t.id
  AND t.slug NOT LIKE 'qa-%'
  AND (f.etiqueta ILIKE 'TEST QA%' OR f.etiqueta ILIKE '%(QA)%');

DELETE FROM "finanzas"."flujo_filas" f
USING "core"."tenants" t
WHERE f.tenant_id = t.id
  AND t.slug NOT LIKE 'qa-%'
  AND (f.etiqueta ILIKE 'TEST QA%' OR f.etiqueta ILIKE '%(QA)%');

COMMIT;