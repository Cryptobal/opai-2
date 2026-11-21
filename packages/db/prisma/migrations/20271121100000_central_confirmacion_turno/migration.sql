-- Central · CAR-750 (F1 agéntica): confirmación previa al turno y políticas por instalación.
-- Migración aditiva, sin datos: dos tablas con RLS + FORCE + tenant_isolation, FK al núcleo y
-- trigger mismo_tenant.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "central"."confirmaciones_turno" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "turno_esperado_id" UUID NOT NULL,
    "persona_id" UUID NOT NULL,
    "instalacion_id" UUID NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "motivo" TEXT,
    "aviso_enviado_en" TIMESTAMPTZ(6),
    "plazo_vence_en" TIMESTAMPTZ(6),
    "respondido_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "confirmaciones_turno_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "confirmaciones_turno_estado_check" CHECK (
      "estado" IN ('pendiente', 'confirmado', 'en_camino', 'con_problema', 'sin_respuesta')
    ),
    CONSTRAINT "confirmaciones_turno_motivo_check" CHECK (
      "motivo" IS NULL OR char_length("motivo") BETWEEN 1 AND 200
    ),
    CONSTRAINT "confirmaciones_turno_problema_chk" CHECK (
      ("estado" = 'con_problema') = ("motivo" IS NOT NULL)
    ),
    CONSTRAINT "confirmaciones_turno_respuesta_chk" CHECK (
      ("estado" IN ('confirmado', 'en_camino', 'con_problema')) = ("respondido_en" IS NOT NULL)
    )
);

CREATE TABLE "central"."confirmacion_politicas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "instalacion_id" UUID NOT NULL,
    "anticipacion_min" INTEGER NOT NULL,
    "plazo_respuesta_min" INTEGER NOT NULL,
    "franja" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "confirmacion_politicas_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "confirmacion_politicas_anticipacion_chk" CHECK ("anticipacion_min" BETWEEN 15 AND 180),
    CONSTRAINT "confirmacion_politicas_plazo_chk" CHECK ("plazo_respuesta_min" BETWEEN 5 AND 60),
    CONSTRAINT "confirmacion_politicas_franja_check" CHECK ("franja" IN ('noche', 'dia', 'ambos'))
);

CREATE UNIQUE INDEX "confirmaciones_turno_tenant_turno_key"
  ON "central"."confirmaciones_turno"("tenant_id", "turno_esperado_id");
CREATE INDEX "confirmaciones_turno_tenant_instalacion_plazo_idx"
  ON "central"."confirmaciones_turno"("tenant_id", "instalacion_id", "plazo_vence_en");
CREATE INDEX "confirmaciones_turno_tenant_persona_idx"
  ON "central"."confirmaciones_turno"("tenant_id", "persona_id");
CREATE UNIQUE INDEX "confirmacion_politicas_tenant_instalacion_key"
  ON "central"."confirmacion_politicas"("tenant_id", "instalacion_id");

ALTER TABLE "central"."confirmaciones_turno"
  ADD CONSTRAINT "confirmaciones_turno_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "confirmaciones_turno_turno_esperado_id_fkey" FOREIGN KEY ("turno_esperado_id") REFERENCES "core"."turnos_esperados"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "confirmaciones_turno_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "core"."personas"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "confirmaciones_turno_instalacion_id_fkey" FOREIGN KEY ("instalacion_id") REFERENCES "core"."instalaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "central"."confirmacion_politicas"
  ADD CONSTRAINT "confirmacion_politicas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "confirmacion_politicas_instalacion_id_fkey" FOREIGN KEY ("instalacion_id") REFERENCES "core"."instalaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "central"."confirmaciones_turno"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'persona_id', 'core.personas', 'instalacion_id', 'core.instalaciones', 'turno_esperado_id', 'core.turnos_esperados'
  );
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "central"."confirmacion_politicas"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('instalacion_id', 'core.instalaciones');

ALTER TABLE "central"."confirmaciones_turno" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "central"."confirmaciones_turno" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "central"."confirmaciones_turno" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
ALTER TABLE "central"."confirmacion_politicas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "central"."confirmacion_politicas" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "central"."confirmacion_politicas" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "central"."confirmaciones_turno", "central"."confirmacion_politicas" TO opai_app;

COMMIT;

-- Reversión: DROP TABLE IF EXISTS "central"."confirmacion_politicas", "central"."confirmaciones_turno";