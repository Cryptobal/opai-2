-- CAR-419 · Semilla de Pauta para la empresa ficticia `qa-e2e` (pruebas visuales `@preview` de la pauta).
-- Solo datos ficticios; nunca Gard. Idempotente (ON CONFLICT con ids fijos). Lo aplica la sesión dueña con
-- respaldo previo de Neon, en la base de test.opai.cl, que es donde vive `qa-e2e`.
--
-- Deja: una cuenta y una instalación ficticias, un puesto 4×4 de día con el patrón 4×4 de la empresa y su
-- serie desde el 1-nov-2026 con «Guardia QA Auditoría» (CAR-401) como titular; su vínculo queda en ese puesto.
-- Falla (y no escribe nada) si la empresa no es `qa-*`, o si no existen el patrón 4×4 o la persona de CAR-401.
BEGIN;
SET LOCAL lock_timeout = '5s';

DO $$
DECLARE
  t uuid;
  patron uuid;
  persona uuid;
  vinculo uuid;
  cargo uuid;
  cuenta uuid := '01a1cb70-0000-7000-8000-00000000a419';
  inst uuid := '01a1cb70-0000-7000-8000-00000000b419';
  puesto uuid := '01a1cb70-0000-7000-8000-00000000c419';
  serie uuid := '01a1cb70-0000-7000-8000-00000000d419';
BEGIN
  SELECT id INTO t FROM core.tenants WHERE slug = 'qa-e2e' AND slug LIKE 'qa-%';
  IF t IS NULL THEN RAISE EXCEPTION 'No existe la empresa ficticia qa-e2e'; END IF;
  PERFORM set_config('app.tenant_id', t::text, true);
  SELECT id INTO patron FROM core.patrones_turno WHERE tenant_id = t AND nombre = '4×4' AND activo;
  SELECT pe.id, v.id, v.cargo_id INTO persona, vinculo, cargo
    FROM core.personas pe JOIN core.vinculos_laborales v ON v.persona_id = pe.id AND v.estado = 'vigente'
    WHERE pe.tenant_id = t AND pe.nombres = 'Guardia QA' LIMIT 1;
  IF patron IS NULL OR persona IS NULL THEN
    RAISE EXCEPTION 'Falta el patrón 4×4 o la persona Guardia QA (semilla CAR-401)';
  END IF;

  INSERT INTO core.cuentas (id, tenant_id, nombre, updated_at)
    VALUES (cuenta, t, 'Cliente QA Pauta (ficticio)', now()) ON CONFLICT (id) DO NOTHING;
  INSERT INTO core.instalaciones (id, tenant_id, cuenta_id, nombre, updated_at)
    VALUES (inst, t, cuenta, 'Planta QA Pauta', now()) ON CONFLICT (id) DO NOTHING;
  INSERT INTO core.puestos (id, tenant_id, instalacion_id, cargo_id, nombre, dias_trabajo, dias_descanso,
      hora_inicio, hora_fin, patron_id, updated_at)
    VALUES (puesto, t, inst, cargo, 'Portería QA Día', 4, 4, '08:00', '20:00', patron, now())
    ON CONFLICT (id) DO NOTHING;
  INSERT INTO pauta.series (id, tenant_id, puesto_id, patron_id, inicio_ciclo, titular_persona_id,
      vigente_desde, updated_at)
    VALUES (serie, t, puesto, patron, DATE '2026-11-01', persona, DATE '2026-11-01', now())
    ON CONFLICT (id) DO NOTHING;
  UPDATE core.vinculos_laborales SET instalacion_id = inst, puesto_id = puesto, updated_at = now()
    WHERE id = vinculo AND (instalacion_id IS DISTINCT FROM inst OR puesto_id IS DISTINCT FROM puesto);
END $$;

COMMIT;

-- Reversión (solo `qa-e2e`): borrar la serie, el puesto, la instalación y la cuenta con estos ids, y dejar el
-- vínculo de Guardia QA sin instalación ni puesto.
