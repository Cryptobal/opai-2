-- CAR-89, A1 de Asistencia (ADR-023, ADR-048): schema `asistencia` con marcas y correcciones
-- inmutables y encadenadas por empresa, contingencias e incidentes técnicos. Migración ADITIVA: solo
-- crea un schema y tablas nuevas. Cada tabla lleva RLS `tenant_isolation` (ENABLE + FORCE) para
-- opai_app. Las marcas y las correcciones SOLO se agregan: triggers impiden UPDATE, DELETE y TRUNCATE
-- para todos los roles, también el dueño, y opai_app ni siquiera tiene el privilegio. Las referencias a
-- personas, instalaciones y turnos se validan con `mismo_tenant`, sin FK (una cascada borraría marcas).

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE SCHEMA IF NOT EXISTS "asistencia";
GRANT USAGE ON SCHEMA "asistencia" TO opai_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA "asistencia" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO opai_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA "asistencia" GRANT USAGE, SELECT ON SEQUENCES TO opai_app;

CREATE TABLE "asistencia"."marcas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "seq" INTEGER NOT NULL,
    "persona_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "hora_servidor" TIMESTAMPTZ(6) NOT NULL,
    "hora_dispositivo" TIMESTAMPTZ(6),
    "desfase_s" INTEGER,
    "origen" TEXT NOT NULL,
    "metodo" TEXT NOT NULL,
    "motivo_respaldo" TEXT,
    "confianza" DECIMAL(5,4),
    "prueba_vida" BOOLEAN,
    "dispositivo_id" UUID,
    "canal" TEXT,
    "instalacion_id" UUID NOT NULL,
    "lat" DECIMAL(9,6),
    "lng" DECIMAL(9,6),
    "precision_m" DECIMAL(8,2),
    "gps_estado" TEXT NOT NULL,
    "distancia_m" DECIMAL(10,2),
    "turno_esperado_id" UUID,
    "turno_inicio" TIMESTAMPTZ(6),
    "turno_fin" TIMESTAMPTZ(6),
    "snapshot" JSONB NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "hash_anterior" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "marcas_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "marcas_tipo_chk" CHECK ("tipo" IN ('entrada', 'salida', 'inicio_colacion', 'fin_colacion')),
    CONSTRAINT "marcas_origen_chk" CHECK ("origen" IN ('en_linea', 'offline_queue', 'contingencia', 'importacion')),
    CONSTRAINT "marcas_metodo_chk" CHECK ("metodo" IN ('rostro', 'rut_pin', 'pin_respaldo', 'manual_contingencia')),
    CONSTRAINT "marcas_canal_chk" CHECK ("canal" IS NULL OR "canal" IN ('kiosco', 'telefono_personal')),
    CONSTRAINT "marcas_gps_estado_chk" CHECK ("gps_estado" IN ('dentro', 'fuera', 'sin_gps')),
    CONSTRAINT "marcas_seq_chk" CHECK ("seq" >= 1),
    CONSTRAINT "marcas_confianza_chk" CHECK ("confianza" IS NULL OR ("confianza" >= 0 AND "confianza" <= 1))
);
CREATE UNIQUE INDEX "marcas_tenant_id_seq_key" ON "asistencia"."marcas"("tenant_id", "seq");
CREATE UNIQUE INDEX "marcas_tenant_id_idempotency_key_key" ON "asistencia"."marcas"("tenant_id", "idempotency_key");
CREATE UNIQUE INDEX "marcas_hash_key" ON "asistencia"."marcas"("hash");
CREATE INDEX "marcas_tenant_id_persona_id_hora_servidor_idx" ON "asistencia"."marcas"("tenant_id", "persona_id", "hora_servidor");
CREATE INDEX "marcas_tenant_id_instalacion_id_hora_servidor_idx" ON "asistencia"."marcas"("tenant_id", "instalacion_id", "hora_servidor");

CREATE TABLE "asistencia"."cadenas_cabeza" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "cadena" TEXT NOT NULL,
    "ultimo_seq" INTEGER NOT NULL DEFAULT 0,
    "ultimo_hash" TEXT NOT NULL,
    "verificada_en" TIMESTAMPTZ(6),
    "verificacion_ok" BOOLEAN,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "cadenas_cabeza_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "cadenas_cabeza_cadena_chk" CHECK ("cadena" IN ('marcas', 'correcciones'))
);
CREATE UNIQUE INDEX "cadenas_cabeza_tenant_id_cadena_key" ON "asistencia"."cadenas_cabeza"("tenant_id", "cadena");

CREATE TABLE "asistencia"."correcciones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "seq" INTEGER NOT NULL,
    "marca_id" UUID NOT NULL,
    "persona_id" UUID NOT NULL,
    "hora_propuesta" TIMESTAMPTZ(6) NOT NULL,
    "tipo_propuesto" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "propuesta_por_id" UUID NOT NULL,
    "hora_servidor" TIMESTAMPTZ(6) NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "hash_anterior" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "correcciones_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "correcciones_tipo_chk" CHECK ("tipo_propuesto" IN ('entrada', 'salida', 'inicio_colacion', 'fin_colacion')),
    CONSTRAINT "correcciones_seq_chk" CHECK ("seq" >= 1)
);
CREATE UNIQUE INDEX "correcciones_tenant_id_seq_key" ON "asistencia"."correcciones"("tenant_id", "seq");
CREATE UNIQUE INDEX "correcciones_tenant_id_idempotency_key_key" ON "asistencia"."correcciones"("tenant_id", "idempotency_key");
CREATE INDEX "correcciones_tenant_id_marca_id_idx" ON "asistencia"."correcciones"("tenant_id", "marca_id");

CREATE TABLE "asistencia"."contingencias" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "persona_id" UUID NOT NULL,
    "instalacion_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "hora_declarada" TIMESTAMPTZ(6) NOT NULL,
    "motivo" TEXT NOT NULL,
    "autor_id" UUID NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "evidencia_documento_id" UUID,
    "marca_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "contingencias_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "contingencias_estado_chk" CHECK ("estado" IN ('pendiente', 'aceptada', 'rechazada')),
    CONSTRAINT "contingencias_tipo_chk" CHECK ("tipo" IN ('entrada', 'salida', 'inicio_colacion', 'fin_colacion'))
);
CREATE INDEX "contingencias_tenant_id_estado_idx" ON "asistencia"."contingencias"("tenant_id", "estado");

CREATE TABLE "asistencia"."incidentes_tecnicos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "severidad" TEXT NOT NULL,
    "inicio" TIMESTAMPTZ(6) NOT NULL,
    "fin" TIMESTAMPTZ(6),
    "detalle" TEXT,
    "origen" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "incidentes_tecnicos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "incidentes_tecnicos_tipo_chk" CHECK ("tipo" IN ('proveedor_caido', 'cola_atrasada', 'cadena_rota', 'otro')),
    CONSTRAINT "incidentes_tecnicos_severidad_chk" CHECK ("severidad" IN ('baja', 'media', 'alta')),
    CONSTRAINT "incidentes_tecnicos_origen_chk" CHECK ("origen" IN ('manual', 'automatico')),
    CONSTRAINT "incidentes_tecnicos_rango_chk" CHECK ("fin" IS NULL OR "fin" >= "inicio")
);
CREATE INDEX "incidentes_tecnicos_tenant_id_inicio_idx" ON "asistencia"."incidentes_tecnicos"("tenant_id", "inicio");

-- Empresa dueña de cada fila y aislamiento por RLS (ENABLE + FORCE) con la política única.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['marcas', 'cadenas_cabeza', 'correcciones', 'contingencias', 'incidentes_tecnicos'] LOOP
    EXECUTE format('ALTER TABLE "asistencia".%I ADD CONSTRAINT %I FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE', t, t || '_tenant_id_fkey');
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON "asistencia".%I TO opai_app', t);
    EXECUTE format('ALTER TABLE "asistencia".%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE "asistencia".%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format($p$CREATE POLICY tenant_isolation ON "asistencia".%I AS PERMISSIVE FOR ALL TO opai_app
      USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
      WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)$p$, t);
  END LOOP;
END $$;

-- Inalterabilidad (L-16, ADR-023): nadie edita ni borra una marca ni una corrección, ni el dueño.
CREATE FUNCTION "asistencia"."prohibir_modificacion"() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  RAISE EXCEPTION 'asistencia.%: los hechos regulados solo se agregan (% prohibido)', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'restrict_violation';
END
$$;

CREATE TRIGGER inmutable BEFORE UPDATE OR DELETE ON "asistencia"."marcas"
  FOR EACH ROW EXECUTE FUNCTION "asistencia"."prohibir_modificacion"();
CREATE TRIGGER inmutable_truncate BEFORE TRUNCATE ON "asistencia"."marcas"
  FOR EACH STATEMENT EXECUTE FUNCTION "asistencia"."prohibir_modificacion"();
CREATE TRIGGER inmutable BEFORE UPDATE OR DELETE ON "asistencia"."correcciones"
  FOR EACH ROW EXECUTE FUNCTION "asistencia"."prohibir_modificacion"();
CREATE TRIGGER inmutable_truncate BEFORE TRUNCATE ON "asistencia"."correcciones"
  FOR EACH STATEMENT EXECUTE FUNCTION "asistencia"."prohibir_modificacion"();
REVOKE UPDATE, DELETE, TRUNCATE ON "asistencia"."marcas" FROM opai_app;
REVOKE UPDATE, DELETE, TRUNCATE ON "asistencia"."correcciones" FROM opai_app;

-- Referencias de la misma empresa.
CREATE TRIGGER mismo_tenant BEFORE INSERT ON "asistencia"."marcas"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'persona_id', 'core.personas', 'instalacion_id', 'core.instalaciones',
    'turno_esperado_id', 'core.turnos_esperados');
CREATE TRIGGER mismo_tenant BEFORE INSERT ON "asistencia"."correcciones"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'marca_id', 'asistencia.marcas', 'persona_id', 'core.personas');
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "asistencia"."contingencias"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'persona_id', 'core.personas', 'instalacion_id', 'core.instalaciones',
    'evidencia_documento_id', 'core.documentos', 'marca_id', 'asistencia.marcas');

COMMIT;

-- Reversión: migración aditiva; si hace falta deshacerla antes de usarla:
-- DROP SCHEMA "asistencia" CASCADE; (borra tablas, políticas, triggers y la función). Con marcas ya
-- registradas NO se borra: son hechos regulados (ADR-023) y se restaura desde el snapshot de Neon.
