-- Qué hace y por qué: Personas y Cargos · PR 1 (CAR-29/CAR-33 como antecedentes). Agrega la marca
-- P1 "No recontratar" a core.personas (design-prompt-personas-cargos.md, punto P1): booleana, motivo,
-- fecha en que se marcó y fecha de vencimiento obligatoria (correcciones del Revisor y del abogado,
-- 30-oct 15:33 CLT: la marca vence siempre, nunca queda indefinida). Aditiva e idempotente (IF NOT
-- EXISTS). core.personas ya tiene FORCE ROW LEVEL SECURITY y su política tenant_isolation
-- (20261028170000_force_rls); columnas nuevas quedan cubiertas por la misma política de fila, sin
-- tocar RLS. La visibilidad por permiso (core:personas.no_recontratar.manage, solo RRHH/admin) se
-- aplica en la capacidad, no en la base.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "core"."personas"
  ADD COLUMN IF NOT EXISTS "no_recontratar" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "no_recontratar_motivo" TEXT,
  ADD COLUMN IF NOT EXISTS "no_recontratar_en" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "no_recontratar_vence_en" TIMESTAMPTZ(6);

COMMIT;

-- Reversión (manual, solo referencia; Prisma no aplica down):
--   ALTER TABLE "core"."personas"
--     DROP COLUMN IF EXISTS "no_recontratar",
--     DROP COLUMN IF EXISTS "no_recontratar_motivo",
--     DROP COLUMN IF EXISTS "no_recontratar_en",
--     DROP COLUMN IF EXISTS "no_recontratar_vence_en";
