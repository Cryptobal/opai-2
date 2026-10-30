-- Brief 10 · CPQ PR 10.1: schema `cpq` con cotizaciones, versiones, secciones, líneas y aprobaciones
-- (cpq.md §2, §4, R18, R40, R54). Migración ADITIVA e IDEMPOTENTE: solo crea objetos nuevos, cada uno
-- con IF NOT EXISTS o con su guarda en un bloque DO, sin DROP ni cambios en tablas existentes; correrla
-- dos veces no falla ni duplica nada. Toda tabla con tenant_id lleva RLS `tenant_isolation`
-- (ENABLE + FORCE) para opai_app, que es NOBYPASSRLS; no se concede BYPASSRLS a nadie. El correlativo
-- CPQ-AAAA-NNN es único por tenant (índice parcial por año y número) y la capacidad lo toma bajo
-- advisory lock por tenant y año (R54). Sin migración de datos: el schema es nuevo.

BEGIN;
SET LOCAL lock_timeout = '5s';

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "cpq";

-- CreateTable
CREATE TABLE IF NOT EXISTS "cpq"."cotizaciones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "negocio_id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "numero" INTEGER,
    "titulo" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "vigente" BOOLEAN NOT NULL DEFAULT false,
    "alternativa_de_id" UUID,
    "creada_por" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cotizaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "cpq"."versiones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "cotizacion_id" UUID NOT NULL,
    "numero" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "moneda" TEXT NOT NULL DEFAULT 'UF',
    "valida_hasta" DATE NOT NULL,
    "modo_margen" TEXT NOT NULL DEFAULT 'margen_sobre_venta',
    "margen_objetivo" INTEGER NOT NULL,
    "precio_manual" INTEGER,
    "venta_mensual" INTEGER,
    "pagos_unicos" INTEGER,
    "costo_mensual" INTEGER,
    "margen_efectivo" INTEGER,
    "uf_valor" INTEGER,
    "uf_fecha" DATE,
    "modelo_version_id" UUID,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "enviada_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "versiones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "cpq"."secciones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "version_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "instalacion_id" UUID,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "secciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "cpq"."lineas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "version_id" UUID NOT NULL,
    "seccion_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "grupo" TEXT,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "habilitada" BOOLEAN NOT NULL DEFAULT true,
    "visible_cliente" BOOLEAN NOT NULL DEFAULT true,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "cargo_id" UUID,
    "patron_id" UUID,
    "horario" JSONB,
    "personas_por_posicion" INTEGER,
    "motivo_personas" TEXT,
    "sueldo_bruto" INTEGER,
    "costo_unitario" INTEGER,
    "recurrencia" TEXT NOT NULL DEFAULT 'mensual',
    "margen_propio" INTEGER,
    "item_copia" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "lineas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "cpq"."aprobaciones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "version_id" UUID NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "motivo" TEXT NOT NULL,
    "solicitada_por" UUID,
    "comentario" TEXT,
    "decidida_por" UUID,
    "motivo_decision" TEXT,
    "venta_mensual" INTEGER,
    "margen_efectivo" INTEGER,
    "decidida_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "aprobaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "cotizaciones_tenant_id_negocio_id_idx" ON "cpq"."cotizaciones"("tenant_id", "negocio_id");
