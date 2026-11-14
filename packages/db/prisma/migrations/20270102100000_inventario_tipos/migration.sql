-- Inventario · CAR-235 (ADR-116): catálogo de tipos de activos y ropa. Migración aditiva, sin datos:
-- schema nuevo `inventario` con la tabla `tipos`.
-- Qué hace y por qué: cada empresa define sus tipos de inventario. Un tipo «activo» se controla por
-- unidad y declara sus campos propios; uno de «ropa» se controla por existencias y talla.
-- Tablas con tenant_id: RLS + FORCE + política tenant_isolation (docs/2.0/REGLAS-codigo.md).
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE SCHEMA IF NOT EXISTS "inventario";

CREATE TABLE "inventario"."tipos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "categoria" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombre_normalizado" TEXT NOT NULL,
    "descripcion" TEXT,
    "campos" JSONB NOT NULL DEFAULT '[]',
    "tallas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "prenda_clave" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tipos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tipos_categoria_check" CHECK ("categoria" IN ('activo', 'ropa')),
    CONSTRAINT "tipos_nombre_check" CHECK (char_length("nombre") BETWEEN 2 AND 80),
    CONSTRAINT "tipos_campos_check" CHECK (jsonb_typeof("campos") = 'array'),
    CONSTRAINT "tipos_ropa_check" CHECK (
      ("categoria" = 'ropa' AND cardinality("tallas") >= 1 AND "campos" = '[]'::jsonb)
      OR ("categoria" = 'activo' AND cardinality("tallas") = 0 AND "prenda_clave" IS NULL)
    )
);

CREATE UNIQUE INDEX "tipos_tenant_id_nombre_normalizado_key"
  ON "inventario"."tipos"("tenant_id", "nombre_normalizado");
CREATE UNIQUE INDEX "tipos_tenant_id_id_key" ON "inventario"."tipos"("tenant_id", "id");

ALTER TABLE "inventario"."tipos" ADD CONSTRAINT "tipos_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventario"."tipos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventario"."tipos" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "inventario"."tipos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- Grants (GRANT USAGE + ALTER DEFAULT PRIVILEGES al crear un schema nuevo, ver REGLAS-codigo.md)
GRANT USAGE ON SCHEMA "inventario" TO opai_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "inventario" TO opai_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "inventario" TO opai_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA "inventario" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO opai_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA "inventario" GRANT USAGE, SELECT ON SEQUENCES TO opai_app;

COMMIT;

-- Reversión: DROP TABLE IF EXISTS "inventario"."tipos"; DROP SCHEMA IF EXISTS "inventario";
