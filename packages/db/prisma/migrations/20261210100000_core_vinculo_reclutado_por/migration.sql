-- Personas · CAR-309 (ADR-094, adenda CAR-309): quién reclutó a cada persona. Migración aditiva, sin
-- datos: una columna nullable en core.vinculos_laborales y su índice.
-- Qué hace y por qué: el vínculo laboral guarda el usuario que reclutó a la persona («Reclutado por»).
-- OPAI lo llena con quien registra el ingreso y se puede cambiar (queda en la auditoría). Lo usa el
-- indicador «Retención a 90 días» y «Días para cubrir una vacante». Los vínculos existentes quedan sin
-- reclutador (NULL) y no cuentan para esos indicadores.
-- Sin FK a core.users (como `creada_por` de la pauta): el id se valida en la capacidad contra las
-- membresías de la empresa. La tabla ya tiene RLS + FORCE + tenant_isolation; no cambia.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "core"."vinculos_laborales" ADD COLUMN "reclutado_por" UUID;

CREATE INDEX "vinculos_tenant_reclutado_idx"
  ON "core"."vinculos_laborales" ("tenant_id", "reclutado_por");

COMMIT;

-- Reversión: DROP INDEX "core"."vinculos_tenant_reclutado_idx"; ALTER TABLE "core"."vinculos_laborales"
-- DROP COLUMN "reclutado_por"; (se pierde quién reclutó a cada persona; restaurar desde el snapshot).
