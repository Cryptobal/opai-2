-- Fase 2 de ADR-052. Aplicar SOLO después de desplegar el código que siempre llena la cadena.
-- Completa las filas del código anterior durante la convivencia sin reescribir eslabones nuevos.
DO $$
DECLARE
  v_tenant UUID;
  v_cantidad INTEGER;
  v_col TEXT;
BEGIN
  -- Cierra inserts viejos sin escanear la historia; reejecutable tras un fallo parcial.
  FOREACH v_col IN ARRAY ARRAY['seq', 'hash_anterior', 'hash', 'hash_canon'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'core.audit_events'::regclass
      AND conname = 'auditoria_nn_' || v_col) THEN
      EXECUTE format('ALTER TABLE core.audit_events ADD CONSTRAINT %I CHECK (%I IS NOT NULL) NOT VALID',
        'auditoria_nn_' || v_col, v_col);
    END IF;
  END LOOP;
  COMMIT;
  FOR v_tenant IN SELECT DISTINCT tenant_id FROM core.audit_events WHERE seq IS NULL LOOP
    LOOP
      PERFORM pg_advisory_xact_lock(hashtextextended(v_tenant::text, 0));
      WITH RECURSIVE
      cabeza AS (
        SELECT coalesce((SELECT seq FROM core.audit_events WHERE tenant_id = v_tenant
          AND seq IS NOT NULL ORDER BY seq DESC LIMIT 1), 0) AS seq,
          coalesce((SELECT hash FROM core.audit_events WHERE tenant_id = v_tenant
          AND seq IS NOT NULL ORDER BY seq DESC LIMIT 1), repeat('0', 64)) AS hash
      ),
      pendientes AS MATERIALIZED (
        SELECT e.*, row_number() OVER (ORDER BY created_at, id)::int AS n
        FROM (SELECT * FROM core.audit_events WHERE tenant_id = v_tenant AND seq IS NULL
          ORDER BY created_at, id LIMIT 1000) e
      ),
      canones AS MATERIALIZED (
        SELECT p.id, p.n, c.seq + p.n AS seq,
          jsonb_build_array(p.tenant_id::text, c.seq + p.n, p.actor_type, p.actor_id,
            p.via_user_id, p.capability, p.entity_type, p.entity_id,
            to_char(p.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
            encode(sha256(convert_to(coalesce(p.payload::text, 'null'), 'UTF8')), 'hex'))::text AS canon
        FROM pendientes p CROSS JOIN cabeza c
      ),
      cadena AS (
        SELECT p.*, c.hash AS previo,
          encode(sha256(convert_to(c.hash || E'\n' || p.canon, 'UTF8')), 'hex') AS hash
        FROM canones p CROSS JOIN cabeza c WHERE p.n = 1
        UNION ALL
        SELECT p.*, c.hash,
          encode(sha256(convert_to(c.hash || E'\n' || p.canon, 'UTF8')), 'hex')
        FROM canones p JOIN cadena c ON p.n = c.n + 1
      )
      UPDATE core.audit_events e SET seq = c.seq, hash_anterior = c.previo,
        hash = c.hash, hash_canon = c.canon FROM cadena c WHERE e.id = c.id AND e.tenant_id = v_tenant;
      GET DIAGNOSTICS v_cantidad = ROW_COUNT;
      COMMIT;
      EXIT WHEN v_cantidad < 1000;
    END LOOP;
  END LOOP;
  -- VALIDATE usa SHARE UPDATE EXCLUSIVE, compatible con INSERT/SELECT de la app.
  FOREACH v_col IN ARRAY ARRAY['seq', 'hash_anterior', 'hash', 'hash_canon'] LOOP
    EXECUTE format('ALTER TABLE core.audit_events VALIDATE CONSTRAINT %I', 'auditoria_nn_' || v_col);
  END LOOP;
  COMMIT; -- No arrastrar locks de validación al SET NOT NULL.
  FOREACH v_col IN ARRAY ARRAY['seq', 'hash_anterior', 'hash', 'hash_canon'] LOOP
    EXECUTE format('ALTER TABLE core.audit_events ALTER COLUMN %I SET NOT NULL', v_col);
  END LOOP;
  FOREACH v_col IN ARRAY ARRAY['seq', 'hash_anterior', 'hash', 'hash_canon'] LOOP
    EXECUTE format('ALTER TABLE core.audit_events DROP CONSTRAINT %I', 'auditoria_nn_' || v_col);
  END LOOP;
END $$;
