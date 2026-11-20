-- CAR-478 (Sesión Acceso): prerregistro de visitas con invitación QR (R13–R15).
-- Migración ADITIVA (solo tablas nuevas; no toca datos existentes ni secretos):
--   · acceso.prerregistros            aviso anticipado de una visita de uno o varios días (máx. 30), con horario,
--                                     anfitrión, motivo, nota para el guardia y «avisarme al llegar». Se cancela
--                                     con un UPDATE de `cancelado_en` (nunca se borra).
--   · acceso.prerregistro_visitantes  visitantes del prerregistro. Del documento solo huella y máscara, como en
--                                     las listas (decisión de Carlos del 7-nov-2026). Solo inserción.
-- El QR de cada día no se guarda: es una firma HMAC del visitante y el día con una clave derivada de la clave de
-- plataforma, así que no hay nada que filtrar desde la base. El estado por día se calcula (R15).

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "acceso"."prerregistros" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "instalacion_id" UUID NOT NULL,
    "desde" DATE NOT NULL,
    "hasta" DATE NOT NULL,
    "desde_min" INTEGER,
    "hasta_min" INTEGER,
    "anfitrion" TEXT NOT NULL,
    "motivo" TEXT,
    "nota" TEXT,
    "avisar_llegada" BOOLEAN NOT NULL DEFAULT false,
    "creado_por" UUID,
    "cancelado_en" TIMESTAMPTZ(6),
    "cancelado_por" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "prerregistros_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "prerregistros_rango_check" CHECK ("hasta" >= "desde" AND "hasta" - "desde" < 30),
    CONSTRAINT "prerregistros_horario_check" CHECK (
      ("desde_min" IS NULL AND "hasta_min" IS NULL)
      OR ("desde_min" BETWEEN 0 AND 1439 AND "hasta_min" BETWEEN 0 AND 1439 AND "desde_min" < "hasta_min")),
    CONSTRAINT "prerregistros_anfitrion_check" CHECK (char_length(btrim("anfitrion")) BETWEEN 2 AND 120)
);
CREATE INDEX "prerregistros_dias_idx" ON "acceso"."prerregistros"("tenant_id", "instalacion_id", "hasta", "desde");
ALTER TABLE "acceso"."prerregistros" ADD CONSTRAINT "prerregistros_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "acceso"."prerregistros" ADD CONSTRAINT "prerregistros_instalacion_id_fkey"
  FOREIGN KEY ("instalacion_id") REFERENCES "core"."instalaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "acceso"."prerregistro_visitantes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "prerregistro_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "doc_tipo" TEXT NOT NULL,
    "huella" TEXT NOT NULL,
    "huella_kid" TEXT NOT NULL,
    "mascara" TEXT NOT NULL,
    "empresa" TEXT,
    "patente" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "prerregistro_visitantes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "prerregistro_visitantes_prerregistro_idx" ON "acceso"."prerregistro_visitantes"("prerregistro_id");
CREATE INDEX "prerregistro_visitantes_huella_idx" ON "acceso"."prerregistro_visitantes"("tenant_id", "doc_tipo", "huella");
ALTER TABLE "acceso"."prerregistro_visitantes" ADD CONSTRAINT "prerregistro_visitantes_prerregistro_fkey"
  FOREIGN KEY ("prerregistro_id") REFERENCES "acceso"."prerregistros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "acceso"."prerregistro_visitantes" ADD CONSTRAINT "prerregistro_visitantes_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

GRANT SELECT, INSERT, UPDATE ON "acceso"."prerregistros" TO opai_app;
REVOKE DELETE, TRUNCATE ON "acceso"."prerregistros" FROM opai_app;
GRANT SELECT, INSERT ON "acceso"."prerregistro_visitantes" TO opai_app;
REVOKE UPDATE, DELETE, TRUNCATE ON "acceso"."prerregistro_visitantes" FROM opai_app;

ALTER TABLE "acceso"."prerregistros" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "acceso"."prerregistros" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "acceso"."prerregistros" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "acceso"."prerregistros" FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
  'instalacion_id', 'core.instalaciones');

ALTER TABLE "acceso"."prerregistro_visitantes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "acceso"."prerregistro_visitantes" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "acceso"."prerregistro_visitantes" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
CREATE TRIGGER mismo_tenant BEFORE INSERT ON "acceso"."prerregistro_visitantes" FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
  'prerregistro_id', 'acceso.prerregistros');

COMMIT;

-- Reversión (manual, con el rol propietario, en una transacción). Solo si aún no hay prerregistros reales:
--   DROP TABLE "acceso"."prerregistro_visitantes";
--   DROP TABLE "acceso"."prerregistros";
