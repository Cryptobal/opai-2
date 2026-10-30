-- Brief 23 · Finanzas compras PR 1: schema `finanzas` con plan de cuentas por tenant, centros de costo
-- (instalaciones + el general «Administración / Oficina central»), proveedores y libro de compras.
-- Migración ADITIVA: solo crea objetos nuevos, sin DROP ni cambios en tablas existentes. Las únicas
-- referencias a otros schemas son FK hacia core.tenants y core.instalaciones. Toda tabla con tenant_id
-- lleva RLS `tenant_isolation` (ENABLE + FORCE) para opai_app, que es NOBYPASSRLS, y el trigger
-- `mismo_tenant` del núcleo para que ninguna referencia cruce de empresa.

BEGIN;
SET LOCAL lock_timeout = '5s';

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "finanzas";

-- CreateTable
CREATE TABLE "finanzas"."cuentas_contables" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "naturaleza" TEXT NOT NULL,
    "grupo" TEXT,
    "exige_centro_costo" BOOLEAN NOT NULL DEFAULT false,
    "acepta_asientos" BOOLEAN NOT NULL DEFAULT true,
    "padre_id" UUID,
    "clave_sistema" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cuentas_contables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finanzas"."centros_costo" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "instalacion_id" UUID,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "centros_costo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finanzas"."proveedores" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "rut" TEXT NOT NULL,
    "razon_social" TEXT NOT NULL,
    "giro" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "plazo_pago_dias" INTEGER NOT NULL DEFAULT 30,
    "cuenta_gasto_id" UUID,
    "cuenta_por_pagar_id" UUID,
    "centro_costo_id" UUID,
    "notas" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "proveedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finanzas"."documentos_recibidos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "proveedor_id" UUID NOT NULL,
    "tipo_dte" INTEGER NOT NULL,
    "folio" INTEGER NOT NULL,
    "fecha_emision" DATE NOT NULL,
    "fecha_recepcion" DATE NOT NULL,
    "monto_neto" INTEGER NOT NULL DEFAULT 0,
    "monto_exento" INTEGER NOT NULL DEFAULT 0,
    "monto_iva" INTEGER NOT NULL DEFAULT 0,
    "monto_otros" INTEGER NOT NULL DEFAULT 0,
    "monto_total" INTEGER NOT NULL,
    "estado_recepcion" TEXT NOT NULL DEFAULT 'pendiente_revision',
    "centro_costo_id" UUID,
    "origen" TEXT NOT NULL DEFAULT 'manual',
    "glosa" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "documentos_recibidos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cuentas_contables_tenant_id_padre_id_idx" ON "finanzas"."cuentas_contables"("tenant_id", "padre_id");

