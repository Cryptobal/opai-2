-- CAR-276 · Ficha de persona: previsión completa según el export aprobado, alineada con Previred y el LRE.
-- ADITIVA: columnas nuevas en core.personas_prevision, todas opcionales o con valor por defecto; no migra datos.
--   · Pensión: jubilado y tipo de pensión.
--   · Salud: % adicional de la Isapre.
--   · Cotiza: AFP, AFC y salud (por defecto sí).
--   · APV: institución, régimen A o B, monto y moneda.
--   · Asignación familiar: tramo y número de cargas simples, maternales y de invalidez (solo conteos, sin datos
--     de los causantes).
--   · Discapacidad o pensión de invalidez (dato de salud: sensible).
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "core"."personas_prevision"
  ADD COLUMN "jubilado" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "tipo_pension" TEXT,
  ADD COLUMN "salud_adicional_pct" DECIMAL(6,3),
  ADD COLUMN "cotiza_afp" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "cotiza_afc" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "cotiza_salud" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "apv_institucion" TEXT,
  ADD COLUMN "apv_regimen" TEXT,
  ADD COLUMN "apv_monto" DECIMAL(14,4),
  ADD COLUMN "apv_moneda" TEXT,
  ADD COLUMN "tramo_asignacion" TEXT,
  ADD COLUMN "cargas_simples" SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN "cargas_maternales" SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN "cargas_invalidez" SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN "discapacidad_invalidez" TEXT,
  ADD CONSTRAINT "personas_prevision_catalogos_check" CHECK (
    ("tipo_pension" IS NULL OR "tipo_pension" IN ('no', 'vejez', 'invalidez', 'sobrevivencia'))
    AND ("apv_regimen" IS NULL OR "apv_regimen" IN ('A', 'B'))
    AND ("apv_moneda" IS NULL OR "apv_moneda" IN ('clp', 'uf', 'pct'))
    AND ("tramo_asignacion" IS NULL OR "tramo_asignacion" IN ('A', 'B', 'C', 'D'))
    AND ("discapacidad_invalidez" IS NULL OR "discapacidad_invalidez" IN ('no', 'discapacidad', 'pension_invalidez'))
  ),
  ADD CONSTRAINT "personas_prevision_montos_check" CHECK (
    ("salud_adicional_pct" IS NULL OR "salud_adicional_pct" BETWEEN 0 AND 100)
    AND ("apv_monto" IS NULL OR "apv_monto" >= 0)
    AND "cargas_simples" BETWEEN 0 AND 20
    AND "cargas_maternales" BETWEEN 0 AND 20
    AND "cargas_invalidez" BETWEEN 0 AND 20
  );

COMMIT;

-- Reversión (manual, con el rol propietario): DROP COLUMN de cada columna nueva y de los dos CHECK.
