-- Qué hace y por qué: corrección de datos del calendario del Núcleo (CAR-79/CAR-76/CAR-80, QA ALTO).
-- Decisión de Carlos del 30-oct-2026: los feriados legales de Chile se CALCULAN por regla en el código
-- (packages/domain/src/calendario/feriados.ts) para cualquier año; la tabla core.dias_calendario queda
-- solo para feriados por ley puntual (p. ej. elecciones) y los días propios de cada empresa. Por eso
-- esta migración BORRA de forma idempotente las 20 filas de PLATAFORMA (tenant_id NULL) de fecha fija
-- de 2026–2027 que sembró 20261030000000_core_calendario: ahora salen del cálculo y no deben duplicar.
-- No toca filas de tenants (tenant_id NOT NULL) ni regionales ni la migración ya aplicada.
--
-- RLS: core.dias_calendario nace con FORCE ROW LEVEL SECURITY; las filas de plataforma (tenant_id NULL)
-- no las puede borrar opai_app (ninguna política las habilita para DELETE) y, si el rol de deploy no es
-- BYPASSRLS, un DELETE sobre ellas afectaría 0 filas en silencio (REGLAS-codigo, «Migraciones de datos
-- después de FORCE RLS»). Por eso el dueño de la tabla quita FORCE dentro de la transacción —con FORCE
-- apagado el dueño no queda sujeto a las políticas— borra, verifica con GET DIAGNOSTICS y vuelve a
-- poner FORCE. ENABLE ROW LEVEL SECURITY y las políticas no se tocan. Idempotente: si ya no hay filas,
-- borra 0 y no falla.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "core"."dias_calendario" NO FORCE ROW LEVEL SECURITY;

DO $$
DECLARE
  borradas integer;
BEGIN
  DELETE FROM "core"."dias_calendario"
  WHERE "tenant_id" IS NULL
    AND "region" IS NULL
    AND "fuente" = 'nacional'
    AND "fecha" IN (
      DATE '2026-01-01', DATE '2026-05-01', DATE '2026-05-21', DATE '2026-07-16',
      DATE '2026-08-15', DATE '2026-09-18', DATE '2026-09-19', DATE '2026-11-01',
      DATE '2026-12-08', DATE '2026-12-25',
      DATE '2027-01-01', DATE '2027-05-01', DATE '2027-05-21', DATE '2027-07-16',
      DATE '2027-08-15', DATE '2027-09-18', DATE '2027-09-19', DATE '2027-11-01',
      DATE '2027-12-08', DATE '2027-12-25'
    );
  GET DIAGNOSTICS borradas = ROW_COUNT;
  RAISE NOTICE 'feriados de plataforma de fecha fija borrados: %', borradas;
END $$;

ALTER TABLE "core"."dias_calendario" FORCE ROW LEVEL SECURITY;

COMMIT;

-- Reversión (manual, solo referencia; Prisma no aplica down): vuelve a sembrar las 20 filas con el rol
-- propietario y FORCE apagado, igual que 20261030000000_core_calendario (o se restaura del snapshot de
-- Neon previo, OPERACION-agentes.md A.5). Las 20 filas (fecha, nombre, irrenunciable) son idénticas a
-- las del seed original 20261030000000 y a las que borra el DELETE de arriba. SQL:
--   ALTER TABLE "core"."dias_calendario" NO FORCE ROW LEVEL SECURITY;
--   INSERT INTO "core"."dias_calendario" ("id","tenant_id","fecha","tipo","nombre","irrenunciable","region","instalacion_id","fuente")
--   SELECT gen_random_uuid(), NULL, v.fecha::date, 'feriado', v.nombre, v.irr, NULL, NULL, 'nacional'
--   FROM (VALUES
--     ('2026-01-01','Año Nuevo',true),
--     ('2026-05-01','Día Nacional del Trabajo',true),
--     ('2026-05-21','Día de las Glorias Navales',false),
--     ('2026-07-16','Día de la Virgen del Carmen',false),
--     ('2026-08-15','Asunción de la Virgen',false),
--     ('2026-09-18','Independencia Nacional',true),
--     ('2026-09-19','Día de las Glorias del Ejército',true),
--     ('2026-11-01','Día de Todos los Santos',false),
--     ('2026-12-08','Inmaculada Concepción',false),
--     ('2026-12-25','Navidad',true),
--     ('2027-01-01','Año Nuevo',true),
--     ('2027-05-01','Día Nacional del Trabajo',true),
--     ('2027-05-21','Día de las Glorias Navales',false),
--     ('2027-07-16','Día de la Virgen del Carmen',false),
--     ('2027-08-15','Asunción de la Virgen',false),
--     ('2027-09-18','Independencia Nacional',true),
--     ('2027-09-19','Día de las Glorias del Ejército',true),
--     ('2027-11-01','Día de Todos los Santos',false),
--     ('2027-12-08','Inmaculada Concepción',false),
--     ('2027-12-25','Navidad',true)
--   ) AS v(fecha,nombre,irr)
--   WHERE NOT EXISTS (SELECT 1 FROM "core"."dias_calendario" d WHERE d.tenant_id IS NULL AND d.region IS NULL AND d.fecha = v.fecha::date);
--   ALTER TABLE "core"."dias_calendario" FORCE ROW LEVEL SECURITY;
