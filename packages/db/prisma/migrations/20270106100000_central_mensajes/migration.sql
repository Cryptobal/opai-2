-- Central · CAR-471 (Brief 15b · PR 5): mensajes a la central y avisos con acuse (R16, R17, CA7).
-- Migración aditiva, sin datos: cinco tablas con RLS + FORCE + tenant_isolation, FK compuestas del
-- mismo tenant y trigger mismo_tenant. Mensajes, avisos y acuses son append-only (R18).
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "central"."hilos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "instalacion_id" UUID NOT NULL,
    "persona_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'enviado',
    "alerta_id" UUID,
    "consulta_vence_en" TIMESTAMPTZ(6),
    "cerrado_por_id" UUID,
    "cerrado_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "hilos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "hilos_tipo_check" CHECK ("tipo" IN ('novedad', 'consulta', 'urgencia')),
    CONSTRAINT "hilos_estado_check" CHECK ("estado" IN ('enviado', 'recibido', 'respondido', 'cerrado')),
    CONSTRAINT "hilos_cerrado_check" CHECK (("estado" = 'cerrado') = ("cerrado_en" IS NOT NULL)),
    CONSTRAINT "hilos_consulta_check" CHECK ("consulta_vence_en" IS NULL OR "tipo" = 'consulta')
);

CREATE TABLE "central"."hilo_mensajes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "hilo_id" UUID NOT NULL,
    "autor_tipo" TEXT NOT NULL,
    "autor_id" UUID,
    "texto" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "hilo_mensajes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "hilo_mensajes_autor_check" CHECK ("autor_tipo" IN ('persona', 'central', 'agente')),
    CONSTRAINT "hilo_mensajes_texto_check" CHECK (char_length("texto") <= 1000)
);

CREATE TABLE "central"."avisos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "acuse_obligatorio" BOOLEAN NOT NULL,
    "plazo_min" INTEGER,
    "vigente_desde" TIMESTAMPTZ(6),
    "vigente_hasta" TIMESTAMPTZ(6),
    "enviado_por_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "avisos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "avisos_tipo_check" CHECK ("tipo" IN ('consigna', 'cambio_turno', 'instruccion')),
    CONSTRAINT "avisos_texto_check" CHECK (char_length("texto") BETWEEN 1 AND 2000),
    CONSTRAINT "avisos_plazo_check" CHECK ("acuse_obligatorio" = ("plazo_min" IS NOT NULL)
      AND ("plazo_min" IS NULL OR "plazo_min" BETWEEN 5 AND 1440)),
    CONSTRAINT "avisos_vigencia_check" CHECK ("vigente_hasta" IS NULL OR "vigente_desde" IS NULL OR "vigente_hasta" > "vigente_desde")
);

CREATE TABLE "central"."aviso_destinatarios" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "aviso_id" UUID NOT NULL,
    "persona_id" UUID NOT NULL,
    "instalacion_id" UUID,
    "vence_en" TIMESTAMPTZ(6),
    "alerta_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "aviso_destinatarios_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "central"."acuses" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "aviso_id" UUID NOT NULL,
    "persona_id" UUID NOT NULL,
    "tarde" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "acuses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "hilos_tenant_id_id_key" ON "central"."hilos"("tenant_id", "id");
CREATE INDEX "hilos_tenant_id_estado_idx" ON "central"."hilos"("tenant_id", "estado");
CREATE INDEX "hilos_tenant_id_persona_id_idx" ON "central"."hilos"("tenant_id", "persona_id");
CREATE INDEX "hilo_mensajes_tenant_id_hilo_id_idx" ON "central"."hilo_mensajes"("tenant_id", "hilo_id");
CREATE UNIQUE INDEX "avisos_tenant_id_id_key" ON "central"."avisos"("tenant_id", "id");
CREATE INDEX "avisos_tenant_id_idx" ON "central"."avisos"("tenant_id");
CREATE UNIQUE INDEX "aviso_destinatarios_tenant_id_aviso_id_persona_id_key"
  ON "central"."aviso_destinatarios"("tenant_id", "aviso_id", "persona_id");
CREATE INDEX "aviso_destinatarios_tenant_id_persona_id_idx" ON "central"."aviso_destinatarios"("tenant_id", "persona_id");
CREATE UNIQUE INDEX "acuses_tenant_id_aviso_id_persona_id_key" ON "central"."acuses"("tenant_id", "aviso_id", "persona_id");

