-- CAR-89, A2 de Asistencia (ADR-023, ORD 770/2025): respuestas y enlaces de las correcciones, alertas del
-- art. 45 con clave única (trabajos idempotentes), columnas de plazo y de resolución, y la restricción de que
-- dos trabajadores de una empresa no registren el mismo correo personal. Migración ADITIVA: tablas nuevas
-- (RLS `tenant_isolation`, ENABLE + FORCE), columnas nuevas con defecto o nulas y un trigger en
-- `core.personas` que NO es retroactivo (solo rechaza altas o cambios de correo duplicados, no toca filas
-- existentes ni falla si ya hay duplicados).

BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "asistencia"."correcciones"
  ADD COLUMN "plazo_horas" INTEGER NOT NULL DEFAULT 48,
  ADD COLUMN "vence_en" TIMESTAMPTZ(6);
ALTER TABLE "asistencia"."correcciones"
  ADD CONSTRAINT "correcciones_plazo_chk" CHECK ("plazo_horas" >= 1 AND "plazo_horas" <= 720);

ALTER TABLE "asistencia"."contingencias"
  ADD COLUMN "resuelta_por_id" UUID,
  ADD COLUMN "resuelta_en" TIMESTAMPTZ(6),
  ADD COLUMN "motivo_resolucion" TEXT;

CREATE TABLE "asistencia"."correcciones_respuestas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "correccion_id" UUID NOT NULL,
    "resultado" TEXT NOT NULL,
    "comentario" TEXT,
    "canal" TEXT NOT NULL,
    "hora_servidor" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "correcciones_respuestas_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "correcciones_respuestas_resultado_chk" CHECK ("resultado" IN ('aceptada', 'objetada', 'vencida')),
    CONSTRAINT "correcciones_respuestas_canal_chk" CHECK ("canal" IN ('portal', 'enlace', 'sistema')),
    CONSTRAINT "correcciones_respuestas_objecion_chk" CHECK ("resultado" <> 'objetada' OR length(btrim(coalesce("comentario", ''))) >= 3)
);
CREATE UNIQUE INDEX "correcciones_respuestas_tenant_id_correccion_id_key" ON "asistencia"."correcciones_respuestas"("tenant_id", "correccion_id");

CREATE TABLE "asistencia"."correcciones_enlaces" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "correccion_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "vence_en" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "correcciones_enlaces_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "correcciones_enlaces_token_hash_key" ON "asistencia"."correcciones_enlaces"("token_hash");
CREATE INDEX "correcciones_enlaces_tenant_id_correccion_id_idx" ON "asistencia"."correcciones_enlaces"("tenant_id", "correccion_id");

CREATE TABLE "asistencia"."alertas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "persona_id" UUID NOT NULL,
    "instalacion_id" UUID,
    "turno_esperado_id" UUID,
    "datos" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "alertas_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "alertas_tipo_chk" CHECK ("tipo" IN ('sin_marca_inicio', 'sin_marca_termino', 'compensables', 'sin_correo_personal'))
);
CREATE UNIQUE INDEX "alertas_tenant_id_tipo_clave_key" ON "asistencia"."alertas"("tenant_id", "tipo", "clave");
CREATE INDEX "alertas_tenant_id_persona_id_tipo_created_at_idx" ON "asistencia"."alertas"("tenant_id", "persona_id", "tipo", "created_at");

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['correcciones_respuestas', 'correcciones_enlaces', 'alertas'] LOOP
    EXECUTE format('ALTER TABLE "asistencia".%I ADD CONSTRAINT %I FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE', t, t || '_tenant_id_fkey');
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON "asistencia".%I TO opai_app', t);
    EXECUTE format('ALTER TABLE "asistencia".%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE "asistencia".%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format($p$CREATE POLICY tenant_isolation ON "asistencia".%I AS PERMISSIVE FOR ALL TO opai_app
      USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
      WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)$p$, t);
  END LOOP;
END $$;

-- La respuesta a una corrección es un hecho: solo se agrega (como las marcas y las correcciones).
CREATE TRIGGER inmutable BEFORE UPDATE OR DELETE ON "asistencia"."correcciones_respuestas"
  FOR EACH ROW EXECUTE FUNCTION "asistencia"."prohibir_modificacion"();
CREATE TRIGGER inmutable_truncate BEFORE TRUNCATE ON "asistencia"."correcciones_respuestas"
  FOR EACH STATEMENT EXECUTE FUNCTION "asistencia"."prohibir_modificacion"();
REVOKE UPDATE, DELETE, TRUNCATE ON "asistencia"."correcciones_respuestas" FROM opai_app;

CREATE TRIGGER mismo_tenant BEFORE INSERT ON "asistencia"."correcciones_respuestas"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('correccion_id', 'asistencia.correcciones');
CREATE TRIGGER mismo_tenant BEFORE INSERT ON "asistencia"."correcciones_enlaces"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('correccion_id', 'asistencia.correcciones');
CREATE TRIGGER mismo_tenant BEFORE INSERT ON "asistencia"."alertas"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'persona_id', 'core.personas', 'instalacion_id', 'core.instalaciones', 'turno_esperado_id', 'core.turnos_esperados');

-- Dos trabajadores de una empresa no pueden registrar el mismo correo personal (ORD 770/2025, L-05). Solo
-- mira altas y cambios del correo (no es retroactivo): una duplicación ya existente no rompe esta migración.
CREATE FUNCTION "core"."verificar_email_personal_unico"() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF NEW.email_personal IS NOT NULL AND btrim(NEW.email_personal) <> '' AND EXISTS (
    SELECT 1 FROM "core"."personas" p
    WHERE p.tenant_id = NEW.tenant_id AND p.id <> NEW.id
      AND lower(btrim(p.email_personal)) = lower(btrim(NEW.email_personal))
  ) THEN
    RAISE EXCEPTION 'El correo personal ya está registrado por otro trabajador de la empresa'
      USING ERRCODE = 'unique_violation', CONSTRAINT = 'personas_email_personal_unico';
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER email_personal_unico BEFORE INSERT OR UPDATE OF email_personal ON "core"."personas"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_email_personal_unico"();

COMMIT;

-- Reversión: migración aditiva; antes de usarla:
-- DROP TRIGGER email_personal_unico ON "core"."personas"; DROP FUNCTION "core"."verificar_email_personal_unico"();
-- DROP TABLE "asistencia"."alertas", "asistencia"."correcciones_enlaces", "asistencia"."correcciones_respuestas";
-- ALTER TABLE "asistencia"."contingencias" DROP COLUMN "resuelta_por_id", DROP COLUMN "resuelta_en", DROP COLUMN "motivo_resolucion";
-- ALTER TABLE "asistencia"."correcciones" DROP CONSTRAINT "correcciones_plazo_chk", DROP COLUMN "plazo_horas", DROP COLUMN "vence_en";
-- Con respuestas ya registradas no se borran (son hechos regulados, ADR-023): se restaura desde el snapshot de Neon.