CREATE INDEX IF NOT EXISTS "cotizaciones_tenant_id_estado_idx" ON "cpq"."cotizaciones"("tenant_id", "estado");
CREATE UNIQUE INDEX IF NOT EXISTS "cotizaciones_tenant_id_codigo_key" ON "cpq"."cotizaciones"("tenant_id", "codigo");
CREATE INDEX IF NOT EXISTS "versiones_tenant_id_cotizacion_id_idx" ON "cpq"."versiones"("tenant_id", "cotizacion_id");
CREATE UNIQUE INDEX IF NOT EXISTS "versiones_tenant_id_cotizacion_id_numero_key" ON "cpq"."versiones"("tenant_id", "cotizacion_id", "numero");
CREATE INDEX IF NOT EXISTS "secciones_tenant_id_version_id_idx" ON "cpq"."secciones"("tenant_id", "version_id");
CREATE INDEX IF NOT EXISTS "lineas_tenant_id_version_id_idx" ON "cpq"."lineas"("tenant_id", "version_id");
CREATE INDEX IF NOT EXISTS "lineas_tenant_id_seccion_id_idx" ON "cpq"."lineas"("tenant_id", "seccion_id");
CREATE INDEX IF NOT EXISTS "aprobaciones_tenant_id_version_id_idx" ON "cpq"."aprobaciones"("tenant_id", "version_id");
-- Correlativo único por tenant y año (R54); los códigos de 1.0 con sufijo llevan numero NULL.
CREATE UNIQUE INDEX IF NOT EXISTS "cotizaciones_tenant_id_anio_numero_key" ON "cpq"."cotizaciones"("tenant_id", "anio", "numero") WHERE "numero" IS NOT NULL;
-- Una sola versión editable por cotización (R43, cpq.md §4).
CREATE UNIQUE INDEX IF NOT EXISTS "versiones_una_editable_key" ON "cpq"."versiones"("tenant_id", "cotizacion_id") WHERE "estado" IN ('borrador', 'en_aprobacion', 'lista');
-- Una sección por instalación y una sola Común por versión (R18).
CREATE UNIQUE INDEX IF NOT EXISTS "secciones_version_id_instalacion_id_key" ON "cpq"."secciones"("tenant_id", "version_id", "instalacion_id") WHERE "instalacion_id" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "secciones_version_id_comun_key" ON "cpq"."secciones"("tenant_id", "version_id") WHERE "tipo" = 'comun';
-- Una vigente por negocio (cpq.md §4) y un solo pedido de aprobación pendiente por versión (R42).
CREATE UNIQUE INDEX IF NOT EXISTS "cotizaciones_negocio_vigente_key" ON "cpq"."cotizaciones"("tenant_id", "negocio_id") WHERE "vigente";
CREATE UNIQUE INDEX IF NOT EXISTS "aprobaciones_version_pendiente_key" ON "cpq"."aprobaciones"("tenant_id", "version_id") WHERE "estado" = 'pendiente';

