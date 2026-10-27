-- Brief 11 · Puestos PR 1, revisión 5658390255. Integridad de los catálogos nuevos en la base
-- (no solo en las capacidades). Idempotente: se puede volver a correr sin efecto.

-- 1. Mismo tenant: funcion_id y patron_id del puesto también se validan (antes solo
--    instalacion_id y cargo_id). Una fila de A no puede apuntar a un catálogo de B.
DROP TRIGGER IF EXISTS mismo_tenant ON "core"."puestos";
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."puestos"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'instalacion_id', 'core.instalaciones', 'cargo_id', 'core.cargos',
    'funcion_id', 'core.funciones_puesto', 'patron_id', 'core.patrones_turno');

-- 2. El ciclo del puesto sale de su patrón. Se lee con FOR SHARE: un cambio de estructura del
--    patrón en curso espera (o hace esperar) a esta escritura, sin ventana entre leer y escribir.
--    Corre después de mismo_tenant (orden alfabético), así que el patrón ya es del mismo tenant.
CREATE OR REPLACE FUNCTION "core"."puesto_ciclo_del_patron"() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  p record;
BEGIN
  IF NEW.patron_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT dias_trabajo, dias_descanso INTO p
    FROM "core"."patrones_turno" WHERE id = NEW.patron_id FOR SHARE;
  IF FOUND THEN
    NEW.dias_trabajo := p.dias_trabajo;
    NEW.dias_descanso := p.dias_descanso;
  END IF;
  RETURN NEW;
END
$$;
REVOKE ALL ON FUNCTION "core"."puesto_ciclo_del_patron"() FROM PUBLIC;
DROP TRIGGER IF EXISTS puesto_ciclo_patron ON "core"."puestos";
CREATE TRIGGER puesto_ciclo_patron BEFORE INSERT OR UPDATE ON "core"."puestos"
  FOR EACH ROW EXECUTE FUNCTION "core"."puesto_ciclo_del_patron"();

-- 3. Un patrón con puestos (activos o no) no cambia su estructura (clase, ciclo, días de la
--    semana): los puestos guardan el ciclo y las horas calculadas con la estructura anterior.
--    Nombre, orden y activo sí se pueden cambiar.
CREATE OR REPLACE FUNCTION "core"."patron_en_uso_inmutable"() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF (NEW.clase, NEW.dias_trabajo, NEW.dias_descanso, NEW.dias_semana)
       IS DISTINCT FROM (OLD.clase, OLD.dias_trabajo, OLD.dias_descanso, OLD.dias_semana)
     AND EXISTS (SELECT 1 FROM "core"."puestos" WHERE patron_id = OLD.id) THEN
    RAISE EXCEPTION 'El patrón % está en uso: su estructura no se puede cambiar', OLD.nombre
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END
$$;
REVOKE ALL ON FUNCTION "core"."patron_en_uso_inmutable"() FROM PUBLIC;
DROP TRIGGER IF EXISTS patron_en_uso ON "core"."patrones_turno";
CREATE TRIGGER patron_en_uso BEFORE UPDATE ON "core"."patrones_turno"
  FOR EACH ROW EXECUTE FUNCTION "core"."patron_en_uso_inmutable"();

-- Reversión (manual, solo referencia; no la aplica Prisma). Deja la base como antes de esta
-- migración, sin tocar datos. Corre con el rol propietario. La migración `20261028040000` queda:
--
--   -- 1. Restaura el trigger mismo_tenant a su versión previa (solo instalacion_id y cargo_id):
--   DROP TRIGGER IF EXISTS mismo_tenant ON "core"."puestos";
--   CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."puestos"
--     FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
--       'instalacion_id', 'core.instalaciones', 'cargo_id', 'core.cargos');
--
--   -- 2. Quita el ciclo-del-patrón:
--   DROP TRIGGER IF EXISTS puesto_ciclo_patron ON "core"."puestos";
--   DROP FUNCTION IF EXISTS "core"."puesto_ciclo_del_patron"();
--
--   -- 3. Quita la inmutabilidad del patrón en uso:
--   DROP TRIGGER IF EXISTS patron_en_uso ON "core"."patrones_turno";
--   DROP FUNCTION IF EXISTS "core"."patron_en_uso_inmutable"();
