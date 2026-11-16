-- Qué hace: copia valores guardados de desempeno.dia_cierre a desempeno.dia_cierre_mes sin sobrescribir destinos existentes (idempotente).
BEGIN;
SET LOCAL lock_timeout = '5s';

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

COMMIT;

-- Reversión: eliminar filas desempeno.dia_cierre_mes que no tenían par dia_cierre (o restaurar desde rama Neon backup-car-580-pre-main / backup-car-580-pre-dev).