-- CAR-188 · RUT de la empresa único (Plataforma lo pide al crear la empresa y lo exige para abrir una
-- prueba). El RUT vive en core.perfil_empresa.rut (forma canónica «76123456-7», sin puntos). Dos
-- empresas no pueden tener el mismo RUT: el índice único parcial lo garantiza aunque haya carreras y
-- sin depender de la RLS (las restricciones únicas ven todas las filas). Aditiva: no cambia datos. Si
-- ya hubiera dos empresas con el mismo RUT, CREATE UNIQUE INDEX falla y la transacción se revierte
-- entera; hay que corregir el dato antes de aplicar.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE UNIQUE INDEX "perfil_empresa_rut_unico" ON "core"."perfil_empresa"("rut") WHERE "rut" IS NOT NULL;

COMMIT;

-- Reversión: DROP INDEX "core"."perfil_empresa_rut_unico";
