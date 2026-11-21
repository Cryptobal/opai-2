-- Inventario · CAR-743: categorías configurables por empresa (clave en columna `categoria`).
-- Quita checks que limitaban a «activo» y «ropa»; la forma del tipo la valida la capacidad con el
-- comportamiento de la categoría (ajuste `inventario.inventario_categorias`).
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "inventario"."tipos" DROP CONSTRAINT IF EXISTS "tipos_categoria_check";
ALTER TABLE "inventario"."tipos" DROP CONSTRAINT IF EXISTS "tipos_ropa_check";
ALTER TABLE "inventario"."tipos" ADD CONSTRAINT "tipos_categoria_formato_check" CHECK (
  "categoria" ~ '^[a-z][a-z0-9_]{0,39}$'
);

COMMIT;

-- Reversión:
-- ALTER TABLE "inventario"."tipos" DROP CONSTRAINT IF EXISTS "tipos_categoria_formato_check";
-- ALTER TABLE "inventario"."tipos" ADD CONSTRAINT "tipos_categoria_check" CHECK ("categoria" IN ('activo', 'ropa'));
-- ALTER TABLE "inventario"."tipos" ADD CONSTRAINT "tipos_ropa_check" CHECK (
--   ("categoria" = 'ropa' AND coalesce(cardinality("tallas"), 0) >= 1 AND "campos" = '[]'::jsonb)
--   OR ("categoria" = 'activo' AND coalesce(cardinality("tallas"), 0) = 0 AND "prenda_clave" IS NULL)
-- );
-- (Solo si no quedaron filas con categorías distintas de activo/ropa.)