-- CAR-581: correo comercial en perfil, copias de avisos en ajustes nuevos, marca documental en perfil.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE core.perfil_empresa
  ADD COLUMN IF NOT EXISTS documento_tipografia TEXT NOT NULL DEFAULT 'inter',
  ADD COLUMN IF NOT EXISTS documento_pie_pagina TEXT,
  ADD COLUMN IF NOT EXISTS documento_condiciones_default TEXT;

ALTER TABLE core.perfil_empresa
  DROP CONSTRAINT IF EXISTS perfil_empresa_documento_tipografia_check;
ALTER TABLE core.perfil_empresa
  ADD CONSTRAINT perfil_empresa_documento_tipografia_check
  CHECK (documento_tipografia IN ('inter', 'helvetica', 'times'));

-- Marca documental CPQ → perfil (sin pisar valores ya cargados en perfil).
UPDATE core.perfil_empresa p
SET
  documento_tipografia = COALESCE(NULLIF(p.documento_tipografia, ''), m.tipografia, 'inter'),
  documento_pie_pagina = COALESCE(p.documento_pie_pagina, m.pie_pagina),
  documento_condiciones_default = COALESCE(p.documento_condiciones_default, m.condiciones_default)
FROM cpq.marca_documento m
WHERE m.tenant_id = p.tenant_id;

-- CCO comercial → correo comercial del perfil (solo si el perfil no lo tenía).
UPDATE core.perfil_empresa p
SET correo_comercial = TRIM(BOTH '"' FROM a.valor::text)
FROM core.ajustes a
WHERE a.tenant_id = p.tenant_id
  AND a.modulo = 'core'
  AND a.clave = 'comunicaciones_cco_comercial'
  AND a.ambito = 'tenant'
  AND a.sujeto_id = p.tenant_id
  AND (p.correo_comercial IS NULL OR TRIM(p.correo_comercial) = '')
  AND a.valor::text NOT IN ('""', 'null');

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
  a.tenant_id,
  a.ambito,
  a.sujeto_id,
  a.modulo,
  'notificaciones_correo_operaciones',
  a.valor,
  a.version,
  a.created_at,
  now()
FROM core.ajustes a
WHERE a.modulo = 'core'
  AND a.clave = 'comunicaciones_cco_operaciones'
  AND a.valor::text NOT IN ('""', 'null')
  AND NOT EXISTS (
    SELECT 1
    FROM core.ajustes n
    WHERE n.tenant_id = a.tenant_id
      AND n.ambito = a.ambito
      AND n.sujeto_id = a.sujeto_id
      AND n.modulo = 'core'
      AND n.clave = 'notificaciones_correo_operaciones'
  );

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
  a.tenant_id,
  a.ambito,
  a.sujeto_id,
  a.modulo,
  'notificaciones_correo_finanzas',
  a.valor,
  a.version,
  a.created_at,
  now()
FROM core.ajustes a
WHERE a.modulo = 'core'
  AND a.clave = 'comunicaciones_cco_finanzas'
  AND a.valor::text NOT IN ('""', 'null')
  AND NOT EXISTS (
    SELECT 1
    FROM core.ajustes n
    WHERE n.tenant_id = a.tenant_id
      AND n.ambito = a.ambito
      AND n.sujeto_id = a.sujeto_id
      AND n.modulo = 'core'
      AND n.clave = 'notificaciones_correo_finanzas'
  );

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
  a.tenant_id,
  a.ambito,
  a.sujeto_id,
  a.modulo,
  'notificaciones_correo_comercial',
  a.valor,
  a.version,
  a.created_at,
  now()
FROM core.ajustes a
WHERE a.modulo = 'core'
  AND a.clave = 'comunicaciones_cco_comercial'
  AND a.valor::text NOT IN ('""', 'null')
  AND NOT EXISTS (
    SELECT 1
    FROM core.ajustes n
    WHERE n.tenant_id = a.tenant_id
      AND n.ambito = a.ambito
      AND n.sujeto_id = a.sujeto_id
      AND n.modulo = 'core'
      AND n.clave = 'notificaciones_correo_comercial'
  );

COMMIT;

-- Reversión: manual; quitar columnas de perfil, revertir ajustes notificaciones_correo_* y restaurar CCO en core.