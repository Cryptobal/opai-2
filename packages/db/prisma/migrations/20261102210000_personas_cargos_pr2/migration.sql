-- Personas y Cargos PR 2: previsión, pago bancario (aprobación RRHH), uniforme, jornada DT, OS-10 y
-- contacto laboral. Migración aditiva; ENABLE + FORCE RLS y trigger mismo_tenant sobre persona_id.

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "core"."personas_prevision" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "persona_id" UUID NOT NULL,
    "afp" TEXT,
    "regimen" TEXT,
    "sistema_salud" TEXT,
    "isapre_nombre" TEXT,
    "plan_isapre" TEXT,
    "plan_uf" DECIMAL(10,4),
    "cotizacion_uf_pct" DECIMAL(10,4),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "personas_prevision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "core"."personas_pago" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "persona_id" UUID NOT NULL,
    "banco_codigo" TEXT,
    "tipo_cuenta" TEXT,
    "numero_cuenta" TEXT,
    "rut_titular" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "personas_pago_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "core"."personas_pago_solicitudes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "persona_id" UUID NOT NULL,
    "banco_codigo" TEXT,
    "tipo_cuenta" TEXT,
    "numero_cuenta" TEXT,
    "rut_titular" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "solicitado_por_id" UUID NOT NULL,
    "resuelto_por_id" UUID,
    "motivo_rechazo" TEXT,
    "resuelta_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "personas_pago_solicitudes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "personas_pago_solicitudes_estado_check" CHECK ("estado" IN ('pendiente', 'aprobada', 'rechazada'))
);

CREATE TABLE "core"."personas_uniforme" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "persona_id" UUID NOT NULL,
    "talla_camisa" TEXT,
    "talla_pantalon" TEXT,
    "talla_chaqueta" TEXT,
    "talla_zapato" TEXT,
    "notas" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "personas_uniforme_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "core"."personas_uniforme_entregas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "uniforme_id" UUID NOT NULL,
    "persona_id" UUID NOT NULL,
    "entregada_en" DATE NOT NULL,
    "articulo" TEXT NOT NULL,
    "talla" TEXT,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "notas" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personas_uniforme_entregas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "core"."personas_jornada_dt" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "persona_id" UUID NOT NULL,
    "resolucion" TEXT,
    "resolucion_vigente_desde" DATE,
    "horas_semanales" DECIMAL(5,2),
    "distribucion" TEXT,
    "articulo_22" BOOLEAN NOT NULL DEFAULT false,
    "plazo_fijo_periodo" INTEGER,
    "termino_plazo_fijo" DATE,
    "aviso_termino_dias" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "personas_jornada_dt_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "personas_jornada_dt_plazo_check" CHECK (
      "plazo_fijo_periodo" IS NULL OR "plazo_fijo_periodo" BETWEEN 1 AND 3
    )
);

CREATE TABLE "core"."personas_os10" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "persona_id" UUID NOT NULL,
    "credencial" TEXT,
    "vence_en" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "personas_os10_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "core"."personas_contacto_laboral" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "persona_id" UUID NOT NULL,
    "estado_civil" TEXT,
    "telefono_secundario" TEXT,
    "emergencia_nombre" TEXT,
    "emergencia_relacion" TEXT,
    "emergencia_telefono" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "personas_contacto_laboral_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "personas_prevision_persona_id_key" ON "core"."personas_prevision"("persona_id");
CREATE UNIQUE INDEX "personas_pago_persona_id_key" ON "core"."personas_pago"("persona_id");
CREATE UNIQUE INDEX "personas_uniforme_persona_id_key" ON "core"."personas_uniforme"("persona_id");
CREATE UNIQUE INDEX "personas_jornada_dt_persona_id_key" ON "core"."personas_jornada_dt"("persona_id");
CREATE UNIQUE INDEX "personas_os10_persona_id_key" ON "core"."personas_os10"("persona_id");
CREATE UNIQUE INDEX "personas_contacto_laboral_persona_id_key" ON "core"."personas_contacto_laboral"("persona_id");

CREATE INDEX "personas_prevision_tenant_id_persona_id_idx" ON "core"."personas_prevision"("tenant_id", "persona_id");
CREATE INDEX "personas_pago_tenant_id_persona_id_idx" ON "core"."personas_pago"("tenant_id", "persona_id");
CREATE INDEX "personas_pago_solicitudes_tenant_id_persona_id_estado_idx" ON "core"."personas_pago_solicitudes"("tenant_id", "persona_id", "estado");
CREATE UNIQUE INDEX "personas_pago_solicitudes_pendiente_key" ON "core"."personas_pago_solicitudes"("tenant_id", "persona_id") WHERE "estado" = 'pendiente';

