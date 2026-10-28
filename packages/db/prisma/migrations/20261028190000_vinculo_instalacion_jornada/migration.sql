-- Expansión aditiva: los vínculos históricos quedan por completar, sin inventar contratos.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE core.vinculos_laborales
  ADD COLUMN IF NOT EXISTS instalacion_id uuid,
  ADD COLUMN IF NOT EXISTS puesto_id uuid,
  ADD COLUMN IF NOT EXISTS horas_semanales integer,
  ADD COLUMN IF NOT EXISTS distribucion text;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='core.vinculos_laborales'::regclass AND conname='vinculos_instalacion_fkey') THEN
    ALTER TABLE core.vinculos_laborales ADD CONSTRAINT vinculos_instalacion_fkey
      FOREIGN KEY (instalacion_id) REFERENCES core.instalaciones(id) ON DELETE RESTRICT;
    ALTER TABLE core.vinculos_laborales ADD CONSTRAINT vinculos_puesto_fkey
      FOREIGN KEY (puesto_id) REFERENCES core.puestos(id) ON DELETE RESTRICT;
  END IF;
END $$;
ALTER TABLE core.vinculos_laborales DROP CONSTRAINT IF EXISTS vinculos_jornada_check;
ALTER TABLE core.vinculos_laborales ADD CONSTRAINT vinculos_jornada_check CHECK (
      (horas_semanales IS NULL AND distribucion IS NULL) OR
      (horas_semanales IS NOT NULL AND horas_semanales BETWEEN 1 AND 168 AND distribucion IS NOT NULL AND length(trim(distribucion)) BETWEEN 1 AND 200));
CREATE INDEX IF NOT EXISTS vinculos_tenant_instalacion_idx ON core.vinculos_laborales(tenant_id, instalacion_id, estado);
DROP TRIGGER IF EXISTS mismo_tenant ON core.vinculos_laborales;
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON core.vinculos_laborales
  FOR EACH ROW EXECUTE FUNCTION core.verificar_mismo_tenant(
    'persona_id', 'core.personas', 'cargo_id', 'core.cargos',
    'instalacion_id', 'core.instalaciones', 'puesto_id', 'core.puestos');
CREATE OR REPLACE FUNCTION core.verificar_puesto_vinculo() RETURNS trigger
LANGUAGE plpgsql AS $$ BEGIN
  IF NEW.puesto_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM core.puestos WHERE id=NEW.puesto_id AND tenant_id=NEW.tenant_id
      AND instalacion_id=NEW.instalacion_id FOR SHARE
  ) THEN RAISE EXCEPTION 'Referencia de vínculo inválida' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS puesto_instalacion ON core.vinculos_laborales;
CREATE TRIGGER puesto_instalacion BEFORE INSERT OR UPDATE ON core.vinculos_laborales
  FOR EACH ROW EXECUTE FUNCTION core.verificar_puesto_vinculo();
-- Un puesto ya referenciado no puede trasladarse silenciosamente a otra instalación.
CREATE OR REPLACE FUNCTION core.proteger_instalacion_puesto_vinculado() RETURNS trigger
LANGUAGE plpgsql AS $$ BEGIN
  IF NEW.instalacion_id IS DISTINCT FROM OLD.instalacion_id AND EXISTS (
    SELECT 1 FROM core.vinculos_laborales WHERE puesto_id=OLD.id
  ) THEN RAISE EXCEPTION 'El puesto tiene vínculos laborales' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS proteger_vinculos ON core.puestos;
CREATE TRIGGER proteger_vinculos BEFORE UPDATE ON core.puestos
  FOR EACH ROW EXECUTE FUNCTION core.proteger_instalacion_puesto_vinculado();
ALTER TABLE core.vinculos_laborales ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.vinculos_laborales FORCE ROW LEVEL SECURITY;
-- Se conservan tenant_isolation, opai_app NOBYPASSRLS y el índice único vigente por persona.
COMMIT;
