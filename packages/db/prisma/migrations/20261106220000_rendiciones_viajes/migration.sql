-- CAR-194, Rendiciones R2a (ADR-021, ADR-048): `rendiciones.rendicion_viajes`, un viaje por rendición
-- de kilometraje, con la instantánea de los parámetros usados y el monto calculado por el servidor.
-- Migración ADITIVA: solo crea una tabla nueva (el CHECK de `tipo` en `rendiciones` ya admite
-- 'kilometraje'). Lleva RLS `tenant_isolation` (ENABLE + FORCE) para opai_app y trigger mismo_tenant.

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "rendiciones"."rendicion_viajes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "rendicion_id" UUID NOT NULL,
    "origen_texto" TEXT NOT NULL,
    "origen_lat" DECIMAL(9,6) NOT NULL,
    "origen_lng" DECIMAL(9,6) NOT NULL,
    "destino_texto" TEXT NOT NULL,
    "destino_lat" DECIMAL(9,6) NOT NULL,
    "destino_lng" DECIMAL(9,6) NOT NULL,
    "km" DECIMAL(8,1) NOT NULL,
    "ida_y_vuelta" BOOLEAN NOT NULL DEFAULT false,
    "peaje_clp" INTEGER NOT NULL DEFAULT 0,
    "metodo" TEXT NOT NULL,
    "config_snapshot" JSONB NOT NULL,
    "origen_distancia" TEXT NOT NULL,
    "monto_calculado" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "rendicion_viajes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "rendicion_viajes_metodo_chk" CHECK ("metodo" IN ('consumo', 'tarifa_km', 'tramo_fijo')),
    CONSTRAINT "rendicion_viajes_origen_distancia_chk" CHECK ("origen_distancia" IN ('google', 'linea_recta')),
    CONSTRAINT "rendicion_viajes_km_chk" CHECK ("km" >= 0),
    CONSTRAINT "rendicion_viajes_peaje_chk" CHECK ("peaje_clp" >= 0),
    CONSTRAINT "rendicion_viajes_monto_chk" CHECK ("monto_calculado" > 0)
);

CREATE UNIQUE INDEX "rendicion_viajes_rendicion_id_key" ON "rendiciones"."rendicion_viajes"("rendicion_id");
CREATE INDEX "rendicion_viajes_tenant_id_idx" ON "rendiciones"."rendicion_viajes"("tenant_id");

ALTER TABLE "rendiciones"."rendicion_viajes" ADD CONSTRAINT "rendicion_viajes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rendiciones"."rendicion_viajes" ADD CONSTRAINT "rendicion_viajes_rendicion_id_fkey" FOREIGN KEY ("rendicion_id") REFERENCES "rendiciones"."rendiciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- El schema `rendiciones` ya tiene GRANT USAGE y ALTER DEFAULT PRIVILEGES (migración base); se
-- concede igual de forma explícita para no depender del orden de creación de la tabla.
GRANT SELECT, INSERT, UPDATE, DELETE ON "rendiciones"."rendicion_viajes" TO opai_app;

ALTER TABLE "rendiciones"."rendicion_viajes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rendiciones"."rendicion_viajes" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "rendiciones"."rendicion_viajes" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- La rendición debe ser de la misma empresa (core.users no interviene: sin referencias a usuarios).
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "rendiciones"."rendicion_viajes"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('rendicion_id', 'rendiciones.rendiciones');

COMMIT;

-- Reversión: migración aditiva; si hace falta deshacerla antes de usarla:
-- DROP TABLE "rendiciones"."rendicion_viajes"; (borra su política, índices y trigger). Con viajes ya
-- guardados no se borra: se restaura desde el snapshot previo de Neon.
