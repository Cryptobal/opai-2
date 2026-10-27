-- Fase 2 de ADR-051. Aplicar SOLO después de desplegar el código que siempre llena la cadena.
-- Completa las filas del código anterior durante la convivencia sin reescribir eslabones nuevos.
BEGIN;
LOCK TABLE core.audit_events IN ACCESS EXCLUSIVE MODE;
DO $$
DECLARE
  r RECORD;
  v_seq INTEGER;
  v_previo TEXT;
  v_canon TEXT;
  v_digest TEXT;
  v_hash TEXT;
  v_crypto_schema TEXT;
BEGIN
  SELECT n.nspname INTO STRICT v_crypto_schema FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace WHERE e.extname = 'pgcrypto';
  FOR r IN SELECT * FROM core.audit_events WHERE seq IS NULL ORDER BY tenant_id, created_at, id LOOP
    SELECT seq, hash INTO v_seq, v_previo FROM core.audit_events
      WHERE tenant_id = r.tenant_id AND seq IS NOT NULL ORDER BY seq DESC LIMIT 1;
    v_seq := coalesce(v_seq, 0) + 1;
    v_previo := coalesce(v_previo, repeat('0', 64));
    EXECUTE format('SELECT encode(%I.digest($1, ''sha256''), ''hex'')', v_crypto_schema)
      INTO v_digest USING coalesce(r.payload::text, 'null');
    v_canon := jsonb_build_array(r.tenant_id::text, v_seq, r.actor_type,
      r.actor_id, r.via_user_id, r.capability, r.entity_type, r.entity_id,
      to_char(r.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'), v_digest)::text;
    EXECUTE format('SELECT encode(%I.digest($1, ''sha256''), ''hex'')', v_crypto_schema)
      INTO v_hash USING v_previo || E'\n' || v_canon;
    UPDATE core.audit_events SET seq = v_seq, hash_anterior = v_previo, hash = v_hash,
      hash_canon = v_canon WHERE id = r.id;
  END LOOP;
END $$;
ALTER TABLE core.audit_events
  ALTER COLUMN seq SET NOT NULL,
  ALTER COLUMN hash_anterior SET NOT NULL,
  ALTER COLUMN hash SET NOT NULL,
  ALTER COLUMN hash_canon SET NOT NULL;
COMMIT;