-- AddForeignKey (con guarda: idempotente)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cotizaciones_tenant_id_fkey' AND conrelid = '"cpq"."cotizaciones"'::regclass) THEN
    ALTER TABLE "cpq"."cotizaciones" ADD CONSTRAINT "cotizaciones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'versiones_tenant_id_fkey' AND conrelid = '"cpq"."versiones"'::regclass) THEN
    ALTER TABLE "cpq"."versiones" ADD CONSTRAINT "versiones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'secciones_tenant_id_fkey' AND conrelid = '"cpq"."secciones"'::regclass) THEN
    ALTER TABLE "cpq"."secciones" ADD CONSTRAINT "secciones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lineas_tenant_id_fkey' AND conrelid = '"cpq"."lineas"'::regclass) THEN
    ALTER TABLE "cpq"."lineas" ADD CONSTRAINT "lineas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'aprobaciones_tenant_id_fkey' AND conrelid = '"cpq"."aprobaciones"'::regclass) THEN
    ALTER TABLE "cpq"."aprobaciones" ADD CONSTRAINT "aprobaciones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cotizaciones_negocio_id_fkey' AND conrelid = '"cpq"."cotizaciones"'::regclass) THEN
    ALTER TABLE "cpq"."cotizaciones" ADD CONSTRAINT "cotizaciones_negocio_id_fkey" FOREIGN KEY ("negocio_id") REFERENCES "comercial"."negocios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cotizaciones_alternativa_de_id_fkey' AND conrelid = '"cpq"."cotizaciones"'::regclass) THEN
    ALTER TABLE "cpq"."cotizaciones" ADD CONSTRAINT "cotizaciones_alternativa_de_id_fkey" FOREIGN KEY ("alternativa_de_id") REFERENCES "cpq"."cotizaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'versiones_cotizacion_id_fkey' AND conrelid = '"cpq"."versiones"'::regclass) THEN
    ALTER TABLE "cpq"."versiones" ADD CONSTRAINT "versiones_cotizacion_id_fkey" FOREIGN KEY ("cotizacion_id") REFERENCES "cpq"."cotizaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'secciones_version_id_fkey' AND conrelid = '"cpq"."secciones"'::regclass) THEN
    ALTER TABLE "cpq"."secciones" ADD CONSTRAINT "secciones_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "cpq"."versiones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'secciones_instalacion_id_fkey' AND conrelid = '"cpq"."secciones"'::regclass) THEN
    ALTER TABLE "cpq"."secciones" ADD CONSTRAINT "secciones_instalacion_id_fkey" FOREIGN KEY ("instalacion_id") REFERENCES "core"."instalaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lineas_version_id_fkey' AND conrelid = '"cpq"."lineas"'::regclass) THEN
    ALTER TABLE "cpq"."lineas" ADD CONSTRAINT "lineas_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "cpq"."versiones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lineas_seccion_id_fkey' AND conrelid = '"cpq"."lineas"'::regclass) THEN
    ALTER TABLE "cpq"."lineas" ADD CONSTRAINT "lineas_seccion_id_fkey" FOREIGN KEY ("seccion_id") REFERENCES "cpq"."secciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lineas_cargo_id_fkey' AND conrelid = '"cpq"."lineas"'::regclass) THEN
    ALTER TABLE "cpq"."lineas" ADD CONSTRAINT "lineas_cargo_id_fkey" FOREIGN KEY ("cargo_id") REFERENCES "core"."cargos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lineas_patron_id_fkey' AND conrelid = '"cpq"."lineas"'::regclass) THEN
    ALTER TABLE "cpq"."lineas" ADD CONSTRAINT "lineas_patron_id_fkey" FOREIGN KEY ("patron_id") REFERENCES "core"."patrones_turno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'aprobaciones_version_id_fkey' AND conrelid = '"cpq"."aprobaciones"'::regclass) THEN
    ALTER TABLE "cpq"."aprobaciones" ADD CONSTRAINT "aprobaciones_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "cpq"."versiones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Reglas de forma (estados de R40, moneda, modos de margen y montos no negativos)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cotizaciones_estado_check' AND conrelid = '"cpq"."cotizaciones"'::regclass) THEN
    ALTER TABLE "cpq"."cotizaciones" ADD CONSTRAINT "cotizaciones_estado_check" CHECK ("estado" IN ('borrador','en_aprobacion','lista','enviada','aceptada','rechazada','vencida','reemplazada','archivada'));
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cotizaciones_numero_check' AND conrelid = '"cpq"."cotizaciones"'::regclass) THEN
    ALTER TABLE "cpq"."cotizaciones" ADD CONSTRAINT "cotizaciones_numero_check" CHECK ("numero" IS NULL OR "numero" >= 1);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'versiones_estado_check' AND conrelid = '"cpq"."versiones"'::regclass) THEN
    ALTER TABLE "cpq"."versiones" ADD CONSTRAINT "versiones_estado_check" CHECK ("estado" IN ('borrador','en_aprobacion','lista','enviada','aceptada','rechazada','vencida','reemplazada','archivada'));
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'versiones_moneda_check' AND conrelid = '"cpq"."versiones"'::regclass) THEN
    ALTER TABLE "cpq"."versiones" ADD CONSTRAINT "versiones_moneda_check" CHECK ("moneda" IN ('CLP','UF'));
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'versiones_modo_margen_check' AND conrelid = '"cpq"."versiones"'::regclass) THEN
    ALTER TABLE "cpq"."versiones" ADD CONSTRAINT "versiones_modo_margen_check" CHECK ("modo_margen" IN ('margen_sobre_venta','markup','margen_sobre_mano_de_obra'));
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'versiones_margen_objetivo_check' AND conrelid = '"cpq"."versiones"'::regclass) THEN
    ALTER TABLE "cpq"."versiones" ADD CONSTRAINT "versiones_margen_objetivo_check" CHECK ("margen_objetivo" >= 0 AND "margen_objetivo" < 1000000);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'versiones_numero_check' AND conrelid = '"cpq"."versiones"'::regclass) THEN
    ALTER TABLE "cpq"."versiones" ADD CONSTRAINT "versiones_numero_check" CHECK ("numero" >= 1);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'secciones_tipo_check' AND conrelid = '"cpq"."secciones"'::regclass) THEN
    ALTER TABLE "cpq"."secciones" ADD CONSTRAINT "secciones_tipo_check" CHECK (("tipo" = 'instalacion' AND "instalacion_id" IS NOT NULL) OR ("tipo" = 'comun' AND "instalacion_id" IS NULL));
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lineas_tipo_check' AND conrelid = '"cpq"."lineas"'::regclass) THEN
    ALTER TABLE "cpq"."lineas" ADD CONSTRAINT "lineas_tipo_check" CHECK ("tipo" IN ('puesto','item','adicional'));
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lineas_recurrencia_check' AND conrelid = '"cpq"."lineas"'::regclass) THEN
    ALTER TABLE "cpq"."lineas" ADD CONSTRAINT "lineas_recurrencia_check" CHECK ("recurrencia" IN ('mensual','unico'));
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lineas_cantidad_check' AND conrelid = '"cpq"."lineas"'::regclass) THEN
    ALTER TABLE "cpq"."lineas" ADD CONSTRAINT "lineas_cantidad_check" CHECK ("cantidad" >= 1);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lineas_montos_check' AND conrelid = '"cpq"."lineas"'::regclass) THEN
    ALTER TABLE "cpq"."lineas" ADD CONSTRAINT "lineas_montos_check" CHECK (coalesce("sueldo_bruto",0) >= 0 AND coalesce("costo_unitario",0) >= 0);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lineas_margen_propio_check' AND conrelid = '"cpq"."lineas"'::regclass) THEN
    ALTER TABLE "cpq"."lineas" ADD CONSTRAINT "lineas_margen_propio_check" CHECK ("margen_propio" IS NULL OR ("margen_propio" >= 0 AND "margen_propio" < 1000000));
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'aprobaciones_estado_check' AND conrelid = '"cpq"."aprobaciones"'::regclass) THEN
    ALTER TABLE "cpq"."aprobaciones" ADD CONSTRAINT "aprobaciones_estado_check" CHECK ("estado" IN ('pendiente','aprobada','rechazada','retirada'));
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'aprobaciones_motivo_check' AND conrelid = '"cpq"."aprobaciones"'::regclass) THEN
    ALTER TABLE "cpq"."aprobaciones" ADD CONSTRAINT "aprobaciones_motivo_check" CHECK ("motivo" IN ('margen_bajo','subvalorada'));
  END IF;
