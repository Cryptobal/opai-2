-- CAR-201, P1 de Asistencia (ADR-048, ADR-078): `core.turnos_esperados`, el turno esperado por persona
-- y día, materializado en el núcleo desde la Pauta o desde la jornada pactada. Migración ADITIVA: solo
-- crea una tabla nueva. Lleva RLS `tenant_isolation` (ENABLE + FORCE) para opai_app, el trigger
-- `mismo_tenant` (persona, instalación y puesto de la misma empresa) y un índice único parcial: una
-- persona no tiene dos turnos vigentes que arranquen en el mismo instante.

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "core"."turnos_esperados" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "persona_id" UUID NOT NULL,
    "fecha" DATE NOT NULL,
    "inicio" TIMESTAMPTZ(6) NOT NULL,
    "fin" TIMESTAMPTZ(6) NOT NULL,
    "instalacion_id" UUID NOT NULL,
    "puesto_id" UUID,
    "origen" TEXT NOT NULL,
    "referencia" TEXT,
    "colacion_min" INTEGER NOT NULL DEFAULT 0,
    "feriado" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "vigente" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "turnos_esperados_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "turnos_esperados_origen_chk" CHECK ("origen" IN ('pauta', 'jornada_pactada', 'manual')),
    CONSTRAINT "turnos_esperados_intervalo_chk" CHECK ("fin" > "inicio"),
    CONSTRAINT "turnos_esperados_colacion_chk" CHECK ("colacion_min" >= 0 AND "colacion_min" <= 240),
    CONSTRAINT "turnos_esperados_version_chk" CHECK ("version" >= 1)
);

CREATE INDEX "turnos_esperados_persona_fecha_idx" ON "core"."turnos_esperados"("tenant_id", "persona_id", "fecha");
CREATE INDEX "turnos_esperados_instalacion_fecha_idx" ON "core"."turnos_esperados"("tenant_id", "instalacion_id", "fecha");
CREATE INDEX "turnos_esperados_puesto_fecha_idx" ON "core"."turnos_esperados"("tenant_id", "puesto_id", "fecha");
CREATE UNIQUE INDEX "turnos_esperados_vigente_unico" ON "core"."turnos_esperados"("tenant_id", "persona_id", "inicio") WHERE "vigente";

ALTER TABLE "core"."turnos_esperados" ADD CONSTRAINT "turnos_esperados_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

GRANT SELECT, INSERT, UPDATE, DELETE ON "core"."turnos_esperados" TO opai_app;

ALTER TABLE "core"."turnos_esperados" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."turnos_esperados" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."turnos_esperados" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."turnos_esperados"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'persona_id', 'core.personas', 'instalacion_id', 'core.instalaciones', 'puesto_id', 'core.puestos');

COMMIT;

-- Reversión: migración aditiva; si hace falta deshacerla antes de usarla:
-- DROP TABLE "core"."turnos_esperados"; (borra su política, índices y trigger). Con turnos ya
-- guardados no hace falta restaurar: se regeneran desde la Pauta con `core.turnos_esperados.regenerar`.
