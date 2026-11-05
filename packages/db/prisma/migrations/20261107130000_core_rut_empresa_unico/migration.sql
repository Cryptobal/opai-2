-- CAR-188 · RUT de la empresa único (Plataforma lo pide al crear la empresa y lo exige para abrir una
-- prueba). El RUT vive en core.perfil_empresa.rut (forma canónica «76123456-7», sin puntos). Dos
-- empresas no pueden tener el mismo RUT: el índice único lo garantiza aunque haya carreras y sin
-- depender de la RLS (las restricciones únicas ven todas las filas). El índice es sobre la forma
-- normalizada (solo dígitos y K en mayúscula), así «76.123.456-7», «76123456-7» y «76123456-7» con
-- espacios cuentan como el mismo RUT; los vacíos no cuentan. Aditiva: no cambia ningún dato.
-- Si ya hubiera dos empresas con el mismo RUT, el preflight (y en todo caso CREATE UNIQUE INDEX)
-- falla y la transacción se revierte entera con un mensaje claro: hay que corregir el dato antes.
-- Nota: bajo FORCE RLS sin BYPASSRLS el preflight solo ve las filas del tenant fijado (ninguna aquí);
-- CREATE UNIQUE INDEX sí ve todas, así que la garantía no depende del preflight.
BEGIN;
SET LOCAL lock_timeout = '5s';

DO $$
DECLARE
  repetidos integer;
BEGIN
  SELECT count(*) INTO repetidos FROM (
    SELECT upper(regexp_replace("rut", '[^0-9kK]', '', 'g'))
    FROM "core"."perfil_empresa"
    WHERE "rut" IS NOT NULL AND btrim("rut") <> ''
    GROUP BY 1 HAVING count(*) > 1
  ) d;
  IF repetidos > 0 THEN
    RAISE EXCEPTION 'core.perfil_empresa: % RUT de empresa repetidos (con o sin puntos); corrígelos antes de aplicar', repetidos;
  END IF;
END $$;

-- Por si una versión anterior de este mismo índice (solo sobre `rut`) quedó creada en dev.
DROP INDEX IF EXISTS "core"."perfil_empresa_rut_unico";
CREATE UNIQUE INDEX "perfil_empresa_rut_unico" ON "core"."perfil_empresa"
  ((upper(regexp_replace("rut", '[^0-9kK]', '', 'g'))))
  WHERE "rut" IS NOT NULL AND btrim("rut") <> '';

COMMIT;

-- Reversión: DROP INDEX "core"."perfil_empresa_rut_unico";
