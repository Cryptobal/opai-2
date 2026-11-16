-- Opción por empresa: activar los módulos nuevos del catálogo desde el momento en que se enciende.
-- Qué hace: agrega `activar_modulos_nuevos_desde` (nullable) a `core.tenants`. Null es apagado.
-- No enciende a ninguna empresa: no hay UPDATE. Quien opera Plataforma lo prende después.
-- Tablas con tenant_id: no se crean. `core.tenants` no tiene RLS (es el tenant).
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "core"."tenants" ADD COLUMN "activar_modulos_nuevos_desde" TIMESTAMPTZ(6);

COMMIT;

-- Reversión: ALTER TABLE "core"."tenants" DROP COLUMN "activar_modulos_nuevos_desde";
