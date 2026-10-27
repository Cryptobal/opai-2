-- Brief 07c · sábana A18/A19 · Trazabilidad de las excepciones de permiso (ADR-022).
-- Aditiva e idempotente (IF NOT EXISTS): agrega a `core.permiso_excepciones` el motivo, el autor y
-- (ya existían) las fechas, para mostrar en la ficha del usuario «Fijado por … · fecha» y el porqué.
-- No toca migraciones existentes; timestamp posterior a las de #48 y #51 pendientes. created_at y
-- updated_at ya existen desde 20261026160000_roles_permisos_finos; aquí solo motivo y creado_por.

-- Motivo de la excepción (≤200). Null permitido en base para las filas previas; la obligatoriedad al
-- conceder o denegar (3–200, trim) la impone la capacidad `core.excepciones.set`.
ALTER TABLE "core"."permiso_excepciones" ADD COLUMN IF NOT EXISTS "motivo" TEXT;

-- Tope de longitud en base (defensa en profundidad). Guardado para ser idempotente.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'permiso_excepciones_motivo_largo'
  ) THEN
    ALTER TABLE "core"."permiso_excepciones"
      ADD CONSTRAINT "permiso_excepciones_motivo_largo" CHECK (char_length("motivo") <= 200);
  END IF;
END
$$;

-- Autor de la excepción: la membresía que la fijó resuelta a su usuario global. ON DELETE SET NULL:
-- si el usuario se elimina, la excepción queda sin autor pero no se borra (la fila sigue vigente).
ALTER TABLE "core"."permiso_excepciones" ADD COLUMN IF NOT EXISTS "creado_por" UUID;

CREATE INDEX IF NOT EXISTS "permiso_excepciones_creado_por_idx"
  ON "core"."permiso_excepciones"("creado_por");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'permiso_excepciones_creado_por_fkey'
  ) THEN
    ALTER TABLE "core"."permiso_excepciones"
      ADD CONSTRAINT "permiso_excepciones_creado_por_fkey"
      FOREIGN KEY ("creado_por") REFERENCES "core"."users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

-- RLS, la política `tenant_isolation` para opai_app y el trigger `mismo_tenant` ya están puestos por
-- 20261026160000_roles_permisos_finos y no cambian. `creado_por` apunta a `users` (global, sin
-- tenant): no necesita verificación de mismo tenant.
