-- Firma electrónica del núcleo (firma.md §3/§4/§6/§7, ADR-019, ADR-023, ADR-039). CAR-82 · PR 1.
-- Schema propio `core_firma`. Toda tabla con tenant_id lleva RLS `tenant_isolation` para opai_app
-- (NOBYPASSRLS). La FK de tenant_id a core.tenants va aquí (los modelos no llevan @relation a
-- Tenant). Las referencias al mismo tenant se verifican por trigger (reutiliza
-- core.verificar_mismo_tenant). La evidencia es un hecho inmutable (R17): opai_app no puede
-- UPDATE/DELETE sobre ella y cada fila enlaza un eslabón de la bitácora encadenada (core.bitacora).
--
-- Fecha posterior a la última migración de main (20261029010000): cada tabla nueva se crea después
-- de force_rls, así que lleva ENABLE + FORCE ROW LEVEL SECURITY.
BEGIN;
SET LOCAL lock_timeout = '5s';

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "core_firma";

-- CreateTable
CREATE TABLE "core_firma"."politicas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "clase" TEXT NOT NULL,
    "nivel_minimo" TEXT NOT NULL,
    "niveles_permitidos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "orden" TEXT NOT NULL DEFAULT 'secuencial',
    "plazo_dias" INTEGER NOT NULL DEFAULT 7,
    "recordar" BOOLEAN NOT NULL DEFAULT true,
    "actualizado_por_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "politicas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_firma"."solicitudes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "documento_id" UUID NOT NULL,
    "documento_version" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "clase" TEXT NOT NULL,
    "nivel" TEXT NOT NULL,
    "orden" TEXT NOT NULL DEFAULT 'secuencial',
    "estado" TEXT NOT NULL DEFAULT 'enviada',
    "mensaje" TEXT,
    "plazo_vence" TIMESTAMPTZ(6) NOT NULL,
    "enviada_por_tipo" TEXT NOT NULL,
    "enviada_por_id" UUID,
    "via_user_id" UUID,
    "motivo" TEXT,
    "bitacora_seq" INTEGER,
    "documento_firmado_id" UUID,
    "sha256_firmado" TEXT,
    "comprobante_token" TEXT,
    "completada_en" TIMESTAMPTZ(6),
    "cancelada_en" TIMESTAMPTZ(6),
    "recordada_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "solicitudes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_firma"."firmantes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "solicitud_id" UUID NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "rol" TEXT NOT NULL DEFAULT 'firma',
    "tipo" TEXT NOT NULL,
    "persona_id" UUID,
    "contacto_id" UUID,
    "usuario_id" UUID,
    "nombre" TEXT NOT NULL,
    "run" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "token" TEXT,
    "token_expira" TIMESTAMPTZ(6),
    "firma_automatica" BOOLEAN NOT NULL DEFAULT false,
    "visto_en" TIMESTAMPTZ(6),
    "firmado_en" TIMESTAMPTZ(6),
    "motivo_rechazo" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "firmantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable (hecho inmutable, R17; sin updated_at)
CREATE TABLE "core_firma"."evidencias" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "solicitud_id" UUID NOT NULL,
    "firmante_id" UUID,
    "tipo" TEXT NOT NULL,
    "nivel" TEXT,
    "metodo" TEXT,
    "ip" TEXT,
    "dispositivo" TEXT,
    "sha256" TEXT,
    "texto_aceptacion" TEXT,
    "version_aceptacion" TEXT,
    "bitacora_seq" INTEGER NOT NULL,
    "hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_firma"."aceptaciones_medio" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "persona_id" UUID NOT NULL,
    "aceptada" BOOLEAN NOT NULL DEFAULT false,
    "version" TEXT NOT NULL,
    "ip" TEXT,
    "aceptada_en" TIMESTAMPTZ(6),
    "revocada_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "aceptaciones_medio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_firma"."firmantes_empresa" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "run" TEXT,
    "cargo" TEXT,
    "nivel_maximo" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "firmantes_empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_firma"."autorizaciones_firma_automatica" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "firmante_empresa_id" UUID NOT NULL,
    "clase" TEXT NOT NULL,
    "vigencia_desde" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vigencia_hasta" TIMESTAMPTZ(6),
    "revocada_en" TIMESTAMPTZ(6),
    "autorizada_por_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "autorizaciones_firma_automatica_pkey" PRIMARY KEY ("id")
);

-- CreateTable (append + update de intentos/usado_en; sin updated_at)
CREATE TABLE "core_firma"."codigos_otp" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "firmante_id" UUID NOT NULL,
    "codigo_hash" TEXT NOT NULL,
    "canal" TEXT NOT NULL,
    "expira_en" TIMESTAMPTZ(6) NOT NULL,
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "usado_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "codigos_otp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "politicas_tenant_id_idx" ON "core_firma"."politicas"("tenant_id");
CREATE UNIQUE INDEX "politicas_tenant_id_clase_key" ON "core_firma"."politicas"("tenant_id", "clase");

