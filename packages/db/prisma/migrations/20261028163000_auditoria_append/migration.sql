-- Una llamada de app; lock y SELECT separados dentro de VOLATILE renuevan snapshot tras esperar.
-- SECURITY INVOKER: conserva RLS, permisos append-only y la transacción del llamador.
CREATE OR REPLACE FUNCTION core.auditoria_append(
  p_id uuid, p_tenant uuid, p_actor text, p_actor_id text, p_via_user text,
  p_capability text, p_entity_type text, p_entity_id text, p_payload jsonb,
  p_created_at timestamptz
) RETURNS TABLE(id uuid, seq integer, hash text)
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = pg_catalog, core AS $$
DECLARE
  v_seq integer;
  v_anterior text;
  v_canon text;
  v_hash text;
BEGIN
  IF p_tenant IS DISTINCT FROM NULLIF(current_setting('app.tenant_id', true), '')::uuid THEN
    RAISE EXCEPTION 'Tenant no autorizado' USING ERRCODE = '42501';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_tenant::text, 0));
  SELECT e.seq, e.hash INTO v_seq, v_anterior FROM core.audit_events e
    WHERE e.tenant_id = p_tenant AND e.seq IS NOT NULL ORDER BY e.seq DESC LIMIT 1;
  v_seq := coalesce(v_seq, 0) + 1;
  v_anterior := coalesce(v_anterior, repeat('0', 64));
  -- Canon SQL histórico: el verificador ya lo recalcula desde columnas y payload actuales.
  v_canon := jsonb_build_array(p_tenant::text, v_seq, p_actor, p_actor_id, p_via_user,
    p_capability, p_entity_type, p_entity_id,
    to_char(p_created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    encode(sha256(convert_to(coalesce(p_payload::text, 'null'), 'UTF8')), 'hex'))::text;
  v_hash := encode(sha256(convert_to(v_anterior || E'\n' || v_canon, 'UTF8')), 'hex');
  INSERT INTO core.audit_events(id, tenant_id, actor_type, actor_id, via_user_id, capability,
    entity_type, entity_id, payload, created_at, seq, hash_anterior, hash, hash_canon)
    VALUES(p_id, p_tenant, p_actor, p_actor_id, p_via_user, p_capability, p_entity_type,
      p_entity_id, p_payload, p_created_at, v_seq, v_anterior, v_hash, v_canon);
  RETURN QUERY SELECT p_id, v_seq, v_hash;
END;
$$;
REVOKE ALL ON FUNCTION core.auditoria_append(uuid, uuid, text, text, text, text, text, text, jsonb, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION core.auditoria_append(uuid, uuid, text, text, text, text, text, text, jsonb, timestamptz) TO opai_app;
-- Reversión tras desplegar append anterior: DROP FUNCTION core.auditoria_append(uuid, uuid, text, text, text, text, text, text, jsonb, timestamptz);
