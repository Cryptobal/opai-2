-- CAR-96 · Turnos extra: registro y aprobación (sin pago ni nómina; CAR-101 queda fuera).
-- Tablas nuevas aditivas con RLS + FORCE + tenant_isolation.
-- Timestamp 20270108100000: después de pauta_visitas (#816, 20270107100000) y tickets_instalacion (#821).
BEGIN;
SET LOCAL lock_timeout = '5s';

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
    'refuerzo_agregado',
    'turno_extra_registrado',
    'turno_extra_aprobado',
    'turno_extra_rechazado'
  )
);

CREATE TABLE "pauta"."turnos_extra" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "puesto_id" UUID NOT NULL,
    "fecha" DATE NOT NULL,
    "persona_id" UUID NOT NULL,
    "excepcion_id" UUID NOT NULL,
    "tipo_trabajador" TEXT NOT NULL,
    "monto_clp" INTEGER NOT NULL,
    "monto_motivo" TEXT,
    "monto_origen" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'por_aprobar',
    "registrado_por" UUID,
    "resuelto_por" UUID,
    "resuelto_en" TIMESTAMPTZ(6),
    "motivo_resolucion" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "turnos_extra_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "turnos_extra_tipo_check" CHECK ("tipo_trabajador" IN ('propio', 'externo')),
    CONSTRAINT "turnos_extra_monto_check" CHECK ("monto_clp" >= 0),
    CONSTRAINT "turnos_extra_origen_check" CHECK ("monto_origen" IN ('puesto', 'instalacion', 'manual', 'sin_tarifa')),
    CONSTRAINT "turnos_extra_estado_check" CHECK ("estado" IN ('por_aprobar', 'aprobado', 'rechazado'))
);
CREATE UNIQUE INDEX "turnos_extra_excepcion_id_key" ON "pauta"."turnos_extra"("excepcion_id");
CREATE INDEX "turnos_extra_tenant_id_estado_fecha_idx" ON "pauta"."turnos_extra"("tenant_id", "estado", "fecha");
CREATE INDEX "turnos_extra_tenant_id_puesto_id_fecha_idx" ON "pauta"."turnos_extra"("tenant_id", "puesto_id", "fecha");

ALTER TABLE "pauta"."turnos_extra" ADD CONSTRAINT "turnos_extra_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pauta"."turnos_extra" ADD CONSTRAINT "turnos_extra_puesto_id_fkey"
    FOREIGN KEY ("puesto_id") REFERENCES "core"."puestos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pauta"."turnos_extra" ADD CONSTRAINT "turnos_extra_persona_id_fkey"
    FOREIGN KEY ("persona_id") REFERENCES "core"."personas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pauta"."turnos_extra" ADD CONSTRAINT "turnos_extra_excepcion_id_fkey"
    FOREIGN KEY ("excepcion_id") REFERENCES "pauta"."excepciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "pauta"."turnos_extra" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pauta"."turnos_extra" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "pauta"."turnos_extra" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE ON "pauta"."turnos_extra" TO opai_app;

CREATE TABLE "pauta"."tarifas_turno_extra" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "sujeto_tipo" TEXT NOT NULL,
    "sujeto_id" UUID NOT NULL,
    "monto_clp" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tarifas_turno_extra_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tarifas_turno_extra_sujeto_check" CHECK ("sujeto_tipo" IN ('instalacion', 'puesto')),
    CONSTRAINT "tarifas_turno_extra_monto_check" CHECK ("monto_clp" >= 0)
);
CREATE UNIQUE INDEX "tarifas_turno_extra_tenant_sujeto_key"
    ON "pauta"."tarifas_turno_extra"("tenant_id", "sujeto_tipo", "sujeto_id");

ALTER TABLE "pauta"."tarifas_turno_extra" ADD CONSTRAINT "tarifas_turno_extra_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "pauta"."tarifas_turno_extra" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pauta"."tarifas_turno_extra" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "pauta"."tarifas_turno_extra" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "pauta"."tarifas_turno_extra" TO opai_app;

COMMIT;

-- Reversión: DROP TABLE "pauta"."tarifas_turno_extra"; DROP TABLE "pauta"."turnos_extra";
