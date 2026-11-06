-- CAR-208, Rendiciones R3: lotes de pago de rendiciones aprobadas. Migración ADITIVA (tablas nuevas
-- y una columna de estado ya existente sin cambios). Decisión de Carlos del 6-nov-2026: R3 solo en
-- test.opai.cl. Toda tabla con tenant_id lleva RLS `tenant_isolation` (ENABLE + FORCE) para opai_app.
-- No hay migración de datos: no se actualizan filas existentes (nota de REGLAS-codigo sobre FORCE RLS).

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "rendiciones"."lotes_pago" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "codigo" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "total_clp" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "creado_por_id" UUID NOT NULL,
    "aprobado_por_id" UUID,
    "aprobado_en" TIMESTAMPTZ(6),
    "generado_por_id" UUID,
    "generado_en" TIMESTAMPTZ(6),
    "nomina_huella" TEXT,
    "pagado_por_id" UUID,
    "pagado_en" TIMESTAMPTZ(6),
    "fecha_pago" DATE,
    "referencia_pago" TEXT,
    "comprobante_documento_id" UUID,
    "anulado_por_id" UUID,
    "anulado_en" TIMESTAMPTZ(6),
    "motivo_anulacion" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "lotes_pago_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "lotes_pago_estado_chk" CHECK ("estado" IN ('borrador', 'aprobado', 'generado', 'pagado', 'anulado')),
    CONSTRAINT "lotes_pago_total_chk" CHECK ("total_clp" > 0 AND "cantidad" > 0),
    CONSTRAINT "lotes_pago_pagado_chk" CHECK ("estado" <> 'pagado' OR ("pagado_en" IS NOT NULL AND "fecha_pago" IS NOT NULL AND "referencia_pago" IS NOT NULL))
);

CREATE TABLE "rendiciones"."lote_pago_items" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "lote_id" UUID NOT NULL,
    "rendicion_id" UUID NOT NULL,
    "persona_id" UUID NOT NULL,
    "monto_clp" INTEGER NOT NULL,
    "cuenta_version" TIMESTAMPTZ(6) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lote_pago_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "lote_pago_items_monto_chk" CHECK ("monto_clp" > 0)
);

CREATE TABLE "rendiciones"."lote_pago_historial" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "lote_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "actor_id" UUID NOT NULL,
    "estado_desde" TEXT,
    "estado_hasta" TEXT,
    "comentario" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lote_pago_historial_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "rendiciones"."lote_pago_contadores" (
    "tenant_id" UUID NOT NULL,
    "ultimo" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "lote_pago_contadores_pkey" PRIMARY KEY ("tenant_id")
);

CREATE UNIQUE INDEX "lotes_pago_tenant_id_codigo_key" ON "rendiciones"."lotes_pago"("tenant_id", "codigo");
CREATE INDEX "lotes_pago_tenant_id_estado_idx" ON "rendiciones"."lotes_pago"("tenant_id", "estado");
CREATE INDEX "lote_pago_items_tenant_id_lote_id_idx" ON "rendiciones"."lote_pago_items"("tenant_id", "lote_id");
CREATE INDEX "lote_pago_items_tenant_id_rendicion_id_idx" ON "rendiciones"."lote_pago_items"("tenant_id", "rendicion_id");
CREATE INDEX "lote_pago_historial_tenant_id_lote_id_idx" ON "rendiciones"."lote_pago_historial"("tenant_id", "lote_id");
-- Una rendición no puede estar en dos lotes activos (la anulación del lote libera sus ítems).
CREATE UNIQUE INDEX "lote_pago_items_rendicion_activa_key" ON "rendiciones"."lote_pago_items"("rendicion_id") WHERE "activo";

