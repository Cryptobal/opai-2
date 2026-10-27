-- B1 · Bloqueo de login: resolución del intento provisional y purga con mínimo de retención
-- (Brief 07c, revisión del PR #46; política en §16.3 y §4.1). Migración NUEVA encima de
-- 20261026130000; no se reescribe la anterior. Todo es CREATE OR REPLACE / REVOKE / GRANT, así que
-- es idempotente y puede volver a aplicarse sin efecto.
--
-- Cierra la carrera del bloqueo: el `before` de @opai/auth toma pg_advisory_xact_lock por correo,
-- cuenta e inserta un intento provisional (motivo 'pendiente', que cuenta como fallo) en la misma
-- transacción; el `after` lo resuelve a éxito o fallo con esta función. opai_app sigue sin UPDATE ni
-- DELETE sobre login_intentos (solo-anexar); la resolución va por una función SECURITY DEFINER que
-- marca UN provisional del mismo correo e IP con FOR UPDATE SKIP LOCKED, de modo que dos `after`
-- simultáneos no resuelven el mismo. La IP nula se trata con IS NOT DISTINCT FROM (agrupa por NULL).

CREATE OR REPLACE FUNCTION "core"."marcar_login_intento"(
  correo_hash_param text, ip_param text, es_exito boolean, nuevo_motivo text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  objetivo uuid;
BEGIN
  SELECT id INTO objetivo FROM "core"."login_intentos"
    WHERE motivo = 'pendiente'
      AND correo_hash = correo_hash_param
      AND ip IS NOT DISTINCT FROM ip_param
    ORDER BY created_at
    LIMIT 1 FOR UPDATE SKIP LOCKED;
  IF objetivo IS NULL THEN
    RETURN false;
  END IF;
  UPDATE "core"."login_intentos" SET exito = es_exito, motivo = nuevo_motivo WHERE id = objetivo;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION "core"."marcar_login_intento"(text, text, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "core"."marcar_login_intento"(text, text, boolean, text) TO opai_app;

-- No bloqueante (revisión del PR #46): la purga nunca borra por debajo de la retención mínima de 30
-- días aunque reciba un valor menor (GREATEST), para no acortar la retención por un parámetro erróneo.
CREATE OR REPLACE FUNCTION "core"."purgar_login_intentos"(retencion_dias integer DEFAULT 30)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  borradas integer;
BEGIN
  DELETE FROM "core"."login_intentos"
    WHERE created_at < now() - make_interval(days => GREATEST(retencion_dias, 30));
  GET DIAGNOSTICS borradas = ROW_COUNT;
  RETURN borradas;
END;
$$;

REVOKE ALL ON FUNCTION "core"."purgar_login_intentos"(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "core"."purgar_login_intentos"(integer) TO opai_app;

-- Inversa (manual; Prisma no aplica down):
--   DROP FUNCTION "core"."marcar_login_intento"(text, text, boolean, text);
--   -- purgar_login_intentos vuelve a su versión sin GREATEST con un CREATE OR REPLACE.
