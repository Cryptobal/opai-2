-- Plantilla de migración de OPAI 2.0 (CAR-47). Reglas en docs/2.0/migraciones.md.
--
-- Qué hace y por qué: CAR-409 (Estándares H-3b). Los períodos del contrato (plazo fijo y el paso a indefinido)
-- pasan a ser una historia del vínculo: un registro por período, con inicio, término, quién lo registró y cuándo.
-- El período vigente y los avisos se calculan desde aquí. Un período no se borra: si se registró mal se anula
-- (queda con quién y por qué) y se registra de nuevo.
-- Aditiva: crea `core.contrato_periodos`. No migra datos: al 14-nov-2026 no hay filas con plazo fijo en
-- `core.personas_jornada_dt` (dev ni main). Las columnas antiguas (`plazo_fijo_periodo`, `termino_plazo_fijo`,
-- `terminos_plazo_fijo`) dejan de usarse en este PR y se retiran en uno posterior, ya desplegado este.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "core"."contrato_periodos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "persona_id" UUID NOT NULL,
    "vinculo_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "inicio" DATE NOT NULL,
    "termino" DATE,
    "registrado_por" UUID,
    "anulado_en" TIMESTAMPTZ(6),
    "anulado_por" UUID,
    "motivo_anulacion" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "contrato_periodos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "contrato_periodos_tipo_check" CHECK ("tipo" IN ('plazo_fijo', 'indefinido')),
    -- El plazo fijo tiene término posterior o igual al inicio; el indefinido no tiene término.
    CONSTRAINT "contrato_periodos_termino_check" CHECK (
      ("tipo" = 'plazo_fijo' AND "termino" IS NOT NULL AND "termino" >= "inicio")
      OR ("tipo" = 'indefinido' AND "termino" IS NULL)
    ),
    -- Una anulación lleva fecha y motivo juntos.
    CONSTRAINT "contrato_periodos_anulacion_check" CHECK (
      ("anulado_en" IS NULL AND "motivo_anulacion" IS NULL)
      OR ("anulado_en" IS NOT NULL AND char_length("motivo_anulacion") BETWEEN 3 AND 300)
    )
);
CREATE INDEX "contrato_periodos_tenant_id_vinculo_id_inicio_idx"
    ON "core"."contrato_periodos"("tenant_id", "vinculo_id", "inicio");
CREATE INDEX "contrato_periodos_tenant_id_persona_id_idx"
    ON "core"."contrato_periodos"("tenant_id", "persona_id");
-- Dos períodos válidos del mismo vínculo no empiezan el mismo día (carrera entre dos registros).
CREATE UNIQUE INDEX "contrato_periodos_vinculo_inicio_vigente"
    ON "core"."contrato_periodos"("vinculo_id", "inicio") WHERE "anulado_en" IS NULL;

ALTER TABLE "core"."contrato_periodos" ADD CONSTRAINT "contrato_periodos_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core"."contrato_periodos" ADD CONSTRAINT "contrato_periodos_persona_id_fkey"
    FOREIGN KEY ("persona_id") REFERENCES "core"."personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "core"."contrato_periodos" ADD CONSTRAINT "contrato_periodos_vinculo_id_fkey"
    FOREIGN KEY ("vinculo_id") REFERENCES "core"."vinculos_laborales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

GRANT SELECT, INSERT, UPDATE ON "core"."contrato_periodos" TO opai_app;
-- Los privilegios por defecto del schema dan DELETE: se quita, un período no se borra (se anula).
REVOKE DELETE ON "core"."contrato_periodos" FROM opai_app;
ALTER TABLE "core"."contrato_periodos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."contrato_periodos" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."contrato_periodos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- Referencias dentro del mismo tenant (las FK de Postgres no pasan por RLS).
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."contrato_periodos"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'persona_id', 'core.personas', 'vinculo_id', 'core.vinculos_laborales');

COMMIT;

-- Reversión: tabla nueva sin dependientes. DROP TABLE "core"."contrato_periodos"; (borra la historia registrada;
-- si hubo datos que conservar, restaurar desde el respaldo previo de Neon).
