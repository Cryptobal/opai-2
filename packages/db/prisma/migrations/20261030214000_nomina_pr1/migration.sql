-- Brief 25 · Nómina PR 1: schema `nomina` con períodos de remuneraciones, novedades del período,
-- préstamos con plan de cuotas (B3), reglas de anticipo quincenal (B2), conceptos de haberes y
-- descuentos con código LRE «por verificar» y el calendario de obligaciones. Sin cálculo de
-- liquidaciones (el motor de sueldos aún no existe). Migración ADITIVA: solo crea objetos nuevos; no
-- toca tablas del núcleo ni de maestros. FK solo a core.tenants y core.personas; el respaldo en
-- core.documentos se valida con el trigger de mismo tenant (sin FK sobre el núcleo). Toda tabla con
-- tenant_id lleva RLS `tenant_isolation` (ENABLE + FORCE) para opai_app, que es NOBYPASSRLS.

BEGIN;
SET LOCAL lock_timeout = '5s';

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "nomina";

-- CreateTable
CREATE TABLE "nomina"."periodos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'abierto',
    "inicio" DATE NOT NULL,
    "fin" DATE NOT NULL,
    "cierre_previsto" DATE NOT NULL,
    "en_revision_en" TIMESTAMPTZ(6),
    "cerrado_en" TIMESTAMPTZ(6),
    "pagado_en" TIMESTAMPTZ(6),
    "cerrado_por" UUID,
    "motivo_reapertura" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "periodos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "periodos_mes_check" CHECK ("mes" BETWEEN 1 AND 12),
    CONSTRAINT "periodos_estado_check" CHECK ("estado" IN ('abierto', 'en_revision', 'cerrado', 'pagado'))
);

-- CreateTable
CREATE TABLE "nomina"."novedades" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "periodo_id" UUID NOT NULL,
    "persona_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "origen" TEXT NOT NULL DEFAULT 'manual',
    "estado" TEXT NOT NULL DEFAULT 'vigente',
    "fecha_desde" DATE NOT NULL,
    "fecha_hasta" DATE,
    "cantidad" DECIMAL(8,2),
    "monto_clp" INTEGER,
    "concepto_id" UUID,
    "prestamo_cuota_id" UUID,
    "documento_id" UUID,
    "nota" TEXT,
    "anulada_en" TIMESTAMPTZ(6),
    "motivo_anulacion" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "novedades_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "novedades_tipo_check" CHECK ("tipo" IN ('licencia', 'ausencia', 'horas_extra', 'anticipo', 'prestamo', 'descuento')),
    CONSTRAINT "novedades_origen_check" CHECK ("origen" IN ('manual', 'carga_masiva', 'anticipo_quincenal', 'prestamo_cuota')),
    CONSTRAINT "novedades_estado_check" CHECK ("estado" IN ('vigente', 'anulada')),
    -- Días u horas para licencia, ausencia y horas extra; pesos enteros para anticipo, préstamo y descuento.
    CONSTRAINT "novedades_medida_check" CHECK (
      (("tipo" IN ('licencia', 'ausencia', 'horas_extra')) AND "cantidad" IS NOT NULL AND "cantidad" > 0 AND "monto_clp" IS NULL)
      OR (("tipo" IN ('anticipo', 'prestamo', 'descuento')) AND "monto_clp" IS NOT NULL AND "monto_clp" > 0 AND "cantidad" IS NULL)
    ),
    CONSTRAINT "novedades_fechas_check" CHECK ("fecha_hasta" IS NULL OR "fecha_hasta" >= "fecha_desde")
);

-- CreateTable
CREATE TABLE "nomina"."prestamos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "persona_id" UUID NOT NULL,
    "monto_total" INTEGER NOT NULL,
    "cuotas" INTEGER NOT NULL,
    "primera_cuota_anio" INTEGER NOT NULL,
    "primera_cuota_mes" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "motivo" TEXT,
    "documento_id" UUID,
    "cancelado_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "prestamos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "prestamos_monto_check" CHECK ("monto_total" > 0),
    CONSTRAINT "prestamos_cuotas_check" CHECK ("cuotas" BETWEEN 1 AND 60 AND "monto_total" >= "cuotas"),
    CONSTRAINT "prestamos_mes_check" CHECK ("primera_cuota_mes" BETWEEN 1 AND 12),
    CONSTRAINT "prestamos_estado_check" CHECK ("estado" IN ('activo', 'pagado', 'cancelado'))
);

-- CreateTable
CREATE TABLE "nomina"."prestamo_cuotas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "prestamo_id" UUID NOT NULL,
    "numero" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "monto" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "prestamo_cuotas_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "prestamo_cuotas_numero_check" CHECK ("numero" >= 1),
    CONSTRAINT "prestamo_cuotas_mes_check" CHECK ("mes" BETWEEN 1 AND 12),
    CONSTRAINT "prestamo_cuotas_monto_check" CHECK ("monto" > 0),
    CONSTRAINT "prestamo_cuotas_estado_check" CHECK ("estado" IN ('pendiente', 'descontada', 'condonada'))
);

