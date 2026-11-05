-- CAR-197, Rendiciones R2b (decisión de Carlos del 5-nov-2026): todo gasto se respalda con boleta o
-- factura. `rendiciones.rendicion_items.tipo_documento` guarda cuál de las dos es.
-- Migración ADITIVA: una columna con valor por defecto ('boleta', por eso las filas existentes quedan
-- válidas sin reescribir datos) y un CHECK. La tabla ya tiene RLS `tenant_isolation` (ENABLE + FORCE).
--
-- Reversión: ALTER TABLE "rendiciones"."rendicion_items" DROP CONSTRAINT "rendicion_items_tipo_documento_chk";
--            ALTER TABLE "rendiciones"."rendicion_items" DROP COLUMN "tipo_documento";

BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "rendiciones"."rendicion_items"
  ADD COLUMN "tipo_documento" TEXT NOT NULL DEFAULT 'boleta';

ALTER TABLE "rendiciones"."rendicion_items"
  ADD CONSTRAINT "rendicion_items_tipo_documento_chk" CHECK ("tipo_documento" IN ('boleta', 'factura'));

COMMIT;