-- CreateIndex
CREATE INDEX "solicitudes_tenant_id_estado_idx" ON "core_firma"."solicitudes"("tenant_id", "estado");
CREATE INDEX "solicitudes_tenant_id_documento_id_idx" ON "core_firma"."solicitudes"("tenant_id", "documento_id");
CREATE UNIQUE INDEX "solicitudes_comprobante_token_key" ON "core_firma"."solicitudes"("comprobante_token");

-- CreateIndex
CREATE INDEX "firmantes_tenant_id_solicitud_id_idx" ON "core_firma"."firmantes"("tenant_id", "solicitud_id");
CREATE UNIQUE INDEX "firmantes_token_key" ON "core_firma"."firmantes"("token");

-- CreateIndex
CREATE INDEX "evidencias_tenant_id_solicitud_id_idx" ON "core_firma"."evidencias"("tenant_id", "solicitud_id");

-- CreateIndex
CREATE UNIQUE INDEX "aceptaciones_medio_tenant_id_persona_id_key" ON "core_firma"."aceptaciones_medio"("tenant_id", "persona_id");

-- CreateIndex
CREATE UNIQUE INDEX "firmantes_empresa_tenant_id_usuario_id_key" ON "core_firma"."firmantes_empresa"("tenant_id", "usuario_id");

-- CreateIndex
CREATE INDEX "autorizaciones_firma_automatica_tenant_id_firmante_empresa_id_idx" ON "core_firma"."autorizaciones_firma_automatica"("tenant_id", "firmante_empresa_id");

-- CreateIndex
CREATE INDEX "codigos_otp_tenant_id_firmante_id_idx" ON "core_firma"."codigos_otp"("tenant_id", "firmante_id");

-- AddForeignKey (tenant_id -> core.tenants; la relación a Tenant no está en el schema Prisma, ADR-040)
ALTER TABLE "core_firma"."politicas" ADD CONSTRAINT "politicas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core_firma"."politicas" ADD CONSTRAINT "politicas_actualizado_por_id_fkey" FOREIGN KEY ("actualizado_por_id") REFERENCES "core"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "core_firma"."solicitudes" ADD CONSTRAINT "solicitudes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core_firma"."solicitudes" ADD CONSTRAINT "solicitudes_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "core"."documentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core_firma"."solicitudes" ADD CONSTRAINT "solicitudes_documento_firmado_id_fkey" FOREIGN KEY ("documento_firmado_id") REFERENCES "core"."documentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "core_firma"."solicitudes" ADD CONSTRAINT "solicitudes_enviada_por_id_fkey" FOREIGN KEY ("enviada_por_id") REFERENCES "core"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "core_firma"."solicitudes" ADD CONSTRAINT "solicitudes_via_user_id_fkey" FOREIGN KEY ("via_user_id") REFERENCES "core"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "core_firma"."firmantes" ADD CONSTRAINT "firmantes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core_firma"."firmantes" ADD CONSTRAINT "firmantes_solicitud_id_fkey" FOREIGN KEY ("solicitud_id") REFERENCES "core_firma"."solicitudes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "core_firma"."firmantes" ADD CONSTRAINT "firmantes_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "core"."personas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "core_firma"."firmantes" ADD CONSTRAINT "firmantes_contacto_id_fkey" FOREIGN KEY ("contacto_id") REFERENCES "core"."contactos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "core_firma"."firmantes" ADD CONSTRAINT "firmantes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "core"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "core_firma"."evidencias" ADD CONSTRAINT "evidencias_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core_firma"."evidencias" ADD CONSTRAINT "evidencias_solicitud_id_fkey" FOREIGN KEY ("solicitud_id") REFERENCES "core_firma"."solicitudes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "core_firma"."evidencias" ADD CONSTRAINT "evidencias_firmante_id_fkey" FOREIGN KEY ("firmante_id") REFERENCES "core_firma"."firmantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "core_firma"."aceptaciones_medio" ADD CONSTRAINT "aceptaciones_medio_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core_firma"."aceptaciones_medio" ADD CONSTRAINT "aceptaciones_medio_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "core"."personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "core_firma"."firmantes_empresa" ADD CONSTRAINT "firmantes_empresa_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core_firma"."firmantes_empresa" ADD CONSTRAINT "firmantes_empresa_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "core"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "core_firma"."autorizaciones_firma_automatica" ADD CONSTRAINT "autorizaciones_firma_automatica_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core_firma"."autorizaciones_firma_automatica" ADD CONSTRAINT "autorizaciones_firma_automatica_firmante_empresa_id_fkey" FOREIGN KEY ("firmante_empresa_id") REFERENCES "core_firma"."firmantes_empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "core_firma"."autorizaciones_firma_automatica" ADD CONSTRAINT "autorizaciones_firma_automatica_autorizada_por_id_fkey" FOREIGN KEY ("autorizada_por_id") REFERENCES "core"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core_firma"."codigos_otp" ADD CONSTRAINT "codigos_otp_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core_firma"."codigos_otp" ADD CONSTRAINT "codigos_otp_firmante_id_fkey" FOREIGN KEY ("firmante_id") REFERENCES "core_firma"."firmantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Permisos del rol de aplicación sobre el schema nuevo (REGLAS-codigo.md).
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA "core_firma" TO opai_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "core_firma" TO opai_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "core_firma" TO opai_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA "core_firma" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO opai_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA "core_firma" GRANT USAGE, SELECT ON SEQUENCES TO opai_app;

