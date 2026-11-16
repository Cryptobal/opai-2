-- CAR-96 (Brief 12, Turnos extra, PR 1) · Registro y aprobación de turnos extra. Decisión de Carlos del 14-nov-2026
-- (CAR-458, opción A): se construye el registro y la aprobación, sin mover plata ni informar a Nómina; el pago por
-- lote (CAR-101) sigue esperando la revisión legal y contable escrita (adenda de ADR-083).
--   · pauta.turnos_extra: un turno extra por reemplazo o refuerzo (excepción activa), con tipo de trabajador, monto
--     sugerido, monto final (editable solo por quien aprueba, con motivo) y estado.
--   · pauta.montos_turno_extra: monto fijo por instalación y excepción por puesto (A6).
-- Tablas con tenant_id: RLS + FORCE + política tenant_isolation. Aditiva, sin datos.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "pauta"."turnos_extra" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "excepcion_id" UUID NOT NULL,
    "instalacion_id" UUID NOT NULL,
    "puesto_id" UUID NOT NULL,
    "persona_id" UUID NOT NULL,
    "fecha" DATE NOT NULL,
    "tipo_trabajador" TEXT NOT NULL,
    "monto_sugerido_clp" INTEGER NOT NULL,
    "monto_clp" INTEGER NOT NULL,
    "monto_motivo" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'por_aprobar',
    "registrado_por" UUID NOT NULL,
    "resuelto_por" UUID,
    "resuelto_en" TIMESTAMPTZ(6),
    "motivo_resolucion" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "turnos_extra_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "turnos_extra_tipo_check" CHECK ("tipo_trabajador" IN ('propio', 'externo')),
    CONSTRAINT "turnos_extra_estado_check" CHECK ("estado" IN ('por_aprobar', 'aprobado', 'rechazado')),
    CONSTRAINT "turnos_extra_montos_check" CHECK ("monto_sugerido_clp" >= 0 AND "monto_clp" >= 0),
    CONSTRAINT "turnos_extra_motivo_monto_check" CHECK ("monto_clp" = "monto_sugerido_clp" OR "monto_motivo" IS NOT NULL),
    CONSTRAINT "turnos_extra_resolucion_check" CHECK (("estado" = 'por_aprobar') = ("resuelto_en" IS NULL)),
    CONSTRAINT "turnos_extra_rechazo_check" CHECK ("estado" <> 'rechazado' OR "motivo_resolucion" IS NOT NULL)
);
CREATE UNIQUE INDEX "turnos_extra_excepcion_id_key" ON "pauta"."turnos_extra"("excepcion_id");
CREATE INDEX "turnos_extra_tenant_id_estado_fecha_idx" ON "pauta"."turnos_extra"("tenant_id", "estado", "fecha");
CREATE INDEX "turnos_extra_tenant_id_instalacion_id_fecha_idx" ON "pauta"."turnos_extra"("tenant_id", "instalacion_id", "fecha");

ALTER TABLE "pauta"."turnos_extra" ADD CONSTRAINT "turnos_extra_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pauta"."turnos_extra" ADD CONSTRAINT "turnos_extra_excepcion_id_fkey"
    FOREIGN KEY ("excepcion_id") REFERENCES "pauta"."excepciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pauta"."turnos_extra" ADD CONSTRAINT "turnos_extra_instalacion_id_fkey"
    FOREIGN KEY ("instalacion_id") REFERENCES "core"."instalaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pauta"."turnos_extra" ADD CONSTRAINT "turnos_extra_puesto_id_fkey"
    FOREIGN KEY ("puesto_id") REFERENCES "core"."puestos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pauta"."turnos_extra" ADD CONSTRAINT "turnos_extra_persona_id_fkey"
    FOREIGN KEY ("persona_id") REFERENCES "core"."personas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pauta"."turnos_extra" ADD CONSTRAINT "turnos_extra_registrado_por_fkey"
    FOREIGN KEY ("registrado_por") REFERENCES "core"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pauta"."turnos_extra" ADD CONSTRAINT "turnos_extra_resuelto_por_fkey"
    FOREIGN KEY ("resuelto_por") REFERENCES "core"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "pauta"."turnos_extra"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'excepcion_id', 'pauta.excepciones', 'instalacion_id', 'core.instalaciones',
    'puesto_id', 'core.puestos', 'persona_id', 'core.personas');

ALTER TABLE "pauta"."turnos_extra" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pauta"."turnos_extra" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "pauta"."turnos_extra" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE ON "pauta"."turnos_extra" TO opai_app;

CREATE TABLE "pauta"."montos_turno_extra" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "instalacion_id" UUID NOT NULL,
    "puesto_id" UUID,
    "monto_clp" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "montos_turno_extra_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "montos_turno_extra_monto_check" CHECK ("monto_clp" >= 0)
);
-- Uno por instalación y uno por puesto (dos índices parciales: el puesto nulo es el monto de la instalación).
CREATE UNIQUE INDEX "montos_turno_extra_instalacion_key"
    ON "pauta"."montos_turno_extra"("tenant_id", "instalacion_id") WHERE "puesto_id" IS NULL;
CREATE UNIQUE INDEX "montos_turno_extra_puesto_key"
    ON "pauta"."montos_turno_extra"("tenant_id", "puesto_id") WHERE "puesto_id" IS NOT NULL;

ALTER TABLE "pauta"."montos_turno_extra" ADD CONSTRAINT "montos_turno_extra_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pauta"."montos_turno_extra" ADD CONSTRAINT "montos_turno_extra_instalacion_id_fkey"
    FOREIGN KEY ("instalacion_id") REFERENCES "core"."instalaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pauta"."montos_turno_extra" ADD CONSTRAINT "montos_turno_extra_puesto_id_fkey"
    FOREIGN KEY ("puesto_id") REFERENCES "core"."puestos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "pauta"."montos_turno_extra"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'instalacion_id', 'core.instalaciones', 'puesto_id', 'core.puestos');

ALTER TABLE "pauta"."montos_turno_extra" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pauta"."montos_turno_extra" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "pauta"."montos_turno_extra" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "pauta"."montos_turno_extra" TO opai_app;

COMMIT;

-- Reversión: DROP TABLE "pauta"."turnos_extra"; DROP TABLE "pauta"."montos_turno_extra"; (tablas nuevas sin otras
-- dependencias; se puede restaurar desde el snapshot previo de Neon).
