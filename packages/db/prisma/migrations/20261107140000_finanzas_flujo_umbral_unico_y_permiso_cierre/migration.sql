-- Flujo de caja B1 (CAR-193, ADR-073): datos que dejó pendientes el PR A (#328).
-- Qué hace y por qué:
--  1. El umbral único de saldo bajo parte en 15.000.000 y el aviso en la campana queda activo: se cambia el valor por
--     defecto de las columnas y se llevan a ese valor los ajustes que seguían en el defecto viejo (umbral 0 y aviso
--     apagado, es decir, nunca tocados). Los ajustes que alguien configuró no se tocan.
--  2. El permiso `finanzas:flujo.cerrar` ya no existe en el catálogo (se retiró el sellado): se quita de los roles
--     personalizados, de las keys y de las excepciones por usuario que lo tuvieran, para que se puedan volver a guardar.
-- Las columnas `tolerancia_cierre` y `aviso_umbral` NO se borran (siguen sin uso; decisión de borrarlas, aparte).
-- Migración de datos con FORCE RLS: el rol que migra debe saltarse la RLS o el UPDATE no vería filas sin error
-- (docs/2.0/REGLAS-codigo.md); por eso se exige BYPASSRLS o superusuario y se verifica el resultado.
BEGIN;
SET LOCAL lock_timeout = '5s';

DO $$
DECLARE
  v_n integer;
  v_pendientes integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = current_user AND (rolbypassrls OR rolsuper)) THEN
    RAISE EXCEPTION 'Esta migración de datos exige un rol con BYPASSRLS o superusuario (FORCE RLS filtra en silencio).';
  END IF;

  ALTER TABLE finanzas.flujo_ajustes ALTER COLUMN umbral SET DEFAULT 15000000;
  ALTER TABLE finanzas.flujo_ajustes ALTER COLUMN aviso_activo SET DEFAULT true;

  UPDATE finanzas.flujo_ajustes SET umbral = 15000000, aviso_activo = true, updated_at = now()
   WHERE umbral = 0 AND aviso_activo = false;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  SELECT count(*) INTO v_pendientes FROM finanzas.flujo_ajustes WHERE umbral = 0 AND aviso_activo = false;
  IF v_pendientes <> 0 THEN
    RAISE EXCEPTION 'Quedaron % ajustes del flujo sin llevar al umbral único (actualizados: %).', v_pendientes, v_n;
  END IF;

  UPDATE core.roles SET permisos = array_remove(permisos, 'finanzas:flujo.cerrar'), updated_at = now()
   WHERE 'finanzas:flujo.cerrar' = ANY (permisos);
  UPDATE core.api_keys SET permisos = array_remove(permisos, 'finanzas:flujo.cerrar')
   WHERE 'finanzas:flujo.cerrar' = ANY (permisos);
  DELETE FROM core.permiso_excepciones WHERE permiso = 'finanzas:flujo.cerrar';

  IF EXISTS (SELECT 1 FROM core.roles WHERE 'finanzas:flujo.cerrar' = ANY (permisos))
     OR EXISTS (SELECT 1 FROM core.api_keys WHERE 'finanzas:flujo.cerrar' = ANY (permisos))
     OR EXISTS (SELECT 1 FROM core.permiso_excepciones WHERE permiso = 'finanzas:flujo.cerrar') THEN
    RAISE EXCEPTION 'Quedaron referencias a finanzas:flujo.cerrar en roles, keys o excepciones.';
  END IF;
END
$$;

COMMIT;

-- Reversión: los valores por defecto vuelven con
--   ALTER TABLE finanzas.flujo_ajustes ALTER COLUMN umbral SET DEFAULT 0;
--   ALTER TABLE finanzas.flujo_ajustes ALTER COLUMN aviso_activo SET DEFAULT false;
-- Los datos (ajustes llevados a 15.000.000 y el permiso quitado de roles, keys y excepciones) no se pueden
-- reconstruir porque no se guardan los valores previos: se restauran desde el snapshot previo de Neon.
