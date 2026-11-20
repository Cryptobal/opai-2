-- CAR-559: alinea probabilidad de negocios que siguen con el % de la primera etapa del embudo
-- pese a estar en otra etapa (faltaba copiar la probabilidad al mover). Conservador: solo si el
-- valor actual coincide con el de la primera etapa abierta activa (default de creación); no toca
-- negocios cerrados ni archivados; no actualiza si ya coincide con la etapa actual. Idempotente.
BEGIN;
SET LOCAL lock_timeout = '5s';

DO $$
DECLARE
  v_corregidos integer;
BEGIN
  WITH primera AS (
    SELECT DISTINCT ON (e.tenant_id, e.embudo_id)
      e.tenant_id,
      e.embudo_id,
      e.id AS etapa_id,
      e.probabilidad
    FROM comercial.etapas e
    WHERE e.tipo = 'abierta'
      AND e.activa = true
    ORDER BY e.tenant_id, e.embudo_id, e.orden ASC
  )
  UPDATE comercial.negocios n
  SET
    probabilidad = e_act.probabilidad,
    updated_at = NOW()
  FROM comercial.etapas e_act
  INNER JOIN primera p
    ON p.tenant_id = e_act.tenant_id
    AND p.embudo_id = e_act.embudo_id
  WHERE n.etapa_id = e_act.id
    AND n.tenant_id = e_act.tenant_id
    AND n.estado = 'abierto'
    AND n.archivado_en IS NULL
    AND n.etapa_id <> p.etapa_id
    AND n.probabilidad = p.probabilidad
    AND n.probabilidad IS DISTINCT FROM e_act.probabilidad;

  GET DIAGNOSTICS v_corregidos = ROW_COUNT;
  RAISE NOTICE 'CAR-559: negocios abiertos con probabilidad alineada a etapa actual: %', v_corregidos;
END
$$;

COMMIT;

-- Reversión: no automática; el % corregido no se distingue del que ya venía bien tras el fix de
-- aplicarEtapa. Restaurar desde snapshot de Neon previo (OPERACION-agentes.md A2.3).