ALTER TABLE "core"."personas_prevision" ADD CONSTRAINT "personas_prevision_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core"."personas_prevision" ADD CONSTRAINT "personas_prevision_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "core"."personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "core"."personas_pago" ADD CONSTRAINT "personas_pago_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core"."personas_pago" ADD CONSTRAINT "personas_pago_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "core"."personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "core"."personas_pago_solicitudes" ADD CONSTRAINT "personas_pago_solicitudes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core"."personas_pago_solicitudes" ADD CONSTRAINT "personas_pago_solicitudes_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "core"."personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "core"."personas_pago_solicitudes" ADD CONSTRAINT "personas_pago_solicitudes_solicitado_por_id_fkey" FOREIGN KEY ("solicitado_por_id") REFERENCES "core"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core"."personas_pago_solicitudes" ADD CONSTRAINT "personas_pago_solicitudes_resuelto_por_id_fkey" FOREIGN KEY ("resuelto_por_id") REFERENCES "core"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "core"."personas_uniforme" ADD CONSTRAINT "personas_uniforme_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core"."personas_uniforme" ADD CONSTRAINT "personas_uniforme_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "core"."personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "core"."personas_uniforme_entregas" ADD CONSTRAINT "personas_uniforme_entregas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core"."personas_uniforme_entregas" ADD CONSTRAINT "personas_uniforme_entregas_uniforme_id_fkey" FOREIGN KEY ("uniforme_id") REFERENCES "core"."personas_uniforme"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "core"."personas_uniforme_entregas" ADD CONSTRAINT "personas_uniforme_entregas_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "core"."personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "core"."personas_jornada_dt" ADD CONSTRAINT "personas_jornada_dt_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core"."personas_jornada_dt" ADD CONSTRAINT "personas_jornada_dt_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "core"."personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "core"."personas_os10" ADD CONSTRAINT "personas_os10_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core"."personas_os10" ADD CONSTRAINT "personas_os10_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "core"."personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "core"."personas_contacto_laboral" ADD CONSTRAINT "personas_contacto_laboral_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core"."personas_contacto_laboral" ADD CONSTRAINT "personas_contacto_laboral_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "core"."personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS + FORCE (REGLAS-codigo.md)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'personas_prevision', 'personas_pago', 'personas_pago_solicitudes', 'personas_uniforme',
    'personas_uniforme_entregas', 'personas_jornada_dt', 'personas_os10', 'personas_contacto_laboral'
  ] LOOP
    EXECUTE format('ALTER TABLE core.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE core.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON core.%I AS PERMISSIVE FOR ALL TO opai_app USING (tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid)',
      t
    );
  END LOOP;
END $$;

CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."personas_prevision"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('persona_id', 'core.personas');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."personas_pago"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('persona_id', 'core.personas');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."personas_pago_solicitudes"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('persona_id', 'core.personas');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."personas_uniforme"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('persona_id', 'core.personas');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."personas_uniforme_entregas"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('persona_id', 'core.personas');
CREATE TRIGGER mismo_tenant_uniforme BEFORE INSERT OR UPDATE ON "core"."personas_uniforme_entregas"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('uniforme_id', 'core.personas_uniforme');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."personas_jornada_dt"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('persona_id', 'core.personas');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."personas_os10"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('persona_id', 'core.personas');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."personas_contacto_laboral"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('persona_id', 'core.personas');

CREATE TRIGGER usuario_miembro BEFORE INSERT OR UPDATE ON "core"."personas_pago_solicitudes"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_usuario_miembro"('solicitado_por_id');
CREATE TRIGGER usuario_miembro_resuelto BEFORE INSERT OR UPDATE ON "core"."personas_pago_solicitudes"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_usuario_miembro"('resuelto_por_id');

COMMIT;

-- Reversión (manual): BEGIN; SET LOCAL lock_timeout = '5s';
-- DROP TABLE IF EXISTS core.personas_contacto_laboral, core.personas_os10, core.personas_jornada_dt,
--   core.personas_uniforme_entregas, core.personas_uniforme, core.personas_pago_solicitudes,
--   core.personas_pago, core.personas_prevision CASCADE;
-- COMMIT;
