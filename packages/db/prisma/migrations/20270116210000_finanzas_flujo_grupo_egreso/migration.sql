-- Finanzas · Flujo de caja por secciones: grupo de egreso de cada fila (Remuneraciones, Gastos,
-- Impuestos, Financiamiento). Migración aditiva: una columna NOT NULL con valor por defecto
-- «gastos», así las filas existentes quedan en Gastos sin tocar sus datos. Sin tabla nueva: la RLS
-- de finanzas.flujo_filas no cambia.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "finanzas"."flujo_filas"
  ADD COLUMN "grupo" TEXT NOT NULL DEFAULT 'gastos',
  ADD CONSTRAINT "flujo_filas_grupo_check"
    CHECK ("grupo" IN ('remuneraciones', 'gastos', 'impuestos', 'financiamiento'));

COMMIT;

-- Reversión (manual, con el rol propietario, en una transacción):
--   ALTER TABLE "finanzas"."flujo_filas" DROP CONSTRAINT IF EXISTS "flujo_filas_grupo_check";
--   ALTER TABLE "finanzas"."flujo_filas" DROP COLUMN IF EXISTS "grupo";
-- Solo quita la columna nueva; ninguna otra tabla depende de ella. Se pierde el grupo elegido en cada fila
-- (todas vuelven a mostrarse como egresos sin grupo); el resto de los datos del flujo no cambia.
