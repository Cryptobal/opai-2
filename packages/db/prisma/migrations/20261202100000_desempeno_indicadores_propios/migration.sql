-- Desempeño · CAR-313 (ADR-094 §8): indicadores propios de cada empresa. Migración aditiva, sin
-- datos: dos tablas nuevas en el schema `desempeno` (creado en 20261126100000_desempeno_scorecards).
-- Qué hace y por qué: la empresa arma indicadores sobre hechos que los módulos declaran; la
-- definición se guarda por versiones con mes de vigencia, para no alterar meses ya medidos.
-- Tablas con tenant_id: RLS + FORCE + política tenant_isolation (docs/2.0/REGLAS-codigo.md).
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "desempeno"."indicadores_propios" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "archivado_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "indicadores_propios_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "indicadores_propios_nombre_check" CHECK (length(btrim("nombre")) >= 3)
);

CREATE TABLE "desempeno"."indicador_propio_versiones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "indicador_id" UUID NOT NULL,
    "vigente_desde" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "definicion" JSONB NOT NULL,
    "unidad" TEXT NOT NULL,
    "sentido" TEXT NOT NULL,
    "meta_sugerida" DECIMAL(18,4) NOT NULL,
    "publicado_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "indicador_propio_versiones_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "indicador_propio_versiones_estado_check" CHECK ("estado" IN ('borrador', 'publicado')),
    CONSTRAINT "indicador_propio_versiones_sentido_check" CHECK ("sentido" IN ('mayor', 'menor')),
    CONSTRAINT "indicador_propio_versiones_meta_check" CHECK ("meta_sugerida" > 0),
    CONSTRAINT "indicador_propio_versiones_vigente_desde_check"
      CHECK ("vigente_desde" ~ '^\d{4}-(0[1-9]|1[0-2])$')
);

CREATE UNIQUE INDEX "indicadores_propios_tenant_id_id_key"
  ON "desempeno"."indicadores_propios"("tenant_id", "id");
-- Nombre único por empresa entre los vigentes (sin distinguir mayúsculas); archivar libera el nombre.
-- Índice parcial: no se expresa en el schema de Prisma.
CREATE UNIQUE INDEX "indicadores_propios_tenant_nombre_vigente_key"
  ON "desempeno"."indicadores_propios"("tenant_id", lower("nombre")) WHERE "archivado_en" IS NULL;
CREATE UNIQUE INDEX "indicador_propio_versiones_tenant_id_indicador_id_vigente_d_key"
  ON "desempeno"."indicador_propio_versiones"("tenant_id", "indicador_id", "vigente_desde");

ALTER TABLE "desempeno"."indicadores_propios" ADD CONSTRAINT "indicadores_propios_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "desempeno"."indicador_propio_versiones"
  ADD CONSTRAINT "indicador_propio_versiones_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "desempeno"."indicador_propio_versiones"
  ADD CONSTRAINT "indicador_propio_versiones_tenant_id_indicador_id_fkey"
  FOREIGN KEY ("tenant_id", "indicador_id") REFERENCES "desempeno"."indicadores_propios"("tenant_id", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "desempeno"."indicadores_propios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "desempeno"."indicadores_propios" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "desempeno"."indicadores_propios" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "desempeno"."indicador_propio_versiones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "desempeno"."indicador_propio_versiones" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "desempeno"."indicador_propio_versiones" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- Archivar, nunca borrar en duro: un scorecard publicado puede seguir apuntando al indicador.
REVOKE DELETE ON "desempeno"."indicadores_propios" FROM opai_app;

COMMIT;

-- Reversión: DROP TABLE IF EXISTS "desempeno"."indicador_propio_versiones";
-- DROP TABLE IF EXISTS "desempeno"."indicadores_propios";
