-- Renombra el ajuste desempeno.dia_cierre → desempeno.dia_cierre_mes (CAR-580).
-- Idempotente: no sobrescribe si el destino ya existe.

INSERT INTO core.ajustes (
  id,
  tenant_id,
  ambito,
  sujeto_id,
  modulo,
  clave,
  valor,
  version,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  v.tenant_id,
  v.ambito,
  v.sujeto_id,
  v.modulo,
  'dia_cierre_mes',
  v.valor,
  v.version,
  v.created_at,
  now()
FROM core.ajustes v
WHERE v.modulo = 'desempeno'
  AND v.clave = 'dia_cierre'
  AND NOT EXISTS (
    SELECT 1
    FROM core.ajustes n
    WHERE n.tenant_id = v.tenant_id
      AND n.ambito = v.ambito
      AND n.sujeto_id = v.sujeto_id
      AND n.modulo = 'desempeno'
      AND n.clave = 'dia_cierre_mes'
  );

-- Respaldar reversión (no ejecutar automáticamente):
-- INSERT INTO core.ajustes (...) SELECT ... 'dia_cierre' ... FROM core.ajustes WHERE modulo = 'desempeno' AND clave = 'dia_cierre_mes' ...