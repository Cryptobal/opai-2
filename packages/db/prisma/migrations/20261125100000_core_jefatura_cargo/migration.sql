-- Núcleo · CAR-314 (ADR-094): jefatura por cargo y personas a cargo. Migración aditiva, sin datos:
-- dos columnas en core.cargos (a qué cargo reporta y a quiénes ve esa jefatura) y una en core.personas
-- (jefe directo). Las dos tablas ya tienen RLS + FORCE + tenant_isolation; no se crean tablas.
-- FK compuestas por tenant: la jefatura y el jefe son siempre de la MISMA empresa, aunque alguien salte
-- la capacidad. Los índices únicos (tenant_id, id) existen solo para sostener esas FK.
-- Qué hace y por qué: Desempeño (y luego aprobaciones o tickets) necesita saber quién ve a quién.
BEGIN;
SET LOCAL lock_timeout = '5s';

-- Primero los ALTER TABLE: toman de entrada el bloqueo más fuerte (bajo el lock_timeout) y la
-- transacción no escala de SHARE a ACCESS EXCLUSIVE a mitad de camino.
ALTER TABLE "core"."cargos"
  ADD COLUMN "jefatura_cargo_id" UUID,
  ADD COLUMN "jefatura_ve" TEXT NOT NULL DEFAULT 'asignadas',
  ADD CONSTRAINT "cargos_jefatura_ve_check"
    CHECK ("jefatura_ve" IN ('asignadas', 'equipo', 'instalaciones')),
  ADD CONSTRAINT "cargos_jefatura_distinta_check"
    CHECK ("jefatura_cargo_id" IS NULL OR "jefatura_cargo_id" <> "id");

ALTER TABLE "core"."personas"
  ADD COLUMN "jefe_persona_id" UUID,
  ADD CONSTRAINT "personas_jefe_distinto_check"
    CHECK ("jefe_persona_id" IS NULL OR "jefe_persona_id" <> "id");

CREATE UNIQUE INDEX "cargos_tenant_id_id_key" ON "core"."cargos"("tenant_id", "id");
CREATE UNIQUE INDEX "personas_tenant_id_id_key" ON "core"."personas"("tenant_id", "id");

CREATE INDEX "cargos_tenant_id_jefatura_cargo_id_idx"
  ON "core"."cargos"("tenant_id", "jefatura_cargo_id");
CREATE INDEX "personas_tenant_id_jefe_persona_id_idx"
  ON "core"."personas"("tenant_id", "jefe_persona_id");

ALTER TABLE "core"."cargos" ADD CONSTRAINT "cargos_tenant_id_jefatura_cargo_id_fkey"
  FOREIGN KEY ("tenant_id", "jefatura_cargo_id") REFERENCES "core"."cargos"("tenant_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core"."personas" ADD CONSTRAINT "personas_tenant_id_jefe_persona_id_fkey"
  FOREIGN KEY ("tenant_id", "jefe_persona_id") REFERENCES "core"."personas"("tenant_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;

-- Reversión: ALTER TABLE "core"."personas" DROP CONSTRAINT "personas_tenant_id_jefe_persona_id_fkey",
--   DROP CONSTRAINT "personas_jefe_distinto_check", DROP COLUMN "jefe_persona_id";
-- ALTER TABLE "core"."cargos" DROP CONSTRAINT "cargos_tenant_id_jefatura_cargo_id_fkey",
--   DROP CONSTRAINT "cargos_jefatura_ve_check", DROP CONSTRAINT "cargos_jefatura_distinta_check",
--   DROP COLUMN "jefatura_cargo_id", DROP COLUMN "jefatura_ve";
-- DROP INDEX "core"."personas_tenant_id_id_key"; DROP INDEX "core"."cargos_tenant_id_id_key";
