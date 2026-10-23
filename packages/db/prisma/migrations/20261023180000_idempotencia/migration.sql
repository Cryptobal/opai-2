-- Brief 02 · idempotencia real de escrituras (ADR-034): clave por actor con huella del input.
-- CreateTable
CREATE TABLE "core"."idempotencias" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "actor" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "capability" TEXT NOT NULL,
    "huella" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'en_curso',
    "resultado" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "idempotencias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idempotencias_tenant_id_created_at_idx" ON "core"."idempotencias"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "idempotencias_tenant_id_actor_clave_key" ON "core"."idempotencias"("tenant_id", "actor", "clave");

-- AddForeignKey
ALTER TABLE "core"."idempotencias" ADD CONSTRAINT "idempotencias_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "core"."idempotencias" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."idempotencias" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
