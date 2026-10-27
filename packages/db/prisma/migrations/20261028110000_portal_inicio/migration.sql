-- NÚCLEO-D1 · Portal de inicio por membresía: dónde entrar tras el login o al cambiar de empresa.
-- Aditiva e idempotente (IF NOT EXISTS). No valida contra `portales` en base (la capacidad sí): si
-- deja de estar entre los portales de la membresía, el servidor cae al primero permitido.

ALTER TABLE "core"."memberships" ADD COLUMN IF NOT EXISTS "portal_inicio" TEXT;

-- El admin puede fijarlo al invitar; pasa a la membresía recién creada al aceptar.
ALTER TABLE "core"."invitations" ADD COLUMN IF NOT EXISTS "portal_inicio" TEXT;

-- RLS: ninguna de las dos tablas cambia su política `tenant_isolation` (ya activa desde el init);
-- una columna nueva no necesita una política nueva.
