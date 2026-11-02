-- CAR-144 · Propuesta técnica v2: biblioteca, armador, envío congelado (aditivo, reversible).
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "cpq"."plantillas_documento" ADD COLUMN IF NOT EXISTS "nombre_visible" TEXT;
ALTER TABLE "cpq"."plantillas_documento" ADD COLUMN IF NOT EXISTS "apertura_maxima" TEXT;

ALTER TABLE "cpq"."plantillas_documento" DROP CONSTRAINT IF EXISTS "plantillas_documento_tipo_check";
ALTER TABLE "cpq"."plantillas_documento" ADD CONSTRAINT "plantillas_documento_tipo_check"
  CHECK ("tipo" IN ('cotizacion', 'propuesta_tecnica'));

ALTER TABLE "cpq"."plantillas_documento" DROP CONSTRAINT IF EXISTS "plantillas_documento_apertura_maxima_check";
ALTER TABLE "cpq"."plantillas_documento" ADD CONSTRAINT "plantillas_documento_apertura_maxima_check"
  CHECK ("apertura_maxima" IS NULL OR "apertura_maxima" IN ('por_instalacion', 'por_categoria', 'por_item'));

DROP INDEX IF EXISTS "cpq"."plantillas_documento_una_activa_cotizacion";
CREATE UNIQUE INDEX "plantillas_documento_una_activa_cotizacion" ON "cpq"."plantillas_documento"("tenant_id", "tipo")
  WHERE "activa" AND "tipo" = 'cotizacion';
CREATE UNIQUE INDEX "plantillas_documento_una_activa_propuesta" ON "cpq"."plantillas_documento"("tenant_id", "tipo")
  WHERE "activa" AND "tipo" = 'propuesta_tecnica';

CREATE TABLE "cpq"."biblioteca_bloques" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "clave" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "version_publicada" INTEGER NOT NULL DEFAULT 0,
    "contenido_json" TEXT NOT NULL,
    "fijo" BOOLEAN NOT NULL DEFAULT false,
    "opcional" BOOLEAN NOT NULL DEFAULT true,
    "creado_por_id" UUID NOT NULL,
    "publicado_por_id" UUID,
    "publicado_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "biblioteca_bloques_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "biblioteca_bloques_estado_check" CHECK ("estado" IN ('borrador', 'publicado')),
    CONSTRAINT "biblioteca_bloques_tipo_check" CHECK ("tipo" IN (
      'portada', 'indice', 'seccion_institucional', 'comprension_servicio', 'detalle_servicio',
      'resumen_economico', 'condiciones', 'incluye_exclusiones', 'metodologia', 'contacto_ejecutivo',
      'certificaciones', 'clientes_referencia', 'texto_libre', 'salto_pagina'
    ))
);

CREATE UNIQUE INDEX "biblioteca_bloques_tenant_id_clave_key" ON "cpq"."biblioteca_bloques"("tenant_id", "clave");
CREATE INDEX "biblioteca_bloques_tenant_id_tipo_idx" ON "cpq"."biblioteca_bloques"("tenant_id", "tipo");

CREATE TABLE "cpq"."biblioteca_bloque_revisiones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "bloque_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "contenido_json" TEXT NOT NULL,
    "creado_por_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "biblioteca_bloque_revisiones_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "biblioteca_bloque_revisiones_bloque_id_version_key" UNIQUE ("bloque_id", "version")
);

CREATE TABLE "cpq"."propuestas_tecnicas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "cotizacion_id" UUID NOT NULL,
    "version_id" UUID NOT NULL,
    "base" TEXT NOT NULL DEFAULT 'clasica',
    "plantilla_documento_id" UUID,
    "plantilla_documento_version" INTEGER,
    "marca_documento_version" INTEGER,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "bloques_json" TEXT NOT NULL,
    "servicio_huella_json" TEXT,
    "servicio_editado_json" TEXT,
    "editado_para_cliente" BOOLEAN NOT NULL DEFAULT false,
    "creado_por_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "propuestas_tecnicas_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "propuestas_tecnicas_version_id_key" UNIQUE ("version_id"),
    CONSTRAINT "propuestas_tecnicas_base_check" CHECK ("base" IN ('clasica', 'ejecutiva', 'compacta')),
    CONSTRAINT "propuestas_tecnicas_estado_check" CHECK ("estado" IN ('borrador', 'congelada'))
);

CREATE INDEX "propuestas_tecnicas_tenant_id_cotizacion_id_idx" ON "cpq"."propuestas_tecnicas"("tenant_id", "cotizacion_id");

CREATE TABLE "cpq"."propuesta_envios" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "cotizacion_id" UUID NOT NULL,
    "version_id" UUID NOT NULL,
    "propuesta_tecnica_id" UUID,
    "estado" TEXT NOT NULL DEFAULT 'pendiente_aprobacion',
    "incluye_cotizacion" BOOLEAN NOT NULL DEFAULT true,
    "incluye_propuesta" BOOLEAN NOT NULL DEFAULT false,
    "destinatarios_json" TEXT NOT NULL,
    "snapshot_json" TEXT NOT NULL,
    "mensaje" TEXT,
    "solicitado_por_id" UUID NOT NULL,
    "aprobado_por_id" UUID,
    "enviado_en" TIMESTAMPTZ(6),
    "documento_cotizacion_id" UUID,
    "documento_propuesta_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "propuesta_envios_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "propuesta_envios_estado_check" CHECK ("estado" IN ('pendiente_aprobacion', 'enviado', 'cancelado'))
);

