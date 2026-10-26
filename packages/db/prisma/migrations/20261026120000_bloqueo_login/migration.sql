-- B1 · Bloqueo de login persistido (Brief 07c). Estado de bloqueo por fuerza bruta e intentos de
-- login, colgando de la identidad global `users`: sin tenant_id ni RLS, como `users`/`sessions`.
-- Los GRANT a `opai_app` los da `ALTER DEFAULT PRIVILEGES IN SCHEMA "core"` de la migración inicial
-- (estas tablas las crea el rol propietario de la migración), así que no se repiten aquí.

-- CreateTable
CREATE TABLE "core"."login_bloqueos" (
    "user_id" UUID NOT NULL,
    "fallos" INTEGER NOT NULL DEFAULT 0,
    "bloqueado_hasta" TIMESTAMPTZ(6),
    "ultimo_intento" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "login_bloqueos_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "core"."login_intentos" (
    "id" UUID NOT NULL,
    "correo_hash" TEXT NOT NULL,
    "user_id" UUID,
    "exito" BOOLEAN NOT NULL,
    "motivo" TEXT,
    "ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_intentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "login_intentos_correo_hash_created_at_idx" ON "core"."login_intentos"("correo_hash", "created_at");

-- CreateIndex
CREATE INDEX "login_intentos_user_id_created_at_idx" ON "core"."login_intentos"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "core"."login_bloqueos" ADD CONSTRAINT "login_bloqueos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "core"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
