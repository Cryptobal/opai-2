-- CAR-77 parte 2 · Ciclo de estados del libro de novedades (Sesión Terreno). Cada cambio de estado de una novedad
-- (tomar, resolver, cerrar, derivar, reabrir) es un hecho nuevo e inmutable (ADR-023) con autor, nota y hora del
-- servidor; `core.libro_novedades.estado` es la proyección del último hecho. `opai_app` solo lee e inserta.
-- Tabla con tenant_id: RLS + FORCE + política tenant_isolation; novedad del mismo tenant por trigger. Aditiva, sin datos.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "core"."libro_novedades_hechos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "novedad_id" UUID NOT NULL,
    "accion" TEXT NOT NULL,
    "estado_anterior" TEXT NOT NULL,
    "estado_nuevo" TEXT NOT NULL,
    "nota" TEXT,
    "usuario_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "libro_novedades_hechos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "libro_novedades_hechos_accion_check"
      CHECK ("accion" IN ('tomar', 'resolver', 'cerrar', 'derivar', 'reabrir'))
);
CREATE INDEX "libro_novedades_hechos_tenant_id_novedad_id_created_at_idx"
    ON "core"."libro_novedades_hechos"("tenant_id", "novedad_id", "created_at");

ALTER TABLE "core"."libro_novedades_hechos" ADD CONSTRAINT "libro_novedades_hechos_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core"."libro_novedades_hechos" ADD CONSTRAINT "libro_novedades_hechos_novedad_id_fkey"
    FOREIGN KEY ("novedad_id") REFERENCES "core"."libro_novedades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "core"."libro_novedades_hechos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."libro_novedades_hechos" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."libro_novedades_hechos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
GRANT SELECT, INSERT ON "core"."libro_novedades_hechos" TO opai_app;

CREATE TRIGGER mismo_tenant BEFORE INSERT ON "core"."libro_novedades_hechos"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('novedad_id', 'core.libro_novedades');

COMMIT;

-- Reversión: DROP TABLE "core"."libro_novedades_hechos"; (tabla nueva, sin dependencias; el estado proyectado en
-- core.libro_novedades queda como está).