END $$;

-- Permisos del rol de aplicación sobre el schema nuevo (REGLAS-codigo.md)
GRANT USAGE ON SCHEMA "cpq" TO opai_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "cpq" TO opai_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "cpq" TO opai_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA "cpq" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO opai_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA "cpq" GRANT USAGE, SELECT ON SEQUENCES TO opai_app;

-- Row-Level Security: una política `tenant_isolation` por tabla, para opai_app (NOBYPASSRLS).
ALTER TABLE "cpq"."cotizaciones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cpq"."cotizaciones" FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'cpq' AND tablename = 'cotizaciones' AND policyname = 'tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON "cpq"."cotizaciones" AS PERMISSIVE FOR ALL TO opai_app
      USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
      WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
  END IF;
END $$;

ALTER TABLE "cpq"."versiones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cpq"."versiones" FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'cpq' AND tablename = 'versiones' AND policyname = 'tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON "cpq"."versiones" AS PERMISSIVE FOR ALL TO opai_app
      USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
      WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
  END IF;
END $$;

ALTER TABLE "cpq"."secciones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cpq"."secciones" FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'cpq' AND tablename = 'secciones' AND policyname = 'tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON "cpq"."secciones" AS PERMISSIVE FOR ALL TO opai_app
      USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
      WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
  END IF;
END $$;

ALTER TABLE "cpq"."lineas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cpq"."lineas" FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'cpq' AND tablename = 'lineas' AND policyname = 'tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON "cpq"."lineas" AS PERMISSIVE FOR ALL TO opai_app
      USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
      WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
  END IF;
END $$;

ALTER TABLE "cpq"."aprobaciones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cpq"."aprobaciones" FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'cpq' AND tablename = 'aprobaciones' AND policyname = 'tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON "cpq"."aprobaciones" AS PERMISSIVE FOR ALL TO opai_app
      USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
      WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
  END IF;
END $$;

-- Referencias dentro del mismo tenant (trigger del núcleo `core.verificar_mismo_tenant`).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'mismo_tenant' AND tgrelid = '"cpq"."cotizaciones"'::regclass) THEN
    CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "cpq"."cotizaciones"
      FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('negocio_id', 'comercial.negocios', 'alternativa_de_id', 'cpq.cotizaciones');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'mismo_tenant' AND tgrelid = '"cpq"."versiones"'::regclass) THEN
    CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "cpq"."versiones"
      FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('cotizacion_id', 'cpq.cotizaciones');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'mismo_tenant' AND tgrelid = '"cpq"."secciones"'::regclass) THEN
    CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "cpq"."secciones"
      FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('version_id', 'cpq.versiones', 'instalacion_id', 'core.instalaciones');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'mismo_tenant' AND tgrelid = '"cpq"."lineas"'::regclass) THEN
    CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "cpq"."lineas"
      FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('version_id', 'cpq.versiones', 'seccion_id', 'cpq.secciones', 'cargo_id', 'core.cargos', 'patron_id', 'core.patrones_turno');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'mismo_tenant' AND tgrelid = '"cpq"."aprobaciones"'::regclass) THEN
    CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "cpq"."aprobaciones"
      FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('version_id', 'cpq.versiones');
  END IF;
END $$;

COMMIT;

-- Reversión (manual, con el rol propietario, en una transacción): sin datos de negocio previos (el
-- schema es nuevo), basta con:
--   DROP SCHEMA "cpq" CASCADE;
-- Elimina las 5 tablas, sus índices, FKs, checks, triggers y la política tenant_isolation de cada una,
-- y los GRANT/ALTER DEFAULT PRIVILEGES sobre el schema. Exige revertir antes el código del módulo
-- (manifest y capacidades `cpq.*`) para que nada siga escribiendo ahí. Si ya hubiera cotizaciones
-- reales, se restaura desde el snapshot de Neon previo (OPERACION-agentes.md A.5).
