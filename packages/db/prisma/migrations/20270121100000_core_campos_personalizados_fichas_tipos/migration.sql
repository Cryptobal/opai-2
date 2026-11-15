-- CAR-536 · Campos personalizados en instalaciones y personas, y tipos equivalentes a HubSpot.
-- Migración ADITIVA e IDEMPOTENTE, sin relleno de datos (no hay UPDATE: con FORCE RLS afectaría 0 filas):
--   * amplía los CHECK de entidad y tipo de `core.campos_personalizados` (los valores viejos siguen válidos);
--   * agrega `descripcion`, `valor_defecto`, `formato` y `opciones_etiquetas` (etiqueta visible de cada
--     opción, en paralelo a `opciones`, que guarda el valor interno). Vacía = la etiqueta es el valor,
--     como en las opciones creadas antes de CAR-536;
--   * agrega `instalacion_id` y `persona_id` a `core.campo_valores` con FK, índices y mismo tenant.

BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "core"."campos_personalizados"
  ADD COLUMN IF NOT EXISTS "descripcion" TEXT,
  ADD COLUMN IF NOT EXISTS "valor_defecto" JSONB,
  ADD COLUMN IF NOT EXISTS "formato" TEXT,
  ADD COLUMN IF NOT EXISTS "opciones_etiquetas" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "core"."campos_personalizados"
  DROP CONSTRAINT IF EXISTS "campos_personalizados_entidad_check",
  DROP CONSTRAINT IF EXISTS "campos_personalizados_tipo_check",
  DROP CONSTRAINT IF EXISTS "campos_personalizados_lista_check",
  DROP CONSTRAINT IF EXISTS "campos_personalizados_descripcion_check",
  DROP CONSTRAINT IF EXISTS "campos_personalizados_formato_check",
  DROP CONSTRAINT IF EXISTS "campos_personalizados_opciones_etiquetas_check";

ALTER TABLE "core"."campos_personalizados"
  ADD CONSTRAINT "campos_personalizados_entidad_check"
    CHECK ("entidad" IN ('cuenta', 'contacto', 'negocio', 'instalacion', 'persona')),
  ADD CONSTRAINT "campos_personalizados_tipo_check"
    CHECK ("tipo" IN ('texto', 'texto_largo', 'numero', 'fecha', 'fecha_hora', 'si_no', 'lista', 'radio',
                      'multiple', 'email', 'telefono', 'url', 'rut', 'usuario')),
  -- Desplegable, radio y casillas necesitan al menos una opción.
  ADD CONSTRAINT "campos_personalizados_lista_check"
    CHECK ("tipo" NOT IN ('lista', 'radio', 'multiple') OR cardinality("opciones") > 0),
  ADD CONSTRAINT "campos_personalizados_descripcion_check"
    CHECK ("descripcion" IS NULL OR length("descripcion") <= 300),
  -- El formato solo aplica a números.
  ADD CONSTRAINT "campos_personalizados_formato_check"
    CHECK ("formato" IS NULL OR ("tipo" = 'numero' AND "formato" IN ('entero', 'decimal', 'moneda_clp', 'porcentaje'))),
  ADD CONSTRAINT "campos_personalizados_opciones_etiquetas_check"
    CHECK (cardinality("opciones_etiquetas") = 0 OR cardinality("opciones_etiquetas") = cardinality("opciones"));

ALTER TABLE "core"."campo_valores"
  ADD COLUMN IF NOT EXISTS "instalacion_id" UUID,
  ADD COLUMN IF NOT EXISTS "persona_id" UUID;

ALTER TABLE "core"."campo_valores" DROP CONSTRAINT IF EXISTS "campo_valores_una_entidad_check";
ALTER TABLE "core"."campo_valores" ADD CONSTRAINT "campo_valores_una_entidad_check"
  CHECK (num_nonnulls("cuenta_id", "contacto_id", "negocio_id", "instalacion_id", "persona_id") = 1);

CREATE INDEX IF NOT EXISTS "campo_valores_tenant_id_instalacion_id_idx"
    ON "core"."campo_valores"("tenant_id", "instalacion_id");
CREATE INDEX IF NOT EXISTS "campo_valores_tenant_id_persona_id_idx"
    ON "core"."campo_valores"("tenant_id", "persona_id");
CREATE UNIQUE INDEX IF NOT EXISTS "campo_valores_instalacion_unico"
    ON "core"."campo_valores"("campo_id", "instalacion_id") WHERE "instalacion_id" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "campo_valores_persona_unico"
    ON "core"."campo_valores"("campo_id", "persona_id") WHERE "persona_id" IS NOT NULL;

DO $$ BEGIN
  ALTER TABLE "core"."campo_valores" ADD CONSTRAINT "campo_valores_instalacion_id_fkey"
    FOREIGN KEY ("instalacion_id") REFERENCES "core"."instalaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "core"."campo_valores" ADD CONSTRAINT "campo_valores_persona_id_fkey"
    FOREIGN KEY ("persona_id") REFERENCES "core"."personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Referencias dentro del mismo tenant (las FK de Postgres no pasan por RLS).
DROP TRIGGER IF EXISTS mismo_tenant ON "core"."campo_valores";
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."campo_valores"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'campo_id', 'core.campos_personalizados', 'cuenta_id', 'core.cuentas',
    'contacto_id', 'core.contactos', 'negocio_id', 'comercial.negocios',
    'instalacion_id', 'core.instalaciones', 'persona_id', 'core.personas');

COMMIT;

-- Reversión: borrar primero los campos y valores de las fichas y tipos nuevos, después
--   DROP TRIGGER mismo_tenant + recrearlo con los pares de 20261226100000;
--   ALTER TABLE "core"."campo_valores" DROP COLUMN "instalacion_id", DROP COLUMN "persona_id" y el CHECK
--   de una entidad con tres columnas; en campos_personalizados DROP COLUMN de las cuatro columnas nuevas y
--   los CHECK de entidad, tipo y lista de 20261226100000. Ante datos que conservar, snapshot previo de Neon.
