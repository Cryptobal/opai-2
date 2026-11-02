-- CAR-135 · CPQ PR 10.3: catálogo CPQ, cálculo congelado al enviar (aditivo, reversible).
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "cpq"."versiones" ADD COLUMN IF NOT EXISTS "calculo_congelado_json" TEXT;

CREATE TABLE "cpq"."catalogo_categorias" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "clave" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "clase" TEXT NOT NULL DEFAULT 'directo',
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "catalogo_categorias_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "catalogo_categorias_clase_check" CHECK ("clase" IN ('directo', 'indirecto'))
);

CREATE TABLE "cpq"."catalogo_items" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria_id" UUID NOT NULL,
    "grupo" TEXT NOT NULL DEFAULT 'item',
    "unidad" TEXT NOT NULL DEFAULT 'unidad',
    "modo_calculo" TEXT NOT NULL DEFAULT 'mensual_fijo',
    "rateo_json" TEXT NOT NULL DEFAULT '{"tipo":"contrato"}',
    "costo_unitario_clp" INTEGER NOT NULL DEFAULT 0,
    "recurrencia" TEXT NOT NULL DEFAULT 'mensual',
    "visible_cliente" BOOLEAN NOT NULL DEFAULT true,
    "por_defecto" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "catalogo_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "catalogo_items_grupo_check" CHECK ("grupo" IN ('item', 'cargo', 'uniforme', 'insumo')),
    CONSTRAINT "catalogo_items_recurrencia_check" CHECK ("recurrencia" IN ('mensual', 'unico')),
    CONSTRAINT "catalogo_items_costo_check" CHECK ("costo_unitario_clp" >= 0)
);

CREATE UNIQUE INDEX "catalogo_categorias_tenant_id_clave_key" ON "cpq"."catalogo_categorias"("tenant_id", "clave");
CREATE UNIQUE INDEX "catalogo_items_tenant_id_codigo_key" ON "cpq"."catalogo_items"("tenant_id", "codigo");
CREATE INDEX "catalogo_items_tenant_id_categoria_id_idx" ON "cpq"."catalogo_items"("tenant_id", "categoria_id");

ALTER TABLE "cpq"."catalogo_categorias" ADD CONSTRAINT "catalogo_categorias_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cpq"."catalogo_items" ADD CONSTRAINT "catalogo_items_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cpq"."catalogo_items" ADD CONSTRAINT "catalogo_items_categoria_id_fkey"
  FOREIGN KEY ("categoria_id") REFERENCES "cpq"."catalogo_categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cpq"."catalogo_categorias" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cpq"."catalogo_categorias" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "cpq"."catalogo_categorias" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "cpq"."catalogo_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cpq"."catalogo_items" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "cpq"."catalogo_items" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "cpq"."catalogo_items"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('categoria_id', 'cpq.catalogo_categorias');

COMMIT;

-- Reversión manual (rol propietario):
-- DROP TRIGGER IF EXISTS mismo_tenant ON "cpq"."catalogo_items";
-- DROP TABLE IF EXISTS "cpq"."catalogo_items";
-- DROP TABLE IF EXISTS "cpq"."catalogo_categorias";
-- ALTER TABLE "cpq"."versiones" DROP COLUMN IF EXISTS "calculo_congelado_json";
