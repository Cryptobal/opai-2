-- Plantilla de migración de OPAI 2.0 (CAR-47). Reglas en docs/2.0/migraciones.md.
--
-- Qué hace y por qué: CAR-99 (Brief 27, Nómina II). Tabla nueva `nomina.liquidaciones`: una liquidación por
-- período y persona, con totales en pesos enteros, el detalle de líneas, la capa de sueldo y la huella del
-- juego de valores legales que rigieron (motor-sueldos.md R21). Aditiva: no toca datos existentes.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "nomina"."liquidaciones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "periodo_id" UUID NOT NULL,
    "persona_id" UUID NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'calculada',
    "dias_trabajados" INTEGER NOT NULL,
    "haberes" INTEGER NOT NULL,
    "imponible" INTEGER NOT NULL,
    "descuentos_legales" INTEGER NOT NULL,
    "otros_descuentos" INTEGER NOT NULL,
    "liquido" INTEGER NOT NULL,
    "costo_empresa" INTEGER NOT NULL,
    "detalle" JSONB NOT NULL,
    "advertencias" JSONB NOT NULL DEFAULT '[]',
    "capa_id" UUID NOT NULL,
    "juego_huella" TEXT NOT NULL,
    "calculada_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "liquidaciones_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "liquidaciones_estado_check" CHECK ("estado" IN ('calculada', 'revisada')),
    CONSTRAINT "liquidaciones_dias_check" CHECK ("dias_trabajados" BETWEEN 0 AND 30),
    CONSTRAINT "liquidaciones_montos_check" CHECK (
      "haberes" >= 0 AND "imponible" >= 0 AND "descuentos_legales" >= 0 AND "otros_descuentos" >= 0 AND "costo_empresa" >= 0
    )
);

CREATE UNIQUE INDEX "liquidaciones_tenant_id_periodo_id_persona_id_key"
  ON "nomina"."liquidaciones"("tenant_id", "periodo_id", "persona_id");
CREATE INDEX "liquidaciones_tenant_id_persona_id_idx" ON "nomina"."liquidaciones"("tenant_id", "persona_id");

ALTER TABLE "nomina"."liquidaciones" ADD CONSTRAINT "liquidaciones_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nomina"."liquidaciones" ADD CONSTRAINT "liquidaciones_periodo_id_fkey"
  FOREIGN KEY ("periodo_id") REFERENCES "nomina"."periodos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nomina"."liquidaciones" ADD CONSTRAINT "liquidaciones_persona_id_fkey"
  FOREIGN KEY ("persona_id") REFERENCES "core"."personas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

GRANT SELECT, INSERT, UPDATE, DELETE ON "nomina"."liquidaciones" TO opai_app;

ALTER TABLE "nomina"."liquidaciones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "nomina"."liquidaciones" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "nomina"."liquidaciones" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "nomina"."liquidaciones"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('periodo_id', 'nomina.periodos', 'persona_id', 'core.personas', 'capa_id', 'core.estructuras_sueldo');

COMMIT;

-- Reversión (la tabla es nueva; borra las liquidaciones calculadas):
-- DROP TABLE "nomina"."liquidaciones";