-- CreateTable
CREATE TABLE "nomina"."reglas_anticipo" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "persona_id" UUID NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "modo" TEXT NOT NULL DEFAULT 'monto_fijo',
    "valor" INTEGER NOT NULL,
    "dia_mes" INTEGER NOT NULL DEFAULT 15,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "reglas_anticipo_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "reglas_anticipo_modo_check" CHECK ("modo" IN ('monto_fijo', 'porcentaje_base')),
    CONSTRAINT "reglas_anticipo_valor_check" CHECK ("valor" > 0),
    CONSTRAINT "reglas_anticipo_dia_check" CHECK ("dia_mes" BETWEEN 1 AND 31)
);

-- CreateTable
CREATE TABLE "nomina"."conceptos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "imponible" BOOLEAN NOT NULL DEFAULT false,
    "tributable" BOOLEAN NOT NULL DEFAULT false,
    "codigo_lre" TEXT,
    "lre_verificado" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "conceptos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "conceptos_tipo_check" CHECK ("tipo" IN ('haber', 'descuento'))
);

-- CreateTable
CREATE TABLE "nomina"."obligaciones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "periodo_id" UUID,
    "tipo" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER,
    "estado" TEXT NOT NULL DEFAULT 'por_generar',
    "fecha_limite" DATE,
    "plazo_verificado" BOOLEAN NOT NULL DEFAULT false,
    "comprobante_documento_id" UUID,
    "nota" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "obligaciones_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "obligaciones_tipo_check" CHECK ("tipo" IN ('lre', 'previred', 'f29_retencion', 'dj_sueldos', 'certificado_sueldos')),
    CONSTRAINT "obligaciones_estado_check" CHECK ("estado" IN ('por_generar', 'generado', 'con_errores', 'cargado', 'pagado')),
    CONSTRAINT "obligaciones_mes_check" CHECK ("mes" IS NULL OR "mes" BETWEEN 1 AND 12)
);

-- CreateIndex
CREATE UNIQUE INDEX "periodos_tenant_id_anio_mes_key" ON "nomina"."periodos"("tenant_id", "anio", "mes");
CREATE INDEX "periodos_tenant_id_estado_idx" ON "nomina"."periodos"("tenant_id", "estado");

CREATE INDEX "novedades_tenant_id_periodo_id_tipo_idx" ON "nomina"."novedades"("tenant_id", "periodo_id", "tipo");
CREATE INDEX "novedades_tenant_id_persona_id_idx" ON "nomina"."novedades"("tenant_id", "persona_id");
-- Un anticipo quincenal por persona y fecha (B2): generar dos veces el mismo período no duplica.
CREATE UNIQUE INDEX "novedades_anticipo_quincenal_key"
    ON "nomina"."novedades"("tenant_id", "periodo_id", "persona_id", "fecha_desde")
    WHERE "origen" = 'anticipo_quincenal' AND "estado" = 'vigente';
-- Una cuota de préstamo genera a lo sumo una novedad vigente (B3).
CREATE UNIQUE INDEX "novedades_prestamo_cuota_key"
    ON "nomina"."novedades"("tenant_id", "prestamo_cuota_id")
    WHERE "prestamo_cuota_id" IS NOT NULL AND "estado" = 'vigente';

CREATE INDEX "prestamos_tenant_id_persona_id_estado_idx" ON "nomina"."prestamos"("tenant_id", "persona_id", "estado");

CREATE UNIQUE INDEX "prestamo_cuotas_prestamo_id_numero_key" ON "nomina"."prestamo_cuotas"("prestamo_id", "numero");
CREATE INDEX "prestamo_cuotas_tenant_id_anio_mes_estado_idx" ON "nomina"."prestamo_cuotas"("tenant_id", "anio", "mes", "estado");

CREATE UNIQUE INDEX "reglas_anticipo_tenant_id_persona_id_key" ON "nomina"."reglas_anticipo"("tenant_id", "persona_id");

CREATE UNIQUE INDEX "conceptos_tenant_id_codigo_key" ON "nomina"."conceptos"("tenant_id", "codigo");

CREATE INDEX "obligaciones_tenant_id_anio_mes_idx" ON "nomina"."obligaciones"("tenant_id", "anio", "mes");
-- Unicidad (tenant, tipo, año, mes): dos índices parciales porque el mes es NULL en las anuales.
CREATE UNIQUE INDEX "obligaciones_mensual_key" ON "nomina"."obligaciones"("tenant_id", "tipo", "anio", "mes") WHERE "mes" IS NOT NULL;
CREATE UNIQUE INDEX "obligaciones_anual_key" ON "nomina"."obligaciones"("tenant_id", "tipo", "anio") WHERE "mes" IS NULL;