ALTER TABLE "rendiciones"."lotes_pago" ADD CONSTRAINT "lotes_pago_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rendiciones"."lotes_pago" ADD CONSTRAINT "lotes_pago_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "core"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rendiciones"."lotes_pago" ADD CONSTRAINT "lotes_pago_aprobado_por_id_fkey" FOREIGN KEY ("aprobado_por_id") REFERENCES "core"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rendiciones"."lotes_pago" ADD CONSTRAINT "lotes_pago_generado_por_id_fkey" FOREIGN KEY ("generado_por_id") REFERENCES "core"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rendiciones"."lotes_pago" ADD CONSTRAINT "lotes_pago_pagado_por_id_fkey" FOREIGN KEY ("pagado_por_id") REFERENCES "core"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rendiciones"."lotes_pago" ADD CONSTRAINT "lotes_pago_anulado_por_id_fkey" FOREIGN KEY ("anulado_por_id") REFERENCES "core"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rendiciones"."lotes_pago" ADD CONSTRAINT "lotes_pago_comprobante_documento_id_fkey" FOREIGN KEY ("comprobante_documento_id") REFERENCES "core"."documentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "rendiciones"."lote_pago_items" ADD CONSTRAINT "lote_pago_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rendiciones"."lote_pago_items" ADD CONSTRAINT "lote_pago_items_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "rendiciones"."lotes_pago"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rendiciones"."lote_pago_items" ADD CONSTRAINT "lote_pago_items_rendicion_id_fkey" FOREIGN KEY ("rendicion_id") REFERENCES "rendiciones"."rendiciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rendiciones"."lote_pago_items" ADD CONSTRAINT "lote_pago_items_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "core"."personas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rendiciones"."lote_pago_historial" ADD CONSTRAINT "lote_pago_historial_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rendiciones"."lote_pago_historial" ADD CONSTRAINT "lote_pago_historial_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "rendiciones"."lotes_pago"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rendiciones"."lote_pago_historial" ADD CONSTRAINT "lote_pago_historial_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "core"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rendiciones"."lote_pago_contadores" ADD CONSTRAINT "lote_pago_contadores_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Integridad del total: nunca cambia el total, la cantidad ni los ítems de un lote (se anula y se rehace).
CREATE FUNCTION "rendiciones"."lote_pago_proteger_total"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.total_clp IS DISTINCT FROM OLD.total_clp OR NEW.cantidad IS DISTINCT FROM OLD.cantidad THEN
    RAISE EXCEPTION 'El total y la cantidad de un lote de pago no se modifican' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "lote_pago_proteger_total" BEFORE UPDATE ON "rendiciones"."lotes_pago"
  FOR EACH ROW EXECUTE FUNCTION "rendiciones"."lote_pago_proteger_total"();

CREATE FUNCTION "rendiciones"."lote_pago_item_inmutable"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.monto_clp IS DISTINCT FROM OLD.monto_clp OR NEW.rendicion_id IS DISTINCT FROM OLD.rendicion_id
     OR NEW.lote_id IS DISTINCT FROM OLD.lote_id OR NEW.persona_id IS DISTINCT FROM OLD.persona_id THEN
    RAISE EXCEPTION 'Los ítems de un lote de pago no se modifican' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "lote_pago_item_inmutable" BEFORE UPDATE ON "rendiciones"."lote_pago_items"
  FOR EACH ROW EXECUTE FUNCTION "rendiciones"."lote_pago_item_inmutable"();

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "rendiciones" TO opai_app;

ALTER TABLE "rendiciones"."lotes_pago" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rendiciones"."lotes_pago" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "rendiciones"."lotes_pago" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "rendiciones"."lote_pago_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rendiciones"."lote_pago_items" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "rendiciones"."lote_pago_items" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "rendiciones"."lote_pago_historial" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rendiciones"."lote_pago_historial" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "rendiciones"."lote_pago_historial" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "rendiciones"."lote_pago_contadores" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rendiciones"."lote_pago_contadores" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "rendiciones"."lote_pago_contadores" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

COMMIT;

-- Reversión: migración aditiva; si hace falta deshacerla antes de usarla:
-- DROP TABLE "rendiciones"."lote_pago_items", "rendiciones"."lote_pago_historial",
--   "rendiciones"."lote_pago_contadores", "rendiciones"."lotes_pago"; DROP FUNCTION
--   "rendiciones"."lote_pago_proteger_total"(), "rendiciones"."lote_pago_item_inmutable"().
-- Con lotes ya guardados no se borra: se restaura desde el snapshot previo de Neon.