CREATE INDEX "propuesta_envios_tenant_id_cotizacion_id_idx" ON "cpq"."propuesta_envios"("tenant_id", "cotizacion_id");
CREATE INDEX "propuesta_envios_tenant_id_estado_idx" ON "cpq"."propuesta_envios"("tenant_id", "estado");

ALTER TABLE "cpq"."biblioteca_bloques" ADD CONSTRAINT "biblioteca_bloques_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cpq"."biblioteca_bloque_revisiones" ADD CONSTRAINT "biblioteca_bloque_revisiones_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cpq"."biblioteca_bloque_revisiones" ADD CONSTRAINT "biblioteca_bloque_revisiones_bloque_id_fkey"
  FOREIGN KEY ("bloque_id") REFERENCES "cpq"."biblioteca_bloques"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cpq"."propuestas_tecnicas" ADD CONSTRAINT "propuestas_tecnicas_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cpq"."propuestas_tecnicas" ADD CONSTRAINT "propuestas_tecnicas_cotizacion_id_fkey"
  FOREIGN KEY ("cotizacion_id") REFERENCES "cpq"."cotizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cpq"."propuestas_tecnicas" ADD CONSTRAINT "propuestas_tecnicas_version_id_fkey"
  FOREIGN KEY ("version_id") REFERENCES "cpq"."versiones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cpq"."propuestas_tecnicas" ADD CONSTRAINT "propuestas_tecnicas_plantilla_documento_id_fkey"
  FOREIGN KEY ("plantilla_documento_id") REFERENCES "cpq"."plantillas_documento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cpq"."propuesta_envios" ADD CONSTRAINT "propuesta_envios_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cpq"."propuesta_envios" ADD CONSTRAINT "propuesta_envios_propuesta_tecnica_id_fkey"
  FOREIGN KEY ("propuesta_tecnica_id") REFERENCES "cpq"."propuestas_tecnicas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "cpq"."biblioteca_bloques" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cpq"."biblioteca_bloques" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "cpq"."biblioteca_bloques" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "cpq"."biblioteca_bloque_revisiones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cpq"."biblioteca_bloque_revisiones" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "cpq"."biblioteca_bloque_revisiones" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "cpq"."propuestas_tecnicas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cpq"."propuestas_tecnicas" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "cpq"."propuestas_tecnicas" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "cpq"."propuesta_envios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cpq"."propuesta_envios" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "cpq"."propuesta_envios" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "cpq"."biblioteca_bloque_revisiones"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('bloque_id', 'cpq.biblioteca_bloques');
CREATE TRIGGER mismo_tenant_propuesta_cotizacion BEFORE INSERT OR UPDATE ON "cpq"."propuestas_tecnicas"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('cotizacion_id', 'cpq.cotizaciones');
CREATE TRIGGER mismo_tenant_propuesta_version BEFORE INSERT OR UPDATE ON "cpq"."propuestas_tecnicas"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('version_id', 'cpq.versiones');
CREATE TRIGGER mismo_tenant_propuesta_plantilla BEFORE INSERT OR UPDATE ON "cpq"."propuestas_tecnicas"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('plantilla_documento_id', 'cpq.plantillas_documento');
CREATE TRIGGER mismo_tenant_envio_propuesta BEFORE INSERT OR UPDATE ON "cpq"."propuesta_envios"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('propuesta_tecnica_id', 'cpq.propuestas_tecnicas');

COMMIT;

-- Reversión manual (rol propietario; restaurar desde snapshot Neon si hay datos):
-- DROP TRIGGER IF EXISTS mismo_tenant_envio_propuesta ON "cpq"."propuesta_envios";
-- DROP TRIGGER IF EXISTS mismo_tenant_propuesta_plantilla ON "cpq"."propuestas_tecnicas";
-- DROP TRIGGER IF EXISTS mismo_tenant_propuesta_version ON "cpq"."propuestas_tecnicas";
-- DROP TRIGGER IF EXISTS mismo_tenant_propuesta_cotizacion ON "cpq"."propuestas_tecnicas";
-- DROP TRIGGER IF EXISTS mismo_tenant ON "cpq"."biblioteca_bloque_revisiones";
-- DROP TABLE IF EXISTS "cpq"."propuesta_envios";
-- DROP TABLE IF EXISTS "cpq"."propuestas_tecnicas";
-- DROP TABLE IF EXISTS "cpq"."biblioteca_bloque_revisiones";
-- DROP TABLE IF EXISTS "cpq"."biblioteca_bloques";
-- DROP INDEX IF EXISTS "cpq"."plantillas_documento_una_activa_propuesta";
-- CREATE UNIQUE INDEX "plantillas_documento_una_activa_cotizacion" ON "cpq"."plantillas_documento"("tenant_id", "tipo") WHERE "activa" AND "tipo" = 'cotizacion';
-- ALTER TABLE "cpq"."plantillas_documento" DROP CONSTRAINT IF EXISTS "plantillas_documento_apertura_maxima_check";
-- ALTER TABLE "cpq"."plantillas_documento" DROP CONSTRAINT IF EXISTS "plantillas_documento_tipo_check";
-- ALTER TABLE "cpq"."plantillas_documento" ADD CONSTRAINT "plantillas_documento_tipo_check" CHECK ("tipo" IN ('cotizacion'));
-- ALTER TABLE "cpq"."plantillas_documento" DROP COLUMN IF EXISTS "apertura_maxima", DROP COLUMN IF EXISTS "nombre_visible";
