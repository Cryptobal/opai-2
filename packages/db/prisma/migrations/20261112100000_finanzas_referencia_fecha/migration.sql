-- CAR-221 · A1: fecha del documento referenciado (FchRef del SII) en las referencias de un DTE de venta.
-- Aditiva: columna nullable, sin tabla nueva (la RLS y la política tenant_isolation de la tabla no cambian).
SET LOCAL lock_timeout = '5s';

ALTER TABLE "finanzas"."documentos_emitidos_referencias" ADD COLUMN IF NOT EXISTS "fecha_ref" DATE;
