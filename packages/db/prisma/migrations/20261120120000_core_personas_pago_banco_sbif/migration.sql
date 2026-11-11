-- Personas · banco con código SBIF (CAR-244). Qué hace y por qué: desde este PR la ficha elige el banco y el tipo de
-- cuenta de un catálogo (packages/domain/src/bancos.ts) y guarda el código SBIF de 3 dígitos, que es el que va en
-- las nóminas de pago. Esta migración convierte lo que se escribió a mano antes del selector: nombres de banco
-- reconocibles («Banco Estado», «Santander», «BCI») pasan a su código, y el tipo de cuenta a corriente, vista, rut o
-- ahorro. Lo que no se reconoce se deja tal cual: la ficha lo muestra como «por corregir» para corrección manual.
-- Alcance: cuenta vigente (core.personas_pago) y solicitudes pendientes (core.personas_pago_solicitudes); las
-- solicitudes ya resueltas son historia y no se tocan. Sin cambios de esquema, sin borrar datos.
-- Migración de datos con FORCE RLS: exige BYPASSRLS o superusuario y verifica el resultado (REGLAS-codigo.md).
-- La tabla de alias se genera del catálogo del dominio (mismos nombres y alias, misma normalización).
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TEMP TABLE car244_alias (clave text PRIMARY KEY, codigo text NOT NULL) ON COMMIT DROP;
INSERT INTO car244_alias (clave, codigo) VALUES
    ('banco de chile', '001'),
    ('chile', '001'),
    ('banco internacional', '009'),
    ('internacional', '009'),
    ('bancoestado', '012'),
    ('estado', '012'),
    ('banco estado', '012'),
    ('scotiabank', '014'),
    ('bci incluye mach', '016'),
    ('bci', '016'),
    ('mach', '016'),
    ('banco de credito e inversiones', '016'),
    ('credito e inversiones', '016'),
    ('banco bice', '028'),
    ('bice', '028'),
    ('hsbc', '031'),
    ('santander', '037'),
    ('banco santander', '037'),
    ('santander chile', '037'),
    ('itau', '039'),
    ('banco itau', '039'),
    ('banco security', '049'),
    ('security', '049'),
    ('banco falabella', '051'),
    ('falabella', '051'),
    ('banco ripley', '053'),
    ('ripley', '053'),
    ('banco consorcio', '055'),
    ('consorcio', '055'),
    ('mercado pago', '299'),
    ('banco edwards citi', '504'),
    ('edwards citi', '504'),
    ('edwards', '504'),
    ('citi', '504'),
    ('coopeuch', '672'),
    ('tenpo', '730'),
    ('prex', '743'),
    ('001', '001'),
    ('009', '009'),
    ('012', '012'),
    ('014', '014'),
    ('016', '016'),
    ('028', '028'),
    ('031', '031'),
    ('037', '037'),
    ('039', '039'),
    ('049', '049'),
    ('051', '051'),
    ('053', '053'),
    ('055', '055'),
    ('299', '299'),
    ('504', '504'),
    ('672', '672'),
    ('730', '730'),
    ('743', '743');

