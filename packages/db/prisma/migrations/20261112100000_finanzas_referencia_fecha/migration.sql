-- CAR-221 · A1: fecha del documento referenciado (FchRef del SII) en las referencias de un DTE de venta.
-- Aditiva: columna nullable, sin tabla nueva (la RLS y la política tenant_isolation de la tabla no cambian).
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "finanzas"."documentos_emitidos_referencias" ADD COLUMN IF NOT EXISTS "fecha_ref" DATE;

COMMIT;

-- Reversión: ALTER TABLE "finanzas"."documentos_emitidos_referencias" DROP COLUMN IF EXISTS "fecha_ref";
-- (solo pierde las fechas de referencia cargadas con este cambio; además existe el snapshot previo de Neon).
