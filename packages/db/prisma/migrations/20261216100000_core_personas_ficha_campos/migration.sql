-- CAR-277 · Ficha de persona: campos del export aprobado que faltaban.
-- ADITIVA: columnas nuevas, todas opcionales o con valor por defecto; no migra datos.
--   · core.personas_uniforme: tallas de polera, geólogo y polar; estatura (cm) y peso (kg).
--   · core.personas_jornada_dt: resolución «vigente hasta» y los términos de hasta 3 períodos de plazo fijo.
--   · core.personas_contacto_laboral: código interno y movilización.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "core"."personas_uniforme"
  ADD COLUMN "talla_polera" TEXT,
  ADD COLUMN "talla_geologo" TEXT,
  ADD COLUMN "talla_polar" TEXT,
  ADD COLUMN "estatura_cm" INTEGER,
  ADD COLUMN "peso_kg" INTEGER,
  ADD CONSTRAINT "personas_uniforme_medidas_check"
    CHECK (("estatura_cm" IS NULL OR "estatura_cm" BETWEEN 100 AND 230) AND ("peso_kg" IS NULL OR "peso_kg" BETWEEN 30 AND 250));

ALTER TABLE "core"."personas_jornada_dt"
  ADD COLUMN "resolucion_vigente_hasta" DATE,
  ADD COLUMN "terminos_plazo_fijo" DATE[] NOT NULL DEFAULT ARRAY[]::DATE[],
  ADD CONSTRAINT "personas_jornada_dt_terminos_check" CHECK (cardinality("terminos_plazo_fijo") <= 3);

ALTER TABLE "core"."personas_contacto_laboral"
  ADD COLUMN "codigo_interno" TEXT,
  ADD COLUMN "movilizacion" TEXT;

COMMIT;

-- Reversión (manual, con el rol propietario): DROP COLUMN de cada columna nueva y de los dos CHECK.
