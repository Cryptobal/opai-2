-- Qué hace y por qué (CAR-299, decisión de Carlos del 11-nov-2026): cada empresa puede fijar un tiempo
-- objetivo de primera respuesta a sus solicitudes. Para medirlo hace falta saber cuándo se atendió por
-- primera vez cada una. Aditivo y reversible: una columna nula; sin relleno de filas antiguas (quedan
-- «sin dato» y no cuentan como fuera de plazo). Sin cambios de RLS: la tabla ya tiene `tenant_isolation`.
-- Tablas con tenant_id nuevas: ninguna. Migración de datos: ninguna.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "comercial"."solicitudes" ADD COLUMN "primera_respuesta_en" TIMESTAMPTZ(6);

COMMIT;

-- Reversión: ALTER TABLE "comercial"."solicitudes" DROP COLUMN "primera_respuesta_en";
-- (solo se pierde la hora de primera respuesta; el resto de la solicitud no cambia).
