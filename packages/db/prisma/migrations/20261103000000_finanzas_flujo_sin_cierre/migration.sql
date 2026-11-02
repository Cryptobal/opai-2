-- Flujo v2 PR A: retira cierre semanal y metas visibles de la UI; columnas conservadas (sin DROP).
-- Marca tolerancia_cierre y metas_visibles como en desuso; metas_visibles default false para filas nuevas.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "finanzas"."flujo_ajustes"
  ALTER COLUMN "metas_visibles" SET DEFAULT false;

COMMENT ON COLUMN "finanzas"."flujo_ajustes"."tolerancia_cierre" IS
  'En desuso (20261103000000): cierre semanal retirado; la semana pasada manda la cartola.';
COMMENT ON COLUMN "finanzas"."flujo_ajustes"."metas_visibles" IS
  'En desuso (20261103000000): metas de rendimiento retiradas de la planilla.';

COMMIT;

-- Reversión: quitar comentarios y restaurar default anterior de metas_visibles.
-- BEGIN;
-- SET LOCAL lock_timeout = '5s';
-- COMMENT ON COLUMN "finanzas"."flujo_ajustes"."tolerancia_cierre" IS NULL;
-- COMMENT ON COLUMN "finanzas"."flujo_ajustes"."metas_visibles" IS NULL;
-- ALTER TABLE "finanzas"."flujo_ajustes" ALTER COLUMN "metas_visibles" SET DEFAULT true;
-- COMMIT;
