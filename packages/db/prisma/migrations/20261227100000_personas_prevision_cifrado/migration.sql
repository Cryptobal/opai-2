-- Plantilla de migración de OPAI 2.0 (CAR-47). Reglas en docs/2.0/migraciones.md.
--
-- Qué hace y por qué: CAR-411 (Estándares H-6). La discapacidad o pensión de invalidez y el tipo de pensión son datos
-- de salud (Ley 21.719): pasan a guardarse cifrados con el mismo mecanismo del plan ISAPRE (`enc:v2:…`, la DEK de la
-- empresa). Un valor cifrado no cabe en el CHECK de catálogo: el catálogo lo valida la capacidad
-- (`core.personas.prevision_actualizar`, esquema de entrada) y la base exige, en cambio, que el valor esté cifrado.
-- Datos existentes: la clave de cifrado vive solo en la aplicación, así que una migración SQL no puede cifrar.
-- Al 14-nov-2026 no hay filas con estos campos en dev ni en main. Si alguna quedara en claro, el ADD CONSTRAINT
-- (que se valida contra todas las filas, sin RLS) falla y la migración se revierte entera: nunca deja un dato en claro.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "core"."personas_prevision" DROP CONSTRAINT "personas_prevision_catalogos_check";
ALTER TABLE "core"."personas_prevision"
  ADD CONSTRAINT "personas_prevision_catalogos_check" CHECK (
    ("apv_regimen" IS NULL OR "apv_regimen" IN ('A', 'B'))
    AND ("apv_moneda" IS NULL OR "apv_moneda" IN ('clp', 'uf', 'pct'))
    AND ("tramo_asignacion" IS NULL OR "tramo_asignacion" IN ('A', 'B', 'C', 'D'))
  ),
  ADD CONSTRAINT "personas_prevision_salud_cifrada" CHECK (
    ("tipo_pension" IS NULL OR "tipo_pension" LIKE 'enc:%')
    AND ("discapacidad_invalidez" IS NULL OR "discapacidad_invalidez" LIKE 'enc:%')
  );

COMMIT;

-- Reversión (solo si no quedan valores cifrados en esas columnas; si los hay, primero se descifran desde la app):
-- ALTER TABLE "core"."personas_prevision" DROP CONSTRAINT "personas_prevision_salud_cifrada";
-- ALTER TABLE "core"."personas_prevision" DROP CONSTRAINT "personas_prevision_catalogos_check";
-- ALTER TABLE "core"."personas_prevision" ADD CONSTRAINT "personas_prevision_catalogos_check" CHECK (
--   ("tipo_pension" IS NULL OR "tipo_pension" IN ('no', 'vejez', 'invalidez', 'sobrevivencia'))
--   AND ("apv_regimen" IS NULL OR "apv_regimen" IN ('A', 'B'))
--   AND ("apv_moneda" IS NULL OR "apv_moneda" IN ('clp', 'uf', 'pct'))
--   AND ("tramo_asignacion" IS NULL OR "tramo_asignacion" IN ('A', 'B', 'C', 'D'))
--   AND ("discapacidad_invalidez" IS NULL OR "discapacidad_invalidez" IN ('no', 'discapacidad', 'pension_invalidez')));
