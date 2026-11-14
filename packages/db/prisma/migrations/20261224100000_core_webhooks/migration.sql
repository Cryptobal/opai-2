-- CAR-352 (Estándares N-1): eventos salientes por empresa. Aditiva: dos tablas nuevas con RLS.
-- Tablas con tenant_id: RLS + FORCE + política tenant_isolation (docs/2.0/REGLAS-codigo.md).
BEGIN;
SET LOCAL lock_timeout = '5s';

-- CreateTable
CREATE TABLE "core"."webhook_destinos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "descripcion" TEXT,
    "eventos" TEXT[],
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "secreto_cifrado" BYTEA NOT NULL,
    "secreto_iv" BYTEA NOT NULL,
    "secreto_tag" BYTEA NOT NULL,
    "secreto_sufijo" TEXT NOT NULL,
    "secreto_rotado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creado_por" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "webhook_destinos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."webhook_entregas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "destino_id" UUID NOT NULL,
    "evento_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "proximo_intento_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimo_codigo" INTEGER,
    "ultimo_error" TEXT,
    "duracion_ms" INTEGER,
    "entregada_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "webhook_entregas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "webhook_destinos_tenant_id_idx" ON "core"."webhook_destinos"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_destinos_tenant_id_id_key" ON "core"."webhook_destinos"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "webhook_entregas_tenant_id_estado_proximo_intento_en_idx" ON "core"."webhook_entregas"("tenant_id", "estado", "proximo_intento_en");

-- CreateIndex
CREATE INDEX "webhook_entregas_tenant_id_destino_id_created_at_idx" ON "core"."webhook_entregas"("tenant_id", "destino_id", "created_at");

-- CreateIndex
CREATE INDEX "webhook_entregas_evento_id_idx" ON "core"."webhook_entregas"("evento_id");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_entregas_tenant_id_destino_id_evento_id_key" ON "core"."webhook_entregas"("tenant_id", "destino_id", "evento_id");

-- AddForeignKey
ALTER TABLE "core"."webhook_destinos" ADD CONSTRAINT "webhook_destinos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."webhook_entregas" ADD CONSTRAINT "webhook_entregas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."webhook_entregas" ADD CONSTRAINT "webhook_entregas_tenant_id_destino_id_fkey" FOREIGN KEY ("tenant_id", "destino_id") REFERENCES "core"."webhook_destinos"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."webhook_entregas" ADD CONSTRAINT "webhook_entregas_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "core"."eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Reglas que la base sostiene aunque falle la validación de la capacidad.
ALTER TABLE "core"."webhook_destinos" ADD CONSTRAINT "webhook_destinos_url_https"
  CHECK ("url" LIKE 'https://%' AND length("url") <= 2048);
ALTER TABLE "core"."webhook_destinos" ADD CONSTRAINT "webhook_destinos_eventos_no_vacio"
  CHECK (cardinality("eventos") >= 1);
ALTER TABLE "core"."webhook_entregas" ADD CONSTRAINT "webhook_entregas_estado"
  CHECK ("estado" IN ('pendiente', 'ok', 'error'));

ALTER TABLE "core"."webhook_destinos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."webhook_destinos" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."webhook_destinos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core"."webhook_entregas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."webhook_entregas" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."webhook_entregas" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

COMMIT;

-- Reversión: las tablas son nuevas y nada más depende de ellas. En orden inverso:
-- DROP TABLE "core"."webhook_entregas"; DROP TABLE "core"."webhook_destinos";
-- (las políticas, los índices y las FK caen con cada tabla).
