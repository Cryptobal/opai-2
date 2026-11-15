-- CAR-393 (Estándares H-4, parte 1) · La ausencia es un registro propio de la persona, no solo excepciones de la pauta.
-- Referente: Rippling / BambooHR / Deel (y Deputy en turnos): tipo, desde, hasta, estado y quién la aprobó; la pauta
-- la lee y marca los turnos afectados.
--   · core.ausencias: una fila por permiso, licencia, vacaciones o ausencia registrada (estado solicitada, aprobada,
--     rechazada o anulada; lo que se registra desde la ficha nace aprobado).
--   · pauta.excepciones.ausencia_id: cada turno marcado apunta al registro que lo originó.
--   · Traspaso: las excepciones de persona ya creadas (ficha o pauta) se agrupan como lo hacía la ficha (persona, tipo,
--     motivo y momento del registro) y quedan enlazadas, sin perder historial (fechas, quién y estado se conservan).
-- Tabla con tenant_id: RLS + FORCE + política tenant_isolation. Con row_security = off, el traspaso falla en vez de
-- copiar 0 filas si el rol que migra no puede saltarse la RLS (REGLAS-codigo, migraciones de datos tras FORCE RLS).
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL row_security = off;

CREATE TABLE "core"."ausencias" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "persona_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "desde" DATE NOT NULL,
    "hasta" DATE NOT NULL,
    "motivo" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'aprobada',
    "registrada_por" UUID,
    "aprobada_por" UUID,
    "aprobada_en" TIMESTAMPTZ(6),
    "anulada_por" UUID,
    "anulada_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ausencias_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ausencias_tipo_check" CHECK ("tipo" IN ('ausencia', 'licencia', 'vacaciones', 'permiso')),
    CONSTRAINT "ausencias_estado_check" CHECK ("estado" IN ('solicitada', 'aprobada', 'rechazada', 'anulada')),
    CONSTRAINT "ausencias_rango_check" CHECK ("hasta" >= "desde"),
    CONSTRAINT "ausencias_motivo_check" CHECK (char_length("motivo") BETWEEN 1 AND 500)
);
CREATE INDEX "ausencias_tenant_id_persona_id_desde_idx" ON "core"."ausencias"("tenant_id", "persona_id", "desde" DESC);

ALTER TABLE "core"."ausencias" ADD CONSTRAINT "ausencias_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core"."ausencias" ADD CONSTRAINT "ausencias_persona_id_fkey"
  FOREIGN KEY ("persona_id") REFERENCES "core"."personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "core"."ausencias" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."ausencias" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."ausencias" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
-- Sin DELETE: una ausencia se anula, nunca se borra (solo en cascada con la persona).
GRANT SELECT, INSERT, UPDATE ON "core"."ausencias" TO opai_app;
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."ausencias"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('persona_id', 'core.personas');

ALTER TABLE "pauta"."excepciones" ADD COLUMN "ausencia_id" UUID;
ALTER TABLE "pauta"."excepciones" ADD CONSTRAINT "excepciones_ausencia_id_fkey"
  FOREIGN KEY ("ausencia_id") REFERENCES "core"."ausencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "excepciones_ausencia_id_idx" ON "pauta"."excepciones"("ausencia_id");
DROP TRIGGER "mismo_tenant" ON "pauta"."excepciones";
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "pauta"."excepciones"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'puesto_id', 'core.puestos', 'persona_id', 'core.personas', 'ausencia_id', 'core.ausencias');

-- Traspaso de lo ya registrado: un registro por (persona, tipo, motivo, momento), como lo agrupaba la ficha.
INSERT INTO "core"."ausencias"
  ("id", "tenant_id", "persona_id", "tipo", "desde", "hasta", "motivo", "estado", "registrada_por", "aprobada_por",
   "aprobada_en", "anulada_por", "anulada_en", "created_at", "updated_at")
SELECT gen_random_uuid(), e."tenant_id", e."persona_id", e."tipo", min(e."fecha"), max(e."fecha"), left(e."motivo", 500),
       CASE WHEN bool_or(e."estado" = 'activa') THEN 'aprobada' ELSE 'anulada' END,
       (array_agg(e."creada_por") FILTER (WHERE e."creada_por" IS NOT NULL))[1],
       (array_agg(e."creada_por") FILTER (WHERE e."creada_por" IS NOT NULL))[1],
       e."created_at",
       CASE WHEN bool_or(e."estado" = 'activa') THEN NULL
            ELSE (array_agg(e."anulada_por") FILTER (WHERE e."anulada_por" IS NOT NULL))[1] END,
       CASE WHEN bool_or(e."estado" = 'activa') THEN NULL ELSE max(e."anulada_en") END,
       e."created_at", max(e."updated_at")
FROM "pauta"."excepciones" e
WHERE e."persona_id" IS NOT NULL AND e."tipo" IN ('ausencia', 'licencia', 'vacaciones', 'permiso')
  AND char_length(e."motivo") > 0
GROUP BY e."tenant_id", e."persona_id", e."tipo", e."motivo", e."created_at";

UPDATE "pauta"."excepciones" e SET "ausencia_id" = a."id"
FROM "core"."ausencias" a
WHERE a."tenant_id" = e."tenant_id" AND a."persona_id" = e."persona_id" AND a."tipo" = e."tipo"
  AND a."motivo" = left(e."motivo", 500) AND a."created_at" = e."created_at"
  AND e."persona_id" IS NOT NULL AND e."tipo" IN ('ausencia', 'licencia', 'vacaciones', 'permiso');

-- Ninguna excepción de persona queda sin su registro.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "pauta"."excepciones"
    WHERE "persona_id" IS NOT NULL AND "tipo" IN ('ausencia', 'licencia', 'vacaciones', 'permiso')
      AND char_length("motivo") > 0 AND "ausencia_id" IS NULL
  ) THEN
    RAISE EXCEPTION 'CAR-393: quedaron excepciones de persona sin registro de ausencia';
  END IF;
END $$;

COMMIT;

-- Reversión (manual, con el rol propietario, en una transacción):
--   DROP TRIGGER "mismo_tenant" ON "pauta"."excepciones";
--   CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "pauta"."excepciones" FOR EACH ROW EXECUTE FUNCTION
--     "core"."verificar_mismo_tenant"('puesto_id', 'core.puestos', 'persona_id', 'core.personas');
--   ALTER TABLE "pauta"."excepciones" DROP COLUMN "ausencia_id";
--   DROP TABLE "core"."ausencias";
-- Las excepciones no cambian salvo la columna nueva: la pauta y la ficha vuelven a leerlas como antes.
