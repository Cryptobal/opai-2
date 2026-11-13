-- Unidad del monto de los gastos recurrentes y día de la UF (CAR-349, bloque 2; Sesión Caja).
-- Qué hace y por qué: un recurrente puede ir en CLP (como hasta ahora), en UF (se convierte con la UF del día de cada
-- cuota) o en % de las ventas netas del mes anterior (retiro de socios). Migración ADITIVA: una columna con defecto
-- 'clp', así las filas existentes quedan iguales. `monto` sigue siendo entero: CLP, UF × 10.000 o % × 10.000
-- (1.000.000 = 100 %). La tabla ya tiene RLS tenant_isolation (ENABLE + FORCE); no cambia.

BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "finanzas"."flujo_recurrentes" ADD COLUMN "unidad" TEXT NOT NULL DEFAULT 'clp';
ALTER TABLE "finanzas"."flujo_recurrentes" ADD CONSTRAINT "flujo_recurrentes_unidad" CHECK ("unidad" IN ('clp', 'uf', 'pct_ventas'));
ALTER TABLE "finanzas"."flujo_recurrentes" ADD CONSTRAINT "flujo_recurrentes_pct_tope" CHECK ("unidad" <> 'pct_ventas' OR "monto" <= 1000000);
-- Qué día de UF usa cada cuota (paridad con las políticas de OPAI 1); solo aplica a la unidad 'uf'.
ALTER TABLE "finanzas"."flujo_recurrentes" ADD COLUMN "politica_uf" TEXT NOT NULL DEFAULT 'dia_cuota';
ALTER TABLE "finanzas"."flujo_recurrentes" ADD COLUMN "uf_dia_fijo" INTEGER;
ALTER TABLE "finanzas"."flujo_recurrentes" ADD CONSTRAINT "flujo_recurrentes_politica_uf" CHECK ("politica_uf" IN ('dia_cuota', 'fin_de_mes', 'fin_mes_anterior', 'inicio_de_mes', 'dia_fijo'));
ALTER TABLE "finanzas"."flujo_recurrentes" ADD CONSTRAINT "flujo_recurrentes_uf_dia_fijo" CHECK (("politica_uf" = 'dia_fijo') = ("uf_dia_fijo" IS NOT NULL) AND ("uf_dia_fijo" IS NULL OR "uf_dia_fijo" BETWEEN 1 AND 31));

COMMIT;

-- Reversión: migración aditiva; antes de usarla: ALTER TABLE "finanzas"."flujo_recurrentes" DROP CONSTRAINT "flujo_recurrentes_uf_dia_fijo", DROP CONSTRAINT "flujo_recurrentes_politica_uf", DROP CONSTRAINT "flujo_recurrentes_pct_tope", DROP CONSTRAINT "flujo_recurrentes_unidad", DROP COLUMN "uf_dia_fijo", DROP COLUMN "politica_uf", DROP COLUMN "unidad";
-- Con recurrentes en UF o % ya cargados no se borra la columna: se restaura desde el respaldo previo de Neon.
