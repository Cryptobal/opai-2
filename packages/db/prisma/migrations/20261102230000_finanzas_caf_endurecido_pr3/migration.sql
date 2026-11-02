-- Finanzas · CAF endurecido PR 3 (CAR-143): fecha corte 1.0, metadatos de CAF y solape de rangos.

BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "finanzas"."dte_config"
  ADD COLUMN IF NOT EXISTS "fecha_corte_1_0" DATE;

ALTER TABLE "finanzas"."dte_folios"
  ADD COLUMN IF NOT EXISTS "caf_autorizado_en" DATE,
  ADD COLUMN IF NOT EXISTS "caf_idk" TEXT;

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "finanzas"."dte_folios"
  ADD COLUMN IF NOT EXISTS "folio_rango" int4range;

UPDATE "finanzas"."dte_folios"
SET "folio_rango" = int4range("folio_desde", "folio_hasta", '[]')
WHERE "folio_rango" IS NULL;

ALTER TABLE "finanzas"."dte_folios"
  ADD CONSTRAINT "dte_folios_folio_rango_coherente"
  CHECK ("folio_rango" IS NOT DISTINCT FROM int4range("folio_desde", "folio_hasta", '[]'));

CREATE OR REPLACE FUNCTION "finanzas"."dte_folios_sync_folio_rango"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW."folio_rango" := int4range(NEW."folio_desde", NEW."folio_hasta", '[]');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "dte_folios_sync_folio_rango" ON "finanzas"."dte_folios";
CREATE TRIGGER "dte_folios_sync_folio_rango"
  BEFORE INSERT OR UPDATE OF "folio_desde", "folio_hasta" ON "finanzas"."dte_folios"
  FOR EACH ROW
  EXECUTE FUNCTION "finanzas"."dte_folios_sync_folio_rango"();

DO $$
DECLARE
  rec RECORD;
  detalle TEXT := '';
BEGIN
  FOR rec IN
    SELECT
      a.tenant_id,
      a.tipo_dte,
      a.folio_desde AS a_desde,
      a.folio_hasta AS a_hasta,
      b.folio_desde AS b_desde,
      b.folio_hasta AS b_hasta
    FROM "finanzas"."dte_folios" a
    JOIN "finanzas"."dte_folios" b
      ON a.tenant_id = b.tenant_id
      AND a.tipo_dte = b.tipo_dte
      AND a.id < b.id
    WHERE int4range(a.folio_desde, a.folio_hasta, '[]') && int4range(b.folio_desde, b.folio_hasta, '[]')
  LOOP
    detalle := detalle || format(
      E'\n  tenant %s · tipo %s · rangos %s-%s y %s-%s',
      rec.tenant_id,
      rec.tipo_dte,
      rec.a_desde,
      rec.a_hasta,
      rec.b_desde,
      rec.b_hasta
    );
  END LOOP;
  IF detalle <> '' THEN
    RAISE EXCEPTION 'finanzas.dte_folios: hay rangos de folios solapados; corrija los datos antes del EXCLUDE:%', detalle;
  END IF;
END $$;

ALTER TABLE "finanzas"."dte_folios"
  ADD CONSTRAINT "dte_folios_rango_sin_solape"
  EXCLUDE USING gist (
    "tenant_id" WITH =,
    "tipo_dte" WITH =,
    "folio_rango" WITH &&
  );

COMMIT;

-- Reversión (manual, rol propietario):
--   ALTER TABLE "finanzas"."dte_folios" DROP CONSTRAINT IF EXISTS "dte_folios_rango_sin_solape";
--   ALTER TABLE "finanzas"."dte_folios" DROP CONSTRAINT IF EXISTS "dte_folios_folio_rango_coherente";
--   DROP TRIGGER IF EXISTS "dte_folios_sync_folio_rango" ON "finanzas"."dte_folios";
--   DROP FUNCTION IF EXISTS "finanzas"."dte_folios_sync_folio_rango"();
--   ALTER TABLE "finanzas"."dte_folios" DROP COLUMN IF EXISTS "folio_rango";
--   ALTER TABLE "finanzas"."dte_folios" DROP COLUMN IF EXISTS "caf_idk";
--   ALTER TABLE "finanzas"."dte_folios" DROP COLUMN IF EXISTS "caf_autorizado_en";
--   ALTER TABLE "finanzas"."dte_config" DROP COLUMN IF EXISTS "fecha_corte_1_0";