-- AddForeignKey
ALTER TABLE "nomina"."periodos" ADD CONSTRAINT "periodos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nomina"."novedades" ADD CONSTRAINT "novedades_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nomina"."prestamos" ADD CONSTRAINT "prestamos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nomina"."prestamo_cuotas" ADD CONSTRAINT "prestamo_cuotas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nomina"."reglas_anticipo" ADD CONSTRAINT "reglas_anticipo_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nomina"."conceptos" ADD CONSTRAINT "conceptos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nomina"."obligaciones" ADD CONSTRAINT "obligaciones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nomina"."novedades" ADD CONSTRAINT "novedades_periodo_id_fkey" FOREIGN KEY ("periodo_id") REFERENCES "nomina"."periodos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nomina"."novedades" ADD CONSTRAINT "novedades_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "core"."personas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nomina"."novedades" ADD CONSTRAINT "novedades_concepto_id_fkey" FOREIGN KEY ("concepto_id") REFERENCES "nomina"."conceptos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nomina"."novedades" ADD CONSTRAINT "novedades_prestamo_cuota_id_fkey" FOREIGN KEY ("prestamo_cuota_id") REFERENCES "nomina"."prestamo_cuotas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nomina"."prestamos" ADD CONSTRAINT "prestamos_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "core"."personas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nomina"."prestamo_cuotas" ADD CONSTRAINT "prestamo_cuotas_prestamo_id_fkey" FOREIGN KEY ("prestamo_id") REFERENCES "nomina"."prestamos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nomina"."reglas_anticipo" ADD CONSTRAINT "reglas_anticipo_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "core"."personas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nomina"."obligaciones" ADD CONSTRAINT "obligaciones_periodo_id_fkey" FOREIGN KEY ("periodo_id") REFERENCES "nomina"."periodos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Permisos del rol de aplicación sobre el schema nuevo (REGLAS-codigo.md)
GRANT USAGE ON SCHEMA "nomina" TO opai_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "nomina" TO opai_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "nomina" TO opai_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA "nomina" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO opai_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA "nomina" GRANT USAGE, SELECT ON SEQUENCES TO opai_app;

-- Row-Level Security: una política `tenant_isolation` por tabla, para opai_app (NOBYPASSRLS).
ALTER TABLE "nomina"."periodos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "nomina"."periodos" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "nomina"."periodos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "nomina"."novedades" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "nomina"."novedades" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "nomina"."novedades" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "nomina"."prestamos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "nomina"."prestamos" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "nomina"."prestamos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "nomina"."prestamo_cuotas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "nomina"."prestamo_cuotas" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "nomina"."prestamo_cuotas" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "nomina"."reglas_anticipo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "nomina"."reglas_anticipo" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "nomina"."reglas_anticipo" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "nomina"."conceptos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "nomina"."conceptos" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "nomina"."conceptos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "nomina"."obligaciones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "nomina"."obligaciones" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "nomina"."obligaciones" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- Referencias dentro del mismo tenant (trigger del núcleo `core.verificar_mismo_tenant`): pares
-- (columna, tabla referida); salta las columnas NULL. Cubre también el respaldo en core.documentos.
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "nomina"."novedades"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('periodo_id', 'nomina.periodos', 'persona_id', 'core.personas', 'concepto_id', 'nomina.conceptos', 'prestamo_cuota_id', 'nomina.prestamo_cuotas', 'documento_id', 'core.documentos');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "nomina"."prestamos"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('persona_id', 'core.personas', 'documento_id', 'core.documentos');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "nomina"."prestamo_cuotas"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('prestamo_id', 'nomina.prestamos');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "nomina"."reglas_anticipo"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('persona_id', 'core.personas');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "nomina"."obligaciones"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('periodo_id', 'nomina.periodos', 'comprobante_documento_id', 'core.documentos');

COMMIT;

-- Reversión (manual, con el rol propietario, en una transacción): el schema es nuevo y sin datos de
-- negocio que migrar, basta con:
--   DROP SCHEMA "nomina" CASCADE;
-- Elimina las 7 tablas, sus índices, FKs, triggers y la política tenant_isolation de cada una, y
-- revoca los GRANT/ALTER DEFAULT PRIVILEGES al desaparecer el schema. Exige haber revertido antes el
-- código del módulo (manifest y capacidades `nomina.*`) para que nada siga escribiendo ahí. Si ya hay
-- períodos o préstamos reales, restaurar desde el snapshot de Neon previo (OPERACION-agentes.md A.5)
-- en lugar de borrar.
