-- CAR-162 PR E · CPQ v4: crear puestos al ganar (R2), compartir la cotización por enlace y archivar.
-- Solo cambios aditivos: 2 columnas nulas y 2 tablas nuevas (RLS ENABLE + FORCE + tenant_isolation).
-- Sin migración de datos: las cotizaciones existentes quedan sin archivar y sin enlaces.
-- Nota de prefijo: 20261105120000 ya existe en main (finanzas_cobranza); este va después del último.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "cpq"."cotizaciones" ADD COLUMN IF NOT EXISTS "archivada_en" TIMESTAMPTZ(6);
ALTER TABLE "cpq"."cotizaciones" ADD COLUMN IF NOT EXISTS "archivada_por_id" UUID;
CREATE INDEX IF NOT EXISTS "cotizaciones_tenant_id_archivada_en_idx"
  ON "cpq"."cotizaciones"("tenant_id", "archivada_en");

-- Enlace público de una cotización enviada: solo el hash sha256 de un token aleatorio de 128 bits (el token en claro no se guarda), vencimiento y revocación.
CREATE TABLE "cpq"."enlaces_compartidos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "cotizacion_id" UUID NOT NULL,
    "version_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "vence_en" TIMESTAMPTZ(6) NOT NULL,
    "revocado_en" TIMESTAMPTZ(6),
    "vistas" INTEGER NOT NULL DEFAULT 0,
    "ultima_vista_en" TIMESTAMPTZ(6),
    "creado_por_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "enlaces_compartidos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "enlaces_compartidos_token_hash_check" CHECK ("token_hash" ~ '^[0-9a-f]{64}$')
);
CREATE UNIQUE INDEX "enlaces_compartidos_token_hash_key" ON "cpq"."enlaces_compartidos"("token_hash");
CREATE INDEX "enlaces_compartidos_tenant_id_cotizacion_id_idx"
  ON "cpq"."enlaces_compartidos"("tenant_id", "cotizacion_id");
-- Un solo enlace activo por cotización: crear otro revoca el anterior en la misma transacción.
CREATE UNIQUE INDEX "enlaces_compartidos_activo_key" ON "cpq"."enlaces_compartidos"("cotizacion_id")
  WHERE "revocado_en" IS NULL;
ALTER TABLE "cpq"."enlaces_compartidos" ADD CONSTRAINT "enlaces_compartidos_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cpq"."enlaces_compartidos" ADD CONSTRAINT "enlaces_compartidos_cotizacion_id_fkey"
  FOREIGN KEY ("cotizacion_id") REFERENCES "cpq"."cotizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cpq"."enlaces_compartidos" ADD CONSTRAINT "enlaces_compartidos_version_id_fkey"
  FOREIGN KEY ("version_id") REFERENCES "cpq"."versiones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cpq"."enlaces_compartidos" ADD CONSTRAINT "enlaces_compartidos_creado_por_id_fkey"
  FOREIGN KEY ("creado_por_id") REFERENCES "core"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
GRANT SELECT, INSERT, UPDATE, DELETE ON "cpq"."enlaces_compartidos" TO opai_app;
ALTER TABLE "cpq"."enlaces_compartidos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cpq"."enlaces_compartidos" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "cpq"."enlaces_compartidos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "cpq"."enlaces_compartidos"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'cotizacion_id', 'cpq.cotizaciones', 'version_id', 'cpq.versiones');

-- Puestos creados desde la oferta (R2): una fila por posición confirmada. La unicidad (línea,
-- posición) vuelve idempotente la confirmación: repetirla no duplica puestos.
CREATE TABLE "cpq"."puestos_creados" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "linea_id" UUID NOT NULL,
    "posicion" INTEGER NOT NULL,
    "puesto_id" UUID NOT NULL,
    "confirmado_por_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "puestos_creados_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "puestos_creados_posicion_check" CHECK ("posicion" >= 1)
);
CREATE UNIQUE INDEX "puestos_creados_linea_id_posicion_key" ON "cpq"."puestos_creados"("linea_id", "posicion");
CREATE INDEX "puestos_creados_tenant_id_idx" ON "cpq"."puestos_creados"("tenant_id");
ALTER TABLE "cpq"."puestos_creados" ADD CONSTRAINT "puestos_creados_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cpq"."puestos_creados" ADD CONSTRAINT "puestos_creados_linea_id_fkey"
  FOREIGN KEY ("linea_id") REFERENCES "cpq"."lineas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cpq"."puestos_creados" ADD CONSTRAINT "puestos_creados_puesto_id_fkey"
  FOREIGN KEY ("puesto_id") REFERENCES "core"."puestos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cpq"."puestos_creados" ADD CONSTRAINT "puestos_creados_confirmado_por_id_fkey"
  FOREIGN KEY ("confirmado_por_id") REFERENCES "core"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
GRANT SELECT, INSERT, UPDATE, DELETE ON "cpq"."puestos_creados" TO opai_app;
ALTER TABLE "cpq"."puestos_creados" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cpq"."puestos_creados" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "cpq"."puestos_creados" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "cpq"."puestos_creados"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'linea_id', 'cpq.lineas', 'puesto_id', 'core.puestos');

COMMIT;

-- Reversión (manual, con el rol propietario, en una transacción):
--   DROP TABLE IF EXISTS "cpq"."puestos_creados", "cpq"."enlaces_compartidos";
--   DROP INDEX IF EXISTS "cpq"."cotizaciones_tenant_id_archivada_en_idx";
--   ALTER TABLE "cpq"."cotizaciones" DROP COLUMN IF EXISTS "archivada_en", DROP COLUMN IF EXISTS "archivada_por_id";
-- Solo elimina objetos nuevos; si ya hay enlaces o puestos creados, restaura desde el snapshot de Neon.