-- Claves foráneas: tenant, referencias del núcleo y compuestas dentro del mismo tenant.
ALTER TABLE "central"."hilos"
  ADD CONSTRAINT "hilos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "hilos_instalacion_id_fkey" FOREIGN KEY ("instalacion_id") REFERENCES "core"."instalaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "hilos_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "core"."personas"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "hilos_tenant_id_alerta_id_fkey" FOREIGN KEY ("tenant_id", "alerta_id") REFERENCES "central"."alertas"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "hilos_cerrado_por_id_fkey" FOREIGN KEY ("cerrado_por_id") REFERENCES "core"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "central"."hilo_mensajes"
  ADD CONSTRAINT "hilo_mensajes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "hilo_mensajes_tenant_id_hilo_id_fkey" FOREIGN KEY ("tenant_id", "hilo_id") REFERENCES "central"."hilos"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "hilo_mensajes_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "core"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "central"."avisos"
  ADD CONSTRAINT "avisos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "avisos_enviado_por_id_fkey" FOREIGN KEY ("enviado_por_id") REFERENCES "core"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "central"."aviso_destinatarios"
  ADD CONSTRAINT "aviso_destinatarios_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "aviso_destinatarios_tenant_id_aviso_id_fkey" FOREIGN KEY ("tenant_id", "aviso_id") REFERENCES "central"."avisos"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "aviso_destinatarios_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "core"."personas"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "aviso_destinatarios_instalacion_id_fkey" FOREIGN KEY ("instalacion_id") REFERENCES "core"."instalaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "aviso_destinatarios_tenant_id_alerta_id_fkey" FOREIGN KEY ("tenant_id", "alerta_id") REFERENCES "central"."alertas"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "central"."acuses"
  ADD CONSTRAINT "acuses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "acuses_tenant_id_aviso_id_fkey" FOREIGN KEY ("tenant_id", "aviso_id") REFERENCES "central"."avisos"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "acuses_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "core"."personas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Las referencias simples al núcleo siempre apuntan a la misma empresa.
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "central"."hilos"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('instalacion_id', 'core.instalaciones', 'persona_id', 'core.personas');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "central"."aviso_destinatarios"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('persona_id', 'core.personas', 'instalacion_id', 'core.instalaciones');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "central"."acuses"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('persona_id', 'core.personas');

-- Append-only (R18): mensajes, avisos enviados y acuses no se editan ni se borran.
CREATE TRIGGER "hilo_mensajes_sin_update_delete" BEFORE UPDATE OR DELETE ON "central"."hilo_mensajes"
  FOR EACH ROW EXECUTE FUNCTION "central"."alerta_eventos_inmutable"();
CREATE TRIGGER "hilo_mensajes_sin_truncate" BEFORE TRUNCATE ON "central"."hilo_mensajes"
  FOR EACH STATEMENT EXECUTE FUNCTION "central"."alerta_eventos_inmutable"();
CREATE TRIGGER "avisos_sin_update_delete" BEFORE UPDATE OR DELETE ON "central"."avisos"
  FOR EACH ROW EXECUTE FUNCTION "central"."alerta_eventos_inmutable"();
CREATE TRIGGER "avisos_sin_truncate" BEFORE TRUNCATE ON "central"."avisos"
  FOR EACH STATEMENT EXECUTE FUNCTION "central"."alerta_eventos_inmutable"();
CREATE TRIGGER "acuses_sin_update_delete" BEFORE UPDATE OR DELETE ON "central"."acuses"
  FOR EACH ROW EXECUTE FUNCTION "central"."alerta_eventos_inmutable"();
CREATE TRIGGER "acuses_sin_truncate" BEFORE TRUNCATE ON "central"."acuses"
  FOR EACH STATEMENT EXECUTE FUNCTION "central"."alerta_eventos_inmutable"();

ALTER TABLE "central"."hilos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "central"."hilos" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "central"."hilos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
ALTER TABLE "central"."hilo_mensajes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "central"."hilo_mensajes" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "central"."hilo_mensajes" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
ALTER TABLE "central"."avisos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "central"."avisos" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "central"."avisos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
ALTER TABLE "central"."aviso_destinatarios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "central"."aviso_destinatarios" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "central"."aviso_destinatarios" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
ALTER TABLE "central"."acuses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "central"."acuses" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "central"."acuses" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "central"."hilos", "central"."hilo_mensajes", "central"."avisos",
  "central"."aviso_destinatarios", "central"."acuses" TO opai_app;
REVOKE UPDATE, DELETE, TRUNCATE ON "central"."hilo_mensajes", "central"."avisos", "central"."acuses" FROM opai_app;
REVOKE DELETE, TRUNCATE ON "central"."hilos", "central"."aviso_destinatarios" FROM opai_app;

COMMIT;

-- Reversión: DROP TABLE IF EXISTS "central"."acuses", "central"."aviso_destinatarios", "central"."avisos",
-- "central"."hilo_mensajes", "central"."hilos";