-- ---------------------------------------------------------------------------
-- Row-Level Security: una sola política tenant_isolation por tabla, TO opai_app.
-- ---------------------------------------------------------------------------
ALTER TABLE "core_firma"."politicas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core_firma"."politicas" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core_firma"."politicas" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core_firma"."solicitudes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core_firma"."solicitudes" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core_firma"."solicitudes" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core_firma"."firmantes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core_firma"."firmantes" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core_firma"."firmantes" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core_firma"."evidencias" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core_firma"."evidencias" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core_firma"."evidencias" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core_firma"."aceptaciones_medio" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core_firma"."aceptaciones_medio" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core_firma"."aceptaciones_medio" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core_firma"."firmantes_empresa" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core_firma"."firmantes_empresa" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core_firma"."firmantes_empresa" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core_firma"."autorizaciones_firma_automatica" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core_firma"."autorizaciones_firma_automatica" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core_firma"."autorizaciones_firma_automatica" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core_firma"."codigos_otp" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core_firma"."codigos_otp" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core_firma"."codigos_otp" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- ---------------------------------------------------------------------------
-- Referencias dentro del mismo tenant (las FK de Postgres no pasan por RLS). Reutiliza la función
-- del núcleo (core.verificar_mismo_tenant): pares (columna, tabla referida). Salta las columnas NULL
-- (CONTINUE WHEN ref IS NULL). Solo tablas con tenant_id; core.users es global y no se verifica.
-- ---------------------------------------------------------------------------
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core_firma"."solicitudes"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'documento_id', 'core.documentos', 'documento_firmado_id', 'core.documentos');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core_firma"."firmantes"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'solicitud_id', 'core_firma.solicitudes', 'persona_id', 'core.personas',
    'contacto_id', 'core.contactos');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core_firma"."evidencias"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'solicitud_id', 'core_firma.solicitudes', 'firmante_id', 'core_firma.firmantes');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core_firma"."aceptaciones_medio"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('persona_id', 'core.personas');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core_firma"."autorizaciones_firma_automatica"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'firmante_empresa_id', 'core_firma.firmantes_empresa');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core_firma"."codigos_otp"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('firmante_id', 'core_firma.firmantes');

-- ---------------------------------------------------------------------------
-- La evidencia de firma es un hecho inmutable (R17, ADR-023): opai_app no la actualiza ni la borra,
-- y un trigger lo refuerza también contra el dueño. Las correcciones son evidencias nuevas.
-- ---------------------------------------------------------------------------
REVOKE UPDATE, DELETE ON "core_firma"."evidencias" FROM opai_app;
CREATE OR REPLACE FUNCTION "core_firma"."evidencia_inmutable"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'core_firma.evidencias es append-only: % no permitido', TG_OP;
END
$$;
CREATE TRIGGER inmutable BEFORE UPDATE OR DELETE ON "core_firma"."evidencias"
  FOR EACH ROW EXECUTE FUNCTION "core_firma"."evidencia_inmutable"();
CREATE TRIGGER inmutable_statement BEFORE TRUNCATE ON "core_firma"."evidencias"
  FOR EACH STATEMENT EXECUTE FUNCTION "core_firma"."evidencia_inmutable"();

COMMIT;

-- Reversión (manual, solo referencia; Prisma no aplica down). Ejecutar con el rol propietario:
--   DROP SCHEMA "core_firma" CASCADE;
--   DROP FUNCTION IF EXISTS "core_firma"."evidencia_inmutable"();
-- No repone la evidencia ni las solicitudes borradas: la recuperación completa es desde el snapshot
-- de Neon tomado antes de aplicar (OPERACION-agentes.md A.5).
