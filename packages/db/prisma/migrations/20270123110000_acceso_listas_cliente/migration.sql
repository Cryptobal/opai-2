-- CAR-538 (Sesión Cursor): el cliente gestiona la lista de sus instalaciones desde el Portal Cliente (R12).
-- Migración ADITIVA: columna nullable `cuenta_id` en `acceso.entradas_lista`. NULL = la agregó la empresa;
-- con valor = la agregó un contacto de esa cuenta, que solo puede quitar las suyas. FK a core.cuentas y el
-- trigger `mismo_tenant` se rehace para validar también la cuenta. No toca filas existentes ni secretos.

BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "acceso"."entradas_lista" ADD COLUMN "cuenta_id" UUID;
ALTER TABLE "acceso"."entradas_lista" ADD CONSTRAINT "entradas_lista_cuenta_fkey"
  FOREIGN KEY ("cuenta_id") REFERENCES "core"."cuentas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DROP TRIGGER mismo_tenant ON "acceso"."entradas_lista";
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "acceso"."entradas_lista" FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
  'instalacion_id', 'core.instalaciones', 'cuenta_id', 'core.cuentas');

COMMIT;

-- Reversión (manual, con el rol propietario, en una transacción):
--   DROP TRIGGER mismo_tenant ON "acceso"."entradas_lista";
--   CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "acceso"."entradas_lista" FOR EACH ROW
--     EXECUTE FUNCTION "core"."verificar_mismo_tenant"('instalacion_id', 'core.instalaciones');
--   ALTER TABLE "acceso"."entradas_lista" DROP COLUMN "cuenta_id";
