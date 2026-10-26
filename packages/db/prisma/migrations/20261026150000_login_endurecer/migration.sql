-- B1 · Endurecer el bloqueo de login (seguimiento del PR #46, Brief 07c; CAR-16). Migración NUEVA
-- encima de 20261026140000; no se reescribe ninguna anterior. Es idempotente (IF NOT EXISTS,
-- CREATE OR REPLACE, DROP ... IF EXISTS, REVOKE/GRANT), así que puede volver a aplicarse sin efecto.
-- No crea tablas: no hay RLS nueva que activar (login_intentos es global, como users).

-- Índice por IP: la consulta de tope por IP de `bloqueo-login.ts` filtra por (ip, created_at).
CREATE INDEX IF NOT EXISTS "login_intentos_ip_created_at_idx"
  ON "core"."login_intentos"("ip", "created_at");

-- Índice parcial de éxitos: el "último éxito del correo" y la exención del tope global solo miran
-- filas con exito = true, que son pocas frente a los fallos. (Prisma no modela índices parciales:
-- vive solo en SQL, como otros de este repositorio.)
CREATE INDEX IF NOT EXISTS "login_intentos_correo_hash_created_at_exito_idx"
  ON "core"."login_intentos"("correo_hash", "created_at") WHERE "exito";

-- La resolución del provisional pasa a ir por el UUID que devolvió la reserva (ya no por correo e
-- IP): así el `after` marca exactamente el intento que reservó su `before`, aunque haya otros
-- provisionales del mismo correo e IP en vuelo. Solo resuelve un provisional (motivo 'pendiente'):
-- una segunda llamada, o un id ajeno ya resuelto, devuelve false. FOR UPDATE SKIP LOCKED evita
-- esperar o pisar una resolución simultánea del mismo id.
-- La versión de 4 argumentos (correo e IP) de 20261026140000 se CONSERVA a propósito: mientras se
-- despliega el código nuevo, las instancias viejas siguen resolviendo con ella y no quedan
-- provisionales colgados. Se borra en una migración posterior, cuando ya nadie la llame.

CREATE OR REPLACE FUNCTION "core"."marcar_login_intento"(
  intento_id uuid, es_exito boolean, nuevo_motivo text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  objetivo uuid;
BEGIN
  SELECT id INTO objetivo FROM "core"."login_intentos"
    WHERE id = intento_id AND motivo = 'pendiente'
    FOR UPDATE SKIP LOCKED;
  IF objetivo IS NULL THEN
    RETURN false;
  END IF;
  UPDATE "core"."login_intentos" SET exito = es_exito, motivo = nuevo_motivo WHERE id = objetivo;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION "core"."marcar_login_intento"(uuid, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "core"."marcar_login_intento"(uuid, boolean, text) TO opai_app;

-- Purga con retención mínima de 30 días: `GREATEST` evita que un 0 o un negativo borre todo. La
-- 20261026140000 ya la traía; se vuelve a declarar aquí para que esta migración la fije por sí sola
-- (y un test de base la cubre).
CREATE OR REPLACE FUNCTION "core"."purgar_login_intentos"(retencion_dias integer DEFAULT 30)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  borradas integer;
BEGIN
  DELETE FROM "core"."login_intentos"
    WHERE created_at < now() - make_interval(days => GREATEST(COALESCE(retencion_dias, 30), 30));
  GET DIAGNOSTICS borradas = ROW_COUNT;
  RETURN borradas;
END;
$$;

REVOKE ALL ON FUNCTION "core"."purgar_login_intentos"(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "core"."purgar_login_intentos"(integer) TO opai_app;

-- Inversa (manual; Prisma no aplica down):
--   DROP INDEX "core"."login_intentos_ip_created_at_idx";
--   DROP INDEX "core"."login_intentos_correo_hash_created_at_exito_idx";
--   DROP FUNCTION "core"."marcar_login_intento"(uuid, boolean, text);
