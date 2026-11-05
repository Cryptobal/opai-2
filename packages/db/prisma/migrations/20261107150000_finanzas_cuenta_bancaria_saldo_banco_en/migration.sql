-- Flujo de caja B1 (CAR-193, ADR-073): fecha del saldo que reporta el banco, por cuenta.
-- Qué hace y por qué: el saldo del banco de hoy suma el último saldo conocido de cada cuenta, y la apertura de la
-- semana resta lo ya movido hasta la fecha de ESE saldo. `ultima_sync_en` no sirve de fecha del saldo (se actualiza
-- también en entregas que no traen saldo nuevo), así que se guarda `saldo_banco_en` junto con `saldo_banco`.
-- Aditiva: columna nullable. Relleno desde `ultima_sync_en` para los saldos que ya hay (el mejor dato disponible).
-- Migración de datos con FORCE RLS: exige BYPASSRLS o superusuario y verifica el resultado (REGLAS-codigo.md).
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE finanzas.cuentas_bancarias ADD COLUMN IF NOT EXISTS saldo_banco_en timestamptz;

DO $$
DECLARE
  v_pendientes integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = current_user AND (rolbypassrls OR rolsuper)) THEN
    RAISE EXCEPTION 'Esta migración de datos exige un rol con BYPASSRLS o superusuario (FORCE RLS filtra en silencio).';
  END IF;

  UPDATE finanzas.cuentas_bancarias SET saldo_banco_en = ultima_sync_en
   WHERE saldo_banco IS NOT NULL AND saldo_banco_en IS NULL AND ultima_sync_en IS NOT NULL;

  SELECT count(*) INTO v_pendientes FROM finanzas.cuentas_bancarias
   WHERE saldo_banco IS NOT NULL AND saldo_banco_en IS NULL AND ultima_sync_en IS NOT NULL;
  IF v_pendientes <> 0 THEN
    RAISE EXCEPTION 'Quedaron % cuentas con saldo sin fecha de saldo.', v_pendientes;
  END IF;
END
$$;

COMMIT;

-- Reversión: ALTER TABLE finanzas.cuentas_bancarias DROP COLUMN saldo_banco_en;
-- (la columna es nueva y derivada de ultima_sync_en: no se pierde información al quitarla).
