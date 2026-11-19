-- Plantilla de migración de OPAI 2.0 (CAR-47). Reglas en docs/2.0/migraciones.md.
--
-- Qué hace y por qué: CAR-412 (Estándares F-4). «Borrar por fechas» en Bancos eliminaba movimientos sin vuelta atrás.
-- Ahora cada borrado queda como un descarte: los movimientos salen de `movimientos_bancarios` (así ningún saldo,
-- conciliación ni flujo los cuenta, sin tocar sus consultas) y su copia exacta queda aquí, con quién, cuándo y por
-- qué, para «Restaurar». Aditiva: tabla nueva, sin tocar tablas existentes ni datos.
-- Tabla con tenant_id: RLS + FORCE + política tenant_isolation (docs/2.0/REGLAS-codigo.md).
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "finanzas"."movimientos_bancarios_descartes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "cuenta_id" UUID NOT NULL,
    "desde" DATE NOT NULL,
    "hasta" DATE NOT NULL,
    "origen" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "movimientos" JSONB NOT NULL,
    "descartado_por" UUID,
    "restaurado_en" TIMESTAMPTZ(6),
    "restaurado_por" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "movimientos_bancarios_descartes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "movimientos_bancarios_descartes_origen_chk" CHECK ("origen" IN ('web4leads', 'manual')),
    CONSTRAINT "movimientos_bancarios_descartes_rango_chk" CHECK ("desde" <= "hasta"),
    CONSTRAINT "movimientos_bancarios_descartes_cantidad_chk" CHECK ("cantidad" > 0)
);

CREATE INDEX "movimientos_bancarios_descartes_tenant_id_cuenta_id_created_at_idx"
  ON "finanzas"."movimientos_bancarios_descartes"("tenant_id", "cuenta_id", "created_at");

ALTER TABLE "finanzas"."movimientos_bancarios_descartes" ADD CONSTRAINT "movimientos_bancarios_descartes_cuenta_id_fkey"
  FOREIGN KEY ("cuenta_id") REFERENCES "finanzas"."cuentas_bancarias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finanzas"."movimientos_bancarios_descartes" ADD CONSTRAINT "movimientos_bancarios_descartes_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "finanzas"."movimientos_bancarios_descartes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finanzas"."movimientos_bancarios_descartes" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "finanzas"."movimientos_bancarios_descartes" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
-- La FK no pasa por RLS: sin este trigger un descarte de la empresa A podría apuntar a una cuenta de la B.
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "finanzas"."movimientos_bancarios_descartes"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('cuenta_id', 'finanzas.cuentas_bancarias');

COMMIT;

-- Reversión: DROP TABLE IF EXISTS "finanzas"."movimientos_bancarios_descartes";
-- (tabla nueva sin dependientes: se pierden las copias de los descartes hechos con este cambio; para no perder
-- movimientos, restaurar antes los descartes vigentes. Además existe el snapshot previo de Neon, ADR-104).