-- Misma normalización que el dominio: sin tildes (también en mayúsculas, que lower() no baja con collation C),
-- minúsculas, solo letras, números y espacios simples.
CREATE FUNCTION pg_temp.car244_clave(t text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT btrim(regexp_replace(regexp_replace(
    lower(translate(coalesce(t, ''),
      'áàäâãåéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÅÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
      'aaaaaaeeeeiiiiooooouuuuncAAAAAAEEEEIIIIOOOOOUUUUNC')),
    '[^a-z0-9 ]+', ' ', 'g'), '\s+', ' ', 'g'))
$$;

CREATE FUNCTION pg_temp.car244_banco(t text) RETURNS text LANGUAGE sql STABLE AS $$
  SELECT coalesce(
    (SELECT codigo FROM car244_alias WHERE clave = pg_temp.car244_clave(t)),
    (SELECT codigo FROM car244_alias WHERE clave = regexp_replace(pg_temp.car244_clave(t), '^banco (de )?', '')))
$$;

CREATE FUNCTION pg_temp.car244_tipo(t text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN pg_temp.car244_clave(t) IN ('corriente', 'vista', 'rut', 'ahorro') THEN pg_temp.car244_clave(t)
    WHEN pg_temp.car244_clave(t) ~ '\mrut\M' THEN 'rut'
    WHEN pg_temp.car244_clave(t) ~ 'corriente' THEN 'corriente'
    WHEN pg_temp.car244_clave(t) ~ 'ahorro' THEN 'ahorro'
    WHEN pg_temp.car244_clave(t) ~ 'vista|chequera electronica' THEN 'vista'
  END
$$;

DO $$
DECLARE
  v_bancos integer;
  v_tipos integer;
  v_pend integer;
  v_sin integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = current_user AND (rolbypassrls OR rolsuper)) THEN
    RAISE EXCEPTION 'Esta migración de datos exige un rol con BYPASSRLS o superusuario (FORCE RLS filtra en silencio).';
  END IF;

  UPDATE core.personas_pago SET banco_codigo = pg_temp.car244_banco(banco_codigo)
   WHERE banco_codigo IS NOT NULL AND pg_temp.car244_banco(banco_codigo) IS DISTINCT FROM banco_codigo
     AND pg_temp.car244_banco(banco_codigo) IS NOT NULL;
  GET DIAGNOSTICS v_bancos = ROW_COUNT;
  UPDATE core.personas_pago SET tipo_cuenta = pg_temp.car244_tipo(tipo_cuenta)
   WHERE tipo_cuenta IS NOT NULL AND pg_temp.car244_tipo(tipo_cuenta) IS DISTINCT FROM tipo_cuenta
     AND pg_temp.car244_tipo(tipo_cuenta) IS NOT NULL;
  GET DIAGNOSTICS v_tipos = ROW_COUNT;

  UPDATE core.personas_pago_solicitudes
     SET banco_codigo = coalesce(pg_temp.car244_banco(banco_codigo), banco_codigo),
         tipo_cuenta = coalesce(pg_temp.car244_tipo(tipo_cuenta), tipo_cuenta)
   WHERE estado = 'pendiente'
     AND (pg_temp.car244_banco(banco_codigo) IS DISTINCT FROM banco_codigo
          OR pg_temp.car244_tipo(tipo_cuenta) IS DISTINCT FROM tipo_cuenta)
     AND (pg_temp.car244_banco(banco_codigo) IS NOT NULL OR pg_temp.car244_tipo(tipo_cuenta) IS NOT NULL);
  GET DIAGNOSTICS v_pend = ROW_COUNT;

  -- Verificación: nada reconocible quedó sin convertir. (Contra el filtrado silencioso de FORCE RLS protege la
  -- exigencia de BYPASSRLS de arriba; esta lectura pasaría por el mismo filtro.)
  IF EXISTS (SELECT 1 FROM core.personas_pago
              WHERE (pg_temp.car244_banco(banco_codigo) IS NOT NULL AND pg_temp.car244_banco(banco_codigo) <> banco_codigo)
                 OR (pg_temp.car244_tipo(tipo_cuenta) IS NOT NULL AND pg_temp.car244_tipo(tipo_cuenta) <> tipo_cuenta))
     OR EXISTS (SELECT 1 FROM core.personas_pago_solicitudes WHERE estado = 'pendiente'
              AND ((pg_temp.car244_banco(banco_codigo) IS NOT NULL AND pg_temp.car244_banco(banco_codigo) <> banco_codigo)
                OR (pg_temp.car244_tipo(tipo_cuenta) IS NOT NULL AND pg_temp.car244_tipo(tipo_cuenta) <> tipo_cuenta))) THEN
    RAISE EXCEPTION 'Quedaron bancos o tipos de cuenta reconocibles sin convertir.';
  END IF;

  SELECT count(*) INTO v_sin FROM core.personas_pago
   WHERE (banco_codigo IS NOT NULL AND pg_temp.car244_banco(banco_codigo) IS NULL)
      OR (tipo_cuenta IS NOT NULL AND pg_temp.car244_tipo(tipo_cuenta) IS NULL);
  RAISE NOTICE 'CAR-244: % bancos y % tipos de cuenta convertidos, % solicitudes pendientes; % cuentas quedan por corregir a mano.',
    v_bancos, v_tipos, v_pend, v_sin;
END
$$;

COMMIT;

-- Reversión: no hay cambio de esquema. Los valores convertidos son códigos del catálogo; volver al texto original
-- no es necesario para operar (la ficha y la nómina leen el código). El respaldo previo del bot conserva el original.
