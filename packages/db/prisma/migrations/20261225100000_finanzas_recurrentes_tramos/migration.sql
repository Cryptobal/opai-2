-- Plantilla de migración de OPAI 2.0 (CAR-47). Reglas en docs/2.0/migraciones.md.
--
-- Qué hace y por qué: CAR-413. Un gasto recurrente puede cambiar de fila, frecuencia o día «desde una
-- fecha»: el tramo anterior se cierra el día antes y el nuevo apunta a él con `anterior_id`, así el
-- historial queda unido y las cuotas ya pasadas o cruzadas con el banco no cambian. Aditiva: columna
-- nula, índice único (un solo tramo siguiente) y FK a la misma tabla. Sin datos que migrar.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "finanzas"."flujo_recurrentes" ADD COLUMN "anterior_id" UUID;

CREATE UNIQUE INDEX "flujo_recurrentes_anterior_id_key" ON "finanzas"."flujo_recurrentes"("anterior_id");

ALTER TABLE "finanzas"."flujo_recurrentes"
  ADD CONSTRAINT "flujo_recurrentes_anterior_id_fkey" FOREIGN KEY ("anterior_id")
  REFERENCES "finanzas"."flujo_recurrentes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;

-- Reversión: ALTER TABLE "finanzas"."flujo_recurrentes" DROP CONSTRAINT "flujo_recurrentes_anterior_id_fkey";
-- DROP INDEX "finanzas"."flujo_recurrentes_anterior_id_key";
-- ALTER TABLE "finanzas"."flujo_recurrentes" DROP COLUMN "anterior_id";
