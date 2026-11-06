-- Flujo de caja C (CAR-193): el umbral de saldo bajo por defecto pasa de $15.000.000 a $10.000.000, configurable por
-- empresa (decisión de Carlos del 5-nov-2026, adenda a ADR-073). Solo datos y valor por defecto, sin tablas.
-- Qué hace: (1) cambia el DEFAULT de la columna; (2) lleva a $10.000.000 los ajustes que están en $15.000.000 y que
-- NADIE ha editado: ya sea por el defecto anterior o porque la migración 20261107140000 los subió desde 0 (esa
-- migración sí avanza `updated_at`, así que `updated_at` no sirve para distinguirlos). El criterio es la auditoría: un
-- ajuste que pasó alguna vez por `finanzas.ajustes.actualizar` o `finanzas.flujo.importar` (toda escritura queda en
-- `core.audit_events`) lo tocó una persona o un agente, y su umbral, aunque sea 15.000.000, se respeta.
-- Migración de datos con FORCE RLS: exige BYPASSRLS o superusuario y verifica las filas afectadas (REGLAS-codigo.md).
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE finanzas.flujo_ajustes ALTER COLUMN umbral SET DEFAULT 10000000;

DO $$
DECLARE
  v_total15 integer;
  v_esperadas integer;
  v_cambiadas integer;
  v_pendientes integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = current_user AND (rolbypassrls OR rolsuper)) THEN
    RAISE EXCEPTION 'Esta migración de datos exige un rol con BYPASSRLS o superusuario (FORCE RLS filtra en silencio).';
  END IF;

  SELECT count(*) INTO v_total15 FROM finanzas.flujo_ajustes WHERE umbral = 15000000;

  -- Sin ninguna escritura de ajustes por capacidad en la auditoría de su empresa: nadie lo eligió.
  SELECT count(*) INTO v_esperadas FROM finanzas.flujo_ajustes f
   WHERE f.umbral = 15000000
     AND NOT EXISTS (SELECT 1 FROM core.audit_events a
                      WHERE a.tenant_id = f.tenant_id
                        AND a.capability IN ('finanzas.ajustes.actualizar', 'finanzas.flujo.importar'));

  UPDATE finanzas.flujo_ajustes f SET umbral = 10000000
   WHERE f.umbral = 15000000
     AND NOT EXISTS (SELECT 1 FROM core.audit_events a
                      WHERE a.tenant_id = f.tenant_id
                        AND a.capability IN ('finanzas.ajustes.actualizar', 'finanzas.flujo.importar'));
  GET DIAGNOSTICS v_cambiadas = ROW_COUNT;

  IF v_cambiadas <> v_esperadas THEN
    RAISE EXCEPTION 'Se esperaba actualizar % ajustes y se actualizaron % (¿RLS filtró filas?).', v_esperadas, v_cambiadas;
  END IF;

  SELECT count(*) INTO v_pendientes FROM finanzas.flujo_ajustes f
   WHERE f.umbral = 15000000
     AND NOT EXISTS (SELECT 1 FROM core.audit_events a
                      WHERE a.tenant_id = f.tenant_id
                        AND a.capability IN ('finanzas.ajustes.actualizar', 'finanzas.flujo.importar'));
  IF v_pendientes <> 0 THEN
    RAISE EXCEPTION 'Quedaron % ajustes sin llevar a 10.000.000.', v_pendientes;
  END IF;

  RAISE NOTICE 'Umbral de saldo bajo: % ajustes en 15.000.000 antes; % llevados a 10.000.000; % respetados (editados por la empresa).',
    v_total15, v_cambiadas, v_total15 - v_cambiadas;
END $$;

COMMIT;

-- Reversión (solo valor por defecto; los datos no se restauran sin el snapshot previo de Neon, porque un ajuste que
-- ya estaba en 10.000.000 no se distingue de uno cambiado por esta migración):
--   ALTER TABLE finanzas.flujo_ajustes ALTER COLUMN umbral SET DEFAULT 15000000;
-- Para devolver los ajustes cambiados, restaurar desde el respaldo previo.
