-- CAR-196 · Ambiente del CAF (certificación o producción), marcado según el IDK del propio archivo.
-- Aditiva y reversible: una columna nueva y nula en una tabla que ya tiene RLS + política tenant_isolation (no se
-- crean tablas). SIN backfill a propósito: un UPDATE sobre tablas con FORCE RLS sin app.tenant_id afectaría 0 filas
-- en silencio; los rangos anteriores quedan con NULL y el código deriva el ambiente de su caf_idk al leer.
-- No toca ninguna fila existente (en particular, ni el CAF 33 ya cargado).
-- Reversión: ALTER TABLE "finanzas"."dte_folios" DROP COLUMN "caf_ambiente";
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "finanzas"."dte_folios"
    ADD COLUMN "caf_ambiente" TEXT,
    ADD CONSTRAINT "dte_folios_caf_ambiente_chk" CHECK ("caf_ambiente" IS NULL OR "caf_ambiente" IN ('certificacion', 'produccion'));

COMMIT;
