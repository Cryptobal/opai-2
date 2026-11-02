-- Operaciones · Pauta PR 2 (Brief 11b, CAR-86): tipos de excepción reemplazo/refuerzo, registros
-- operativos (cobertura confirmada y marca manual) para la Diaria. Migración ADITIVA salvo ampliar CHECKs.

BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "pauta"."excepciones" DROP CONSTRAINT "excepciones_tipo_chk";
ALTER TABLE "pauta"."excepciones" ADD CONSTRAINT "excepciones_tipo_chk" CHECK (
  "tipo" IN ('ausencia', 'licencia', 'vacaciones', 'permiso', 'reemplazo', 'refuerzo')
);

ALTER TABLE "pauta"."historial" DROP CONSTRAINT "historial_accion_chk";
ALTER TABLE "pauta"."historial" ADD CONSTRAINT "historial_accion_chk" CHECK (
  "accion" IN (
    'serie_fijada',
    'excepcion_creada',
    'excepcion_anulada',
    'cobertura_confirmada',
    'cobertura_deshacer',
    'marca_registrada',
    'reemplazo_asignado',
    'refuerzo_agregado'
  )
);

CREATE TABLE "pauta"."registros_operativos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "puesto_id" UUID NOT NULL,
    "fecha" DATE NOT NULL,
    "tipo" TEXT NOT NULL,
    "motivo" TEXT NOT NULL DEFAULT '',
    "persona_id" UUID,
    "estado" TEXT NOT NULL DEFAULT 'activa',
    "creada_por" UUID,
    "anulada_por" UUID,
    "anulada_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "registros_operativos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "registros_operativos_tipo_chk" CHECK ("tipo" IN ('cobertura_confirmada', 'marca_presencia')),
    CONSTRAINT "registros_operativos_estado_chk" CHECK ("estado" IN ('activa', 'anulada'))
);

CREATE INDEX "registros_operativos_tenant_id_puesto_id_fecha_idx"
  ON "pauta"."registros_operativos"("tenant_id", "puesto_id", "fecha");

CREATE UNIQUE INDEX "registros_cobertura_confirmada_activa_key"
  ON "pauta"."registros_operativos"("tenant_id", "puesto_id", "fecha")
  WHERE "estado" = 'activa' AND "tipo" = 'cobertura_confirmada';

ALTER TABLE "pauta"."registros_operativos" ADD CONSTRAINT "registros_operativos_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pauta"."registros_operativos" ADD CONSTRAINT "registros_operativos_puesto_id_fkey"
  FOREIGN KEY ("puesto_id") REFERENCES "core"."puestos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

GRANT SELECT, INSERT, UPDATE, DELETE ON "pauta"."registros_operativos" TO opai_app;

ALTER TABLE "pauta"."registros_operativos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pauta"."registros_operativos" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "pauta"."registros_operativos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "pauta"."registros_operativos"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('puesto_id', 'core.puestos', 'persona_id', 'core.personas');

COMMIT;

-- Reversión (manual, rol propietario, en transacción):
--   DROP TABLE "pauta"."registros_operativos";
--   ALTER TABLE "pauta"."excepciones" DROP CONSTRAINT "excepciones_tipo_chk";
--   ALTER TABLE "pauta"."excepciones" ADD CONSTRAINT "excepciones_tipo_chk" CHECK (
--     "tipo" IN ('ausencia', 'licencia', 'vacaciones', 'permiso')
--   );
--   ALTER TABLE "pauta"."historial" DROP CONSTRAINT "historial_accion_chk";
--   ALTER TABLE "pauta"."historial" ADD CONSTRAINT "historial_accion_chk" CHECK (
--     "accion" IN ('serie_fijada', 'excepcion_creada', 'excepcion_anulada')
--   );
-- Antes de revertir el CHECK de excepciones, anular o borrar filas con tipo reemplazo/refuerzo.
