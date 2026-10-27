-- NÚCLEO-F · Segundo factor (MFA) con el plugin twoFactor de Better Auth.
-- Tablas de identidad (como `users`): sin tenant_id ni RLS. `secret` y `backup_codes` los cifra el
-- plugin con BETTER_AUTH_SECRET; no hay secreto nuevo. Idempotente: se puede reaplicar sin error.

-- AlterTable: marca de segundo factor activo en el usuario.
ALTER TABLE "core"."users" ADD COLUMN IF NOT EXISTS "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: una fila por usuario con el secreto TOTP, los códigos de respaldo y el bloqueo por
-- cuenta del paso de verificación (failed_verification_count / locked_until, accountLockout del plugin).
CREATE TABLE IF NOT EXISTS "core"."two_factor" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "secret" TEXT NOT NULL,
    "backup_codes" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT true,
    "failed_verification_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(6),

    CONSTRAINT "two_factor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: una configuración de segundo factor por usuario.
CREATE UNIQUE INDEX IF NOT EXISTS "two_factor_user_id_key" ON "core"."two_factor"("user_id");

-- AddForeignKey: al borrar el usuario se borra su segundo factor.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'two_factor_user_id_fkey'
  ) THEN
    ALTER TABLE "core"."two_factor" ADD CONSTRAINT "two_factor_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "core"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Las tablas nuevas ya quedan cubiertas por ALTER DEFAULT PRIVILEGES de la migración inicial; se
-- repite el GRANT explícito para que la migración no dependa de quién la aplique. opai_app hace el
-- CRUD del segundo factor directamente (el plugin lee, inserta, actualiza y borra la fila).
GRANT SELECT, INSERT, UPDATE, DELETE ON "core"."two_factor" TO opai_app;
