-- Importación comercial 1.0→2.0: datos tributarios de cuenta para Finanzas › Ventas DTE (SimpleAPI/SII).
-- Aditiva, reversible; RLS existente en core.cuentas no cambia.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "core"."cuentas"
  ADD COLUMN IF NOT EXISTS "ciudad" TEXT,
  ADD COLUMN IF NOT EXISTS "email_dte" TEXT;

COMMIT;

-- Reversión:
-- BEGIN;
-- SET LOCAL lock_timeout = '5s';
-- ALTER TABLE "core"."cuentas" DROP COLUMN IF EXISTS "email_dte", DROP COLUMN IF EXISTS "ciudad";
-- COMMIT;
