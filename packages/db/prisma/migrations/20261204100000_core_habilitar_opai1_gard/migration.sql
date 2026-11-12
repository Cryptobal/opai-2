-- Habilita la integración restringida «opai1» (traer datos desde OPAI 1, CAR-321) para la empresa Gard.
-- Pedido de Carlos (12-nov-2026): el ajuste de plataforma no es editable por pantalla todavía.
-- Aditiva y reversible: solo agrega el id de Gard bajo la clave «opai1»; reversa al final.
-- Si la base no tiene la empresa «gard» (CI, entornos de prueba) no hace nada.
SET LOCAL lock_timeout = '5s';

DO $$
DECLARE
  gard uuid;
  filas integer;
BEGIN
  SELECT id INTO gard FROM core.tenants WHERE slug = 'gard';
  IF gard IS NULL THEN
    RETURN;
  END IF;

  -- Sin fila previa: crearla con Gard. Con fila previa: sumar a Gard sin pisar las demás empresas.
  INSERT INTO core.ajustes_plataforma (id, modulo, clave, valor, version, created_at, updated_at)
  VALUES (gen_random_uuid(), 'core', 'integraciones_habilitadas', jsonb_build_object('opai1', jsonb_build_array(gard::text)), 1, now(), now())
  ON CONFLICT (modulo, clave) DO UPDATE
    SET valor = jsonb_set(
          core.ajustes_plataforma.valor,
          '{opai1}',
          CASE
            WHEN COALESCE(core.ajustes_plataforma.valor -> 'opai1', '[]'::jsonb) @> to_jsonb(gard::text)
              THEN COALESCE(core.ajustes_plataforma.valor -> 'opai1', '[]'::jsonb)
            ELSE COALESCE(core.ajustes_plataforma.valor -> 'opai1', '[]'::jsonb) || to_jsonb(gard::text)
          END,
          true
        ),
        version = core.ajustes_plataforma.version + 1,
        updated_at = now();
  GET DIAGNOSTICS filas = ROW_COUNT;
  IF filas = 0 THEN
    RAISE EXCEPTION 'No se pudo habilitar opai1 para Gard';
  END IF;
END
$$;

-- Reversa (manual, solo si hace falta): quitar a Gard de la lista.
-- UPDATE core.ajustes_plataforma
--    SET valor = jsonb_set(valor, '{opai1}', (valor -> 'opai1') - (SELECT id::text FROM core.tenants WHERE slug = 'gard'))
--  WHERE modulo = 'core' AND clave = 'integraciones_habilitadas';
