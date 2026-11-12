-- Desempeño · CAR-306 (ADR-094): scorecard por cargo. Migración aditiva, sin datos: schema nuevo
-- `desempeno` con dos tablas (versiones del scorecard y sus indicadores).
-- Qué hace y por qué: cada empresa elige, por cargo, qué indicadores del catálogo usa, con qué meta y
-- qué peso. Cada cambio es una versión que rige desde un mes; los meses ya medidos no cambian.
-- Tablas con tenant_id: RLS + FORCE + política tenant_isolation (docs/2.0/REGLAS-codigo.md).
-- FK compuesta por tenant hacia core.cargos (índice único (tenant_id, id) creado en
-- 20261125100000_core_jefatura_cargo): un scorecard solo cuelga de un cargo de la MISMA empresa.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE SCHEMA IF NOT EXISTS "desempeno";

CREATE TABLE "desempeno"."scorecards" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "cargo_id" UUID NOT NULL,
    "vigente_desde" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "persona_ve_resultado" BOOLEAN NOT NULL DEFAULT true,
    "persona_ve_ranking" BOOLEAN NOT NULL DEFAULT false,
    "publicado_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "scorecards_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "scorecards_estado_check" CHECK ("estado" IN ('borrador', 'publicado')),
    CONSTRAINT "scorecards_vigente_desde_check" CHECK ("vigente_desde" ~ '^\d{4}-(0[1-9]|1[0-2])$')
);

CREATE TABLE "desempeno"."scorecard_indicadores" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "scorecard_id" UUID NOT NULL,
    "indicador" TEXT NOT NULL,
    "meta" DECIMAL(18,4) NOT NULL,
    "peso" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "scorecard_indicadores_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "scorecard_indicadores_meta_check" CHECK ("meta" > 0),
    CONSTRAINT "scorecard_indicadores_peso_check" CHECK ("peso" BETWEEN 1 AND 100)
);

CREATE UNIQUE INDEX "scorecards_tenant_id_cargo_id_vigente_desde_key"
  ON "desempeno"."scorecards"("tenant_id", "cargo_id", "vigente_desde");
CREATE UNIQUE INDEX "scorecards_tenant_id_id_key" ON "desempeno"."scorecards"("tenant_id", "id");
CREATE UNIQUE INDEX "scorecard_indicadores_scorecard_id_indicador_key"
  ON "desempeno"."scorecard_indicadores"("scorecard_id", "indicador");
CREATE INDEX "scorecard_indicadores_tenant_id_scorecard_id_idx"
  ON "desempeno"."scorecard_indicadores"("tenant_id", "scorecard_id");

ALTER TABLE "desempeno"."scorecards" ADD CONSTRAINT "scorecards_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "desempeno"."scorecards" ADD CONSTRAINT "scorecards_tenant_id_cargo_id_fkey"
  FOREIGN KEY ("tenant_id", "cargo_id") REFERENCES "core"."cargos"("tenant_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "desempeno"."scorecard_indicadores" ADD CONSTRAINT "scorecard_indicadores_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "desempeno"."scorecard_indicadores"
  ADD CONSTRAINT "scorecard_indicadores_tenant_id_scorecard_id_fkey"
  FOREIGN KEY ("tenant_id", "scorecard_id") REFERENCES "desempeno"."scorecards"("tenant_id", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "desempeno"."scorecards" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "desempeno"."scorecards" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "desempeno"."scorecards" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "desempeno"."scorecard_indicadores" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "desempeno"."scorecard_indicadores" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "desempeno"."scorecard_indicadores" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- Grants (GRANT USAGE + ALTER DEFAULT PRIVILEGES al crear un schema nuevo, ver REGLAS-codigo.md)
GRANT USAGE ON SCHEMA "desempeno" TO opai_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "desempeno" TO opai_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "desempeno" TO opai_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA "desempeno" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO opai_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA "desempeno" GRANT USAGE, SELECT ON SEQUENCES TO opai_app;

COMMIT;

-- Reversión: DROP TABLE IF EXISTS "desempeno"."scorecard_indicadores";
-- DROP TABLE IF EXISTS "desempeno"."scorecards"; DROP SCHEMA IF EXISTS "desempeno";
