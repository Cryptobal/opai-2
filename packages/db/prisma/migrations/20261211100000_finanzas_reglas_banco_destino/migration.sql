-- CAR-328 · Reglas del banco con destino y conciliación contra cuenta contable (ADR-074, adenda a ADR-073 del 5-nov).
-- Aditiva: tres columnas nullable con FK y verificación de mismo tenant. No toca datos existentes.
BEGIN;
SET LOCAL lock_timeout = '5s';

-- Destino de la regla: la fila del flujo y, opcional, la cuenta contable.
ALTER TABLE "finanzas"."reglas_conciliacion"
  ADD COLUMN "flujo_fila_id" UUID,
  ADD COLUMN "cuenta_contable_id" UUID;

-- Cuenta contable elegida al conciliar un movimiento contra una fila del flujo (para la contabilidad).
ALTER TABLE "finanzas"."conciliaciones"
  ADD COLUMN "cuenta_contable_id" UUID;

ALTER TABLE "finanzas"."reglas_conciliacion" ADD CONSTRAINT "reglas_conciliacion_flujo_fila_id_fkey"
  FOREIGN KEY ("flujo_fila_id") REFERENCES "finanzas"."flujo_filas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finanzas"."reglas_conciliacion" ADD CONSTRAINT "reglas_conciliacion_cuenta_contable_id_fkey"
  FOREIGN KEY ("cuenta_contable_id") REFERENCES "finanzas"."cuentas_contables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finanzas"."conciliaciones" ADD CONSTRAINT "conciliaciones_cuenta_contable_id_fkey"
  FOREIGN KEY ("cuenta_contable_id") REFERENCES "finanzas"."cuentas_contables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "reglas_conciliacion_flujo_fila_id_idx" ON "finanzas"."reglas_conciliacion"("flujo_fila_id");
CREATE INDEX "reglas_conciliacion_cuenta_contable_id_idx" ON "finanzas"."reglas_conciliacion"("cuenta_contable_id");
CREATE INDEX "conciliaciones_cuenta_contable_id_idx" ON "finanzas"."conciliaciones"("cuenta_contable_id");

-- Las referencias deben ser del mismo tenant (las reglas no tenían trigger; la conciliación lo amplía).
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "finanzas"."reglas_conciliacion"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('flujo_fila_id', 'finanzas.flujo_filas', 'cuenta_contable_id', 'finanzas.cuentas_contables');
DROP TRIGGER mismo_tenant ON "finanzas"."conciliaciones";
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "finanzas"."conciliaciones"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('movimiento_id', 'finanzas.movimientos_bancarios', 'cuenta_contable_id', 'finanzas.cuentas_contables');

COMMIT;

-- Reversión:
--   BEGIN;
--   DROP TRIGGER mismo_tenant ON "finanzas"."conciliaciones";
--   CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "finanzas"."conciliaciones"
--     FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('movimiento_id', 'finanzas.movimientos_bancarios');
--   DROP TRIGGER mismo_tenant ON "finanzas"."reglas_conciliacion";
--   ALTER TABLE "finanzas"."conciliaciones" DROP COLUMN "cuenta_contable_id";
--   ALTER TABLE "finanzas"."reglas_conciliacion" DROP COLUMN "cuenta_contable_id", DROP COLUMN "flujo_fila_id";
--   COMMIT;
