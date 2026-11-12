-- CAR-275 · Ficha de persona · Pago: varias cuentas bancarias por persona, cuenta por defecto y nombre del titular.
-- Aditiva y reversible. No toca la RLS (las tablas ya la tienen). La cuenta que hoy tiene cada persona queda como
-- «por defecto» (backfill verificado); la nómina de pago sigue leyendo la cuenta por defecto.
--
-- Reversión (solo si ninguna persona tiene más de una cuenta):
--   DROP INDEX "core"."personas_pago_defecto_key"; DROP INDEX "core"."personas_pago_persona_id_idx2";
--   CREATE UNIQUE INDEX "personas_pago_persona_id_key" ON "core"."personas_pago"("persona_id");
--   ALTER TABLE "core"."personas_pago" DROP COLUMN "titular_nombre", DROP COLUMN "por_defecto";
--   ALTER TABLE "core"."personas_pago_solicitudes" DROP COLUMN "tipo", DROP COLUMN "cuenta_id", DROP COLUMN "titular_nombre", DROP COLUMN "por_defecto";
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "core"."personas_pago"
  ADD COLUMN "titular_nombre" TEXT,
  ADD COLUMN "por_defecto" BOOLEAN NOT NULL DEFAULT false;

-- La cuenta única de hoy pasa a ser la cuenta por defecto.
UPDATE "core"."personas_pago" SET "por_defecto" = true;

DO $$
DECLARE sin_defecto integer;
BEGIN
  SELECT count(*) INTO sin_defecto FROM "core"."personas_pago" WHERE "por_defecto" = false;
  IF sin_defecto <> 0 THEN
    RAISE EXCEPTION 'CAR-275: % cuentas quedaron sin marcar por defecto (¿RLS filtrando el backfill?)', sin_defecto;
  END IF;
END $$;

DROP INDEX "core"."personas_pago_persona_id_key";
CREATE INDEX "personas_pago_persona_id_idx2" ON "core"."personas_pago"("persona_id");
-- A lo más una cuenta por defecto por persona.
CREATE UNIQUE INDEX "personas_pago_defecto_key" ON "core"."personas_pago"("persona_id") WHERE "por_defecto";

ALTER TABLE "core"."personas_pago_solicitudes"
  ADD COLUMN "tipo" TEXT NOT NULL DEFAULT 'reemplazar',
  ADD COLUMN "cuenta_id" UUID,
  ADD COLUMN "titular_nombre" TEXT,
  ADD COLUMN "por_defecto" BOOLEAN NOT NULL DEFAULT false,
  ADD CONSTRAINT "personas_pago_solicitudes_tipo_check"
    CHECK ("tipo" IN ('reemplazar', 'agregar', 'marcar_defecto', 'quitar'));

COMMIT;
