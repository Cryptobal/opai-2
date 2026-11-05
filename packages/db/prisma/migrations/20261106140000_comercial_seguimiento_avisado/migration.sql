-- Qué hace y por qué: CAR-192 (pendiente del Revisor de #315). `comercial.seguimientos.avisado_en` marca
-- cuándo se avisó al vendedor de la primera respuesta del cliente, para no pisar `motivo` («manual»)
-- con «cliente_respondio». ADITIVA: una columna nullable sin default ni reescritura de la tabla.
-- La tabla ya tiene RLS FORCE y su política `tenant_isolation`; una columna nueva no cambia eso.
-- Sin migración de datos: los seguimientos que una respuesta ya pausó (motivo `cliente_respondio`) se
-- tratan como avisados en el código, así que no hace falta un UPDATE bajo FORCE RLS.

BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "comercial"."seguimientos" ADD COLUMN "avisado_en" TIMESTAMPTZ(6);

COMMIT;
