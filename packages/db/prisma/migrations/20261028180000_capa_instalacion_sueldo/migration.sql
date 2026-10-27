-- 07b PR 1: expansión aditiva. Sin backfill ni cambio de nulabilidad histórica.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE core.estructuras_sueldo ADD COLUMN IF NOT EXISTS instalacion_id uuid;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
    WHERE conrelid = 'core.estructuras_sueldo'::regclass
      AND conname = 'estructuras_sueldo_instalacion_id_fkey') THEN
    ALTER TABLE core.estructuras_sueldo ADD CONSTRAINT estructuras_sueldo_instalacion_id_fkey
      FOREIGN KEY (instalacion_id) REFERENCES core.instalaciones(id)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS estructuras_sueldo_tenant_id_nivel_instalacion_id_idx
  ON core.estructuras_sueldo(tenant_id, nivel, instalacion_id);
ALTER TABLE core.estructuras_sueldo DROP CONSTRAINT IF EXISTS estructuras_sueldo_nivel_check;
ALTER TABLE core.estructuras_sueldo ADD CONSTRAINT estructuras_sueldo_nivel_check CHECK (
  (nivel = 'cargo' AND cargo_id IS NOT NULL AND puesto_id IS NULL AND persona_id IS NULL AND instalacion_id IS NULL)
  OR (nivel = 'puesto' AND puesto_id IS NOT NULL AND cargo_id IS NULL AND persona_id IS NULL AND instalacion_id IS NULL)
  OR (nivel = 'persona' AND persona_id IS NOT NULL AND cargo_id IS NULL AND puesto_id IS NULL AND instalacion_id IS NULL)
  OR (nivel = 'instalacion' AND instalacion_id IS NOT NULL AND cargo_id IS NULL AND puesto_id IS NULL AND persona_id IS NULL)
);
ALTER TABLE core.estructuras_sueldo DROP CONSTRAINT IF EXISTS estructuras_sueldo_instalacion_completa_check;
ALTER TABLE core.estructuras_sueldo ADD CONSTRAINT estructuras_sueldo_instalacion_completa_check CHECK (
  nivel <> 'instalacion' OR (sueldo_base IS NOT NULL AND colacion IS NOT NULL
    AND movilizacion IS NOT NULL AND gratificacion IS NOT NULL
    AND (gratificacion <> 'monto_fijo' OR gratificacion_monto IS NOT NULL))
);
DROP TRIGGER IF EXISTS mismo_tenant ON core.estructuras_sueldo;
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON core.estructuras_sueldo
  FOR EACH ROW EXECUTE FUNCTION core.verificar_mismo_tenant(
    'cargo_id', 'core.cargos', 'puesto_id', 'core.puestos',
    'persona_id', 'core.personas', 'instalacion_id', 'core.instalaciones');
ALTER TABLE core.estructuras_sueldo ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.estructuras_sueldo FORCE ROW LEVEL SECURITY;
-- La política tenant_isolation y los grants existentes se conservan. No se alteran roles.
COMMIT;

-- REVERSIÓN: requiere snapshot y resolver previamente las filas nivel instalación; no borrar datos automáticamente.
-- BEGIN;
-- SET LOCAL lock_timeout = '5s';
-- ALTER TABLE core.estructuras_sueldo DROP CONSTRAINT IF EXISTS estructuras_sueldo_instalacion_completa_check;
-- ALTER TABLE core.estructuras_sueldo DROP CONSTRAINT IF EXISTS estructuras_sueldo_nivel_check;
-- DROP TRIGGER IF EXISTS mismo_tenant ON core.estructuras_sueldo;
-- CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON core.estructuras_sueldo
--   FOR EACH ROW EXECUTE FUNCTION core.verificar_mismo_tenant(
--     'cargo_id', 'core.cargos', 'puesto_id', 'core.puestos', 'persona_id', 'core.personas');
-- DROP INDEX IF EXISTS core.estructuras_sueldo_tenant_id_nivel_instalacion_id_idx;
-- ALTER TABLE core.estructuras_sueldo DROP CONSTRAINT IF EXISTS estructuras_sueldo_instalacion_id_fkey;
-- ALTER TABLE core.estructuras_sueldo DROP COLUMN IF EXISTS instalacion_id;
-- ALTER TABLE core.estructuras_sueldo ADD CONSTRAINT estructuras_sueldo_nivel_check CHECK (
--   (nivel = 'cargo' AND cargo_id IS NOT NULL AND puesto_id IS NULL AND persona_id IS NULL)
--   OR (nivel = 'puesto' AND puesto_id IS NOT NULL AND cargo_id IS NULL AND persona_id IS NULL)
--   OR (nivel = 'persona' AND persona_id IS NOT NULL AND cargo_id IS NULL AND puesto_id IS NULL));
-- RLS ENABLE + FORCE se conserva: es obligatorio por la migración force_rls previa.
-- COMMIT;