-- CreateIndex
CREATE UNIQUE INDEX "cuentas_contables_tenant_id_codigo_key" ON "finanzas"."cuentas_contables"("tenant_id", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "cuentas_contables_tenant_id_clave_sistema_key" ON "finanzas"."cuentas_contables"("tenant_id", "clave_sistema");

-- CreateIndex
CREATE UNIQUE INDEX "centros_costo_tenant_id_instalacion_id_key" ON "finanzas"."centros_costo"("tenant_id", "instalacion_id");

-- CreateIndex
CREATE INDEX "proveedores_tenant_id_razon_social_idx" ON "finanzas"."proveedores"("tenant_id", "razon_social");

-- CreateIndex
CREATE UNIQUE INDEX "proveedores_tenant_id_rut_key" ON "finanzas"."proveedores"("tenant_id", "rut");

-- CreateIndex
CREATE INDEX "documentos_recibidos_tenant_id_fecha_recepcion_idx" ON "finanzas"."documentos_recibidos"("tenant_id", "fecha_recepcion");

-- CreateIndex
CREATE INDEX "documentos_recibidos_tenant_id_proveedor_id_fecha_emision_idx" ON "finanzas"."documentos_recibidos"("tenant_id", "proveedor_id", "fecha_emision");

-- CreateIndex
CREATE INDEX "documentos_recibidos_tenant_id_centro_costo_id_idx" ON "finanzas"."documentos_recibidos"("tenant_id", "centro_costo_id");

-- CreateIndex
CREATE UNIQUE INDEX "documentos_recibidos_tenant_id_proveedor_id_tipo_dte_folio_key" ON "finanzas"."documentos_recibidos"("tenant_id", "proveedor_id", "tipo_dte", "folio");

-- AddForeignKey
ALTER TABLE "finanzas"."cuentas_contables" ADD CONSTRAINT "cuentas_contables_padre_id_fkey" FOREIGN KEY ("padre_id") REFERENCES "finanzas"."cuentas_contables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finanzas"."proveedores" ADD CONSTRAINT "proveedores_cuenta_gasto_id_fkey" FOREIGN KEY ("cuenta_gasto_id") REFERENCES "finanzas"."cuentas_contables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finanzas"."proveedores" ADD CONSTRAINT "proveedores_cuenta_por_pagar_id_fkey" FOREIGN KEY ("cuenta_por_pagar_id") REFERENCES "finanzas"."cuentas_contables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finanzas"."proveedores" ADD CONSTRAINT "proveedores_centro_costo_id_fkey" FOREIGN KEY ("centro_costo_id") REFERENCES "finanzas"."centros_costo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finanzas"."documentos_recibidos" ADD CONSTRAINT "documentos_recibidos_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "finanzas"."proveedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finanzas"."documentos_recibidos" ADD CONSTRAINT "documentos_recibidos_centro_costo_id_fkey" FOREIGN KEY ("centro_costo_id") REFERENCES "finanzas"."centros_costo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Claves foráneas hacia el núcleo (el tenant_id y la instalación no llevan @relation en Prisma).
ALTER TABLE "finanzas"."cuentas_contables" ADD CONSTRAINT "cuentas_contables_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finanzas"."centros_costo" ADD CONSTRAINT "centros_costo_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finanzas"."proveedores" ADD CONSTRAINT "proveedores_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finanzas"."documentos_recibidos" ADD CONSTRAINT "documentos_recibidos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finanzas"."centros_costo" ADD CONSTRAINT "centros_costo_instalacion_id_fkey" FOREIGN KEY ("instalacion_id") REFERENCES "core"."instalaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Un solo centro general por tenant, y la forma de cada centro según su tipo.
CREATE UNIQUE INDEX "centros_costo_tenant_id_general_key" ON "finanzas"."centros_costo"("tenant_id") WHERE "tipo" = 'general';
ALTER TABLE "finanzas"."centros_costo" ADD CONSTRAINT "centros_costo_tipo_chk"
  CHECK (("tipo" = 'instalacion' AND "instalacion_id" IS NOT NULL) OR ("tipo" = 'general' AND "instalacion_id" IS NULL));

-- Vocabularios cerrados y montos no negativos (el borde ya los valida; la base es la última defensa).
-- `tipo_dte` (33, 34, 56, 61) se valida solo en el borde: forma parte de una clave única y la prueba
-- de dos empresas regenera esas columnas, así que un CHECK sobre ella no es compatible con esa prueba.
ALTER TABLE "finanzas"."cuentas_contables" ADD CONSTRAINT "cuentas_contables_tipo_chk"
  CHECK ("tipo" IN ('activo', 'pasivo', 'patrimonio', 'ingreso', 'costo', 'gasto'));
ALTER TABLE "finanzas"."cuentas_contables" ADD CONSTRAINT "cuentas_contables_naturaleza_chk"
  CHECK ("naturaleza" IN ('deudora', 'acreedora'));
ALTER TABLE "finanzas"."cuentas_contables" ADD CONSTRAINT "cuentas_contables_grupo_chk"
  CHECK ("grupo" IS NULL OR ("grupo" IN ('corriente', 'no_corriente') AND "tipo" IN ('activo', 'pasivo')));
ALTER TABLE "finanzas"."proveedores" ADD CONSTRAINT "proveedores_plazo_chk"
  CHECK ("plazo_pago_dias" BETWEEN 0 AND 365);
ALTER TABLE "finanzas"."documentos_recibidos" ADD CONSTRAINT "documentos_recibidos_estado_chk"
  CHECK ("estado_recepcion" IN ('pendiente_revision', 'aceptado', 'reclamado'));
ALTER TABLE "finanzas"."documentos_recibidos" ADD CONSTRAINT "documentos_recibidos_montos_chk"
  CHECK ("monto_neto" >= 0 AND "monto_exento" >= 0 AND "monto_iva" >= 0 AND "monto_otros" >= 0
    AND "monto_total" = "monto_neto" + "monto_exento" + "monto_iva" + "monto_otros");

-- Permisos del rol de aplicación sobre el schema nuevo (REGLAS-codigo.md)
GRANT USAGE ON SCHEMA "finanzas" TO opai_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "finanzas" TO opai_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "finanzas" TO opai_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA "finanzas" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO opai_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA "finanzas" GRANT USAGE, SELECT ON SEQUENCES TO opai_app;

-- Row-Level Security: una política `tenant_isolation` por tabla, para opai_app (NOBYPASSRLS).
ALTER TABLE "finanzas"."cuentas_contables" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finanzas"."cuentas_contables" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "finanzas"."cuentas_contables" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "finanzas"."centros_costo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finanzas"."centros_costo" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "finanzas"."centros_costo" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "finanzas"."proveedores" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finanzas"."proveedores" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "finanzas"."proveedores" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "finanzas"."documentos_recibidos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finanzas"."documentos_recibidos" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "finanzas"."documentos_recibidos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- Referencias dentro del mismo tenant (trigger del núcleo `core.verificar_mismo_tenant`).
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "finanzas"."cuentas_contables"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('padre_id', 'finanzas.cuentas_contables');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "finanzas"."centros_costo"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('instalacion_id', 'core.instalaciones');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "finanzas"."proveedores"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('cuenta_gasto_id', 'finanzas.cuentas_contables', 'cuenta_por_pagar_id', 'finanzas.cuentas_contables', 'centro_costo_id', 'finanzas.centros_costo');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "finanzas"."documentos_recibidos"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('proveedor_id', 'finanzas.proveedores', 'centro_costo_id', 'finanzas.centros_costo');

COMMIT;

-- Reversión (manual, con el rol propietario, en una transacción): sin datos de negocio que migrar
-- (el schema es nuevo), basta con:
--   DROP SCHEMA "finanzas" CASCADE;
-- Elimina las 4 tablas, sus índices, FKs, CHECK, triggers y la política tenant_isolation de cada una, y
-- revoca los GRANT/ALTER DEFAULT PRIVILEGES al desaparecer el schema. Exige haber revertido antes el
-- código del módulo (manifest y capacidades `finanzas.*`) para que nada siga escribiendo ahí.
