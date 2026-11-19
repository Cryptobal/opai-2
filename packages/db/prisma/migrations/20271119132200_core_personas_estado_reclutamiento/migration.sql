-- CAR-674: estados de persona en reclutamiento. Mapea activa→activo e inactiva→inactivo en core.personas.
-- Migración de datos con FORCE RLS: ejecutar con rol propietario; verifica filas afectadas (REGLAS-codigo.md).
BEGIN;
SET LOCAL lock_timeout = '5s';

DO $$
DECLARE
  v_activas integer;
  v_inactivas integer;
  v_otros integer;
BEGIN
  UPDATE core.personas SET estado = 'activo' WHERE estado = 'activa';
  GET DIAGNOSTICS v_activas = ROW_COUNT;
  UPDATE core.personas SET estado = 'inactivo' WHERE estado = 'inactiva';
  GET DIAGNOSTICS v_inactivas = ROW_COUNT;
  SELECT count(*)::integer INTO v_otros FROM core.personas WHERE estado NOT IN (
    'postulante', 'en_evaluacion', 'rechazado', 'externo', 'activo', 'inactivo', 'bloqueado_permanente'
  );
  IF v_otros > 0 THEN
    RAISE EXCEPTION 'core.personas.estado: quedaron % filas con valor inesperado tras la migración', v_otros;
  END IF;
  RAISE NOTICE 'CAR-674: % activa→activo, % inactiva→inactivo', v_activas, v_inactivas;
END $$;

COMMIT;

-- Reversión (manual, rol propietario, tras snapshot): BEGIN; SET LOCAL lock_timeout = '5s';
--   UPDATE core.personas SET estado = 'activa' WHERE estado = 'activo' AND estado NOT IN ('postulante','en_evaluacion','rechazado','externo','bloqueado_permanente');
--   UPDATE core.personas SET estado = 'inactiva' WHERE estado = 'inactivo';
--   (los estados nuevos del encargo no existían antes: revisar filas a mano o restaurar desde snapshot de Neon).
-- COMMIT;