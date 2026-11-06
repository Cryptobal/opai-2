-- Flujo de caja C (CAR-193): el umbral de saldo bajo por defecto pasa de $15.000.000 a $10.000.000, configurable por
-- empresa (decisión de Carlos del 5-nov-2026, adenda a ADR-073). Solo datos y valor por defecto, sin tablas.
-- Qué hace: (1) cambia el DEFAULT de la columna; (2) lleva a $10.000.000 los ajustes que quedaron en $15.000.000 por
-- el defecto anterior, es decir los que nadie editó desde la app: los creados con el defecto (updated_at = created_at)
-- y los que la migración 20261107140000 llevó a 15.000.000 el 5-nov (esa migración sí avanzó updated_at, pero antes
-- del 6-nov; ninguna empresa pudo editarlos a mano en esas horas). Un umbral que la empresa cambió a mano pasa por
-- la capacidad `finanzas.ajustes.actualizar`, que sí avanza updated_at, y no se toca.
-- Migración de datos con FORCE RLS: exige BYPASSRLS o superusuario y verifica las filas afectadas (REGLAS-codigo.md).
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE finanzas.flujo_ajustes ALTER COLUMN umbral SET DEFAULT 10000000;

DO $$
DECLARE
  v_esperadas integer;
  v_cambiadas integer;
  v_pendientes integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = current_user AND (rolbypassrls OR rolsuper)) THEN
    RAISE EXCEPTION 'Esta migración de datos exige un rol con BYPASSRLS o superusuario (FORCE RLS filtra en silencio).';
  END IF;

  SELECT count(*) INTO v_esperadas FROM finanzas.flujo_ajustes WHERE umbral = 15000000 AND (updated_at = created_at OR updated_at < TIMESTAMPTZ '2026-11-06 00:00:00-03');

  UPDATE finanzas.flujo_ajustes SET umbral = 10000000 WHERE umbral = 15000000 AND (updated_at = created_at OR updated_at < TIMESTAMPTZ '2026-11-06 00:00:00-03');
  GET DIAGNOSTICS v_cambiadas = ROW_COUNT;

  IF v_cambiadas <> v_esperadas THEN
    RAISE EXCEPTION 'Se esperaba actualizar % ajustes y se actualizaron % (¿RLS filtró filas?).', v_esperadas, v_cambiadas;
  END IF;

  SELECT count(*) INTO v_pendientes FROM finanzas.flujo_ajustes WHERE umbral = 15000000 AND (updated_at = created_at OR updated_at < TIMESTAMPTZ '2026-11-06 00:00:00-03');
  IF v_pendientes <> 0 THEN
    RAISE EXCEPTION 'Quedaron % ajustes sin llevar a 10.000.000.', v_pendientes;
  END IF;

  RAISE NOTICE 'Umbral de saldo bajo: % ajustes llevados de 15.000.000 a 10.000.000.', v_cambiadas;
END $$;

COMMIT;

-- Reversión (solo valor por defecto; los datos no se restauran sin snapshot de Neon, porque un umbral editado a mano
-- ya era distinto): ALTER TABLE finanzas.flujo_ajustes ALTER COLUMN umbral SET DEFAULT 15000000;
-- Para devolver los ajustes cambiados: UPDATE finanzas.flujo_ajustes SET umbral = 15000000
--   WHERE umbral = 10000000 AND updated_at = created_at; (con respaldo previo, y solo si nadie los fijó a mano en 10 millones).
