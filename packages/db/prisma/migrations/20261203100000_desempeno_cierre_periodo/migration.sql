-- Desempeño · CAR-322 (ADR-094): cierre de período. Migración aditiva, sin datos: dos tablas nuevas
-- en el schema `desempeno` (creado en 20261126100000_desempeno_scorecards).
-- Qué hace y por qué: al cerrar un mes se guarda el resultado de cada persona (puntaje y detalle por
-- indicador) con el cargo, la jefatura y la versión del scorecard de ese mes. Un mes cerrado ya no se
-- recalcula aunque después cambien los hechos, el responsable de un negocio o el cargo de la persona.
-- Tablas con tenant_id: RLS + FORCE + política tenant_isolation (docs/2.0/REGLAS-codigo.md).
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "desempeno"."periodos_cerrados" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "periodo" TEXT NOT NULL,
    "origen" TEXT NOT NULL,
    "cerrado_por" UUID,
    "personas" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "periodos_cerrados_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "periodos_cerrados_periodo_check" CHECK ("periodo" ~ '^\d{4}-(0[1-9]|1[0-2])$'),
    CONSTRAINT "periodos_cerrados_origen_check" CHECK ("origen" IN ('manual', 'automatico')),
    CONSTRAINT "periodos_cerrados_personas_check" CHECK ("personas" >= 0)
);

CREATE TABLE "desempeno"."resultados_cerrados" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "periodo" TEXT NOT NULL,
    "persona_id" UUID NOT NULL,
    "cargo_id" UUID NOT NULL,
    "jefe_persona_id" UUID,
    "scorecard_id" UUID NOT NULL,
    "vigente_desde" TEXT NOT NULL,
    "puntaje" DECIMAL(7,2),
    "cobertura" DECIMAL(5,2) NOT NULL,
    "indicadores" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "resultados_cerrados_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "resultados_cerrados_puntaje_check" CHECK ("puntaje" IS NULL OR ("puntaje" >= 0 AND "puntaje" <= 120)),
    CONSTRAINT "resultados_cerrados_cobertura_check" CHECK ("cobertura" >= 0 AND "cobertura" <= 100)
);

CREATE UNIQUE INDEX "periodos_cerrados_tenant_id_periodo_key"
  ON "desempeno"."periodos_cerrados"("tenant_id", "periodo");
CREATE UNIQUE INDEX "resultados_cerrados_tenant_id_periodo_persona_id_key"
  ON "desempeno"."resultados_cerrados"("tenant_id", "periodo", "persona_id");
CREATE INDEX "resultados_cerrados_tenant_id_periodo_cargo_id_idx"
  ON "desempeno"."resultados_cerrados"("tenant_id", "periodo", "cargo_id");

ALTER TABLE "desempeno"."periodos_cerrados" ADD CONSTRAINT "periodos_cerrados_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "desempeno"."resultados_cerrados" ADD CONSTRAINT "resultados_cerrados_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "desempeno"."resultados_cerrados" ADD CONSTRAINT "resultados_cerrados_periodo_fkey"
  FOREIGN KEY ("tenant_id", "periodo") REFERENCES "desempeno"."periodos_cerrados"("tenant_id", "periodo")
  ON DELETE CASCADE ON UPDATE CASCADE;
-- Persona, cargo y versión del scorecard de la misma empresa (índices únicos (tenant_id, id) de
-- 20261125100000_core_jefatura_cargo y 20261126100000_desempeno_scorecards).
ALTER TABLE "desempeno"."resultados_cerrados" ADD CONSTRAINT "resultados_cerrados_persona_fkey"
  FOREIGN KEY ("tenant_id", "persona_id") REFERENCES "core"."personas"("tenant_id", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "desempeno"."resultados_cerrados" ADD CONSTRAINT "resultados_cerrados_cargo_fkey"
  FOREIGN KEY ("tenant_id", "cargo_id") REFERENCES "core"."cargos"("tenant_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "desempeno"."resultados_cerrados" ADD CONSTRAINT "resultados_cerrados_scorecard_fkey"
  FOREIGN KEY ("tenant_id", "scorecard_id") REFERENCES "desempeno"."scorecards"("tenant_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "desempeno"."periodos_cerrados" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "desempeno"."periodos_cerrados" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "desempeno"."periodos_cerrados" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "desempeno"."resultados_cerrados" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "desempeno"."resultados_cerrados" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "desempeno"."resultados_cerrados" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- Un mes cerrado no se cambia ni se reabre. Solo se borra el resultado de una persona al anonimizarla
-- (Ley 21.719, `core.cumplimiento`), por eso DELETE queda en resultados y no en períodos.
REVOKE UPDATE, DELETE ON "desempeno"."periodos_cerrados" FROM opai_app;
REVOKE UPDATE ON "desempeno"."resultados_cerrados" FROM opai_app;

COMMIT;

-- Reversión: DROP TABLE IF EXISTS "desempeno"."resultados_cerrados";
-- DROP TABLE IF EXISTS "desempeno"."periodos_cerrados";
