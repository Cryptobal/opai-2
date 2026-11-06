-- CAR-89, A3 de Asistencia: día consolidado (recalculable) y tipo de jornada del vínculo laboral, y la evidencia
-- de las correcciones. Migración ADITIVA: una tabla nueva (RLS `tenant_isolation`, ENABLE + FORCE), una columna
-- con defecto en `core.vinculos_laborales` y una columna nula en `asistencia.correcciones`. No toca filas existentes.
--
-- Reversión (antes de que alguien use las columnas):
--   DROP TABLE "asistencia"."dias";
--   ALTER TABLE "core"."vinculos_laborales" DROP COLUMN "tipo_jornada";
--   ALTER TABLE "asistencia"."correcciones" DROP COLUMN "evidencia_documento_id";

BEGIN;
SET LOCAL lock_timeout = '5s';

-- Evidencia (documento del núcleo) de la corrección manual: obligatoria para quien propone (lo exige la capacidad).
ALTER TABLE "asistencia"."correcciones" ADD COLUMN "evidencia_documento_id" UUID;

-- Tipo de jornada del vínculo: ordinaria, excepcional (D.E.J.), parcial o teletrabajo. Define los descansos.
ALTER TABLE "core"."vinculos_laborales"
  ADD COLUMN "tipo_jornada" TEXT NOT NULL DEFAULT 'ordinaria';
ALTER TABLE "core"."vinculos_laborales"
  ADD CONSTRAINT "vinculos_laborales_tipo_jornada_chk"
  CHECK ("tipo_jornada" IN ('ordinaria', 'excepcional', 'parcial', 'teletrabajo'));

CREATE TABLE "asistencia"."dias" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "persona_id" UUID NOT NULL,
    "fecha" DATE NOT NULL,
    "turno_esperado_id" UUID,
    "instalacion_id" UUID,
    "tipo_jornada" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "sigla" TEXT,
    "minutos_trabajados" INTEGER NOT NULL DEFAULT 0,
    "segundos_atraso" INTEGER NOT NULL DEFAULT 0,
    "segundos_extra" INTEGER NOT NULL DEFAULT 0,
    "segundos_salida_anticipada" INTEGER NOT NULL DEFAULT 0,
    "descanso_insuficiente" BOOLEAN NOT NULL DEFAULT false,
    "correccion_pendiente" BOOLEAN NOT NULL DEFAULT false,
    "entrada" TIMESTAMPTZ(6),
    "salida" TIMESTAMPTZ(6),
    "calculado_en" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "dias_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "dias_estado_chk" CHECK ("estado" IN ('presente', 'sin_marca', 'ausente', 'sin_turno', 'incompleto')),
    CONSTRAINT "dias_tipo_jornada_chk" CHECK ("tipo_jornada" IN ('ordinaria', 'excepcional', 'parcial', 'teletrabajo')),
    CONSTRAINT "dias_valores_chk" CHECK ("minutos_trabajados" >= 0 AND "segundos_atraso" >= 0 AND "segundos_extra" >= 0 AND "segundos_salida_anticipada" >= 0)
);
CREATE UNIQUE INDEX "dias_tenant_id_persona_id_fecha_key" ON "asistencia"."dias"("tenant_id", "persona_id", "fecha");
CREATE INDEX "dias_tenant_id_fecha_idx" ON "asistencia"."dias"("tenant_id", "fecha");
CREATE INDEX "dias_tenant_id_instalacion_id_fecha_idx" ON "asistencia"."dias"("tenant_id", "instalacion_id", "fecha");

ALTER TABLE "asistencia"."dias" ADD CONSTRAINT "dias_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
GRANT SELECT, INSERT, UPDATE, DELETE ON "asistencia"."dias" TO opai_app;
ALTER TABLE "asistencia"."dias" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "asistencia"."dias" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "asistencia"."dias" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "asistencia"."dias"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'persona_id', 'core.personas', 'instalacion_id', 'core.instalaciones', 'turno_esperado_id', 'core.turnos_esperados');

COMMIT;
