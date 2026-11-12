-- Núcleo · CAR-252 (ADR-107): reglas de aprobación por empresa. Migración aditiva: una tabla nueva,
-- sin datos, y una columna nullable en core.aprobaciones. Tabla con tenant_id: RLS + FORCE + política
-- tenant_isolation (docs/2.0/REGLAS-codigo.md). El grupo aprobador se valida del MISMO tenant con una
-- FK compuesta hacia grupos_usuarios (tenant_id, id); con aprobador_grupo_id null no se comprueba.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "core"."reglas_aprobacion" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "accion" TEXT NOT NULL,
    "monto_minimo" BIGINT,
    "aprobador_rol" TEXT,
    "aprobador_grupo_id" UUID,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "reglas_aprobacion_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "reglas_aprobacion_un_aprobador" CHECK (
      ("aprobador_rol" IS NOT NULL) <> ("aprobador_grupo_id" IS NOT NULL)
    ),
    CONSTRAINT "reglas_aprobacion_monto_no_negativo" CHECK (
      "monto_minimo" IS NULL OR "monto_minimo" >= 0
    )
);

CREATE UNIQUE INDEX "reglas_aprobacion_tenant_id_id_key" ON "core"."reglas_aprobacion"("tenant_id", "id");
CREATE INDEX "reglas_aprobacion_tenant_id_accion_idx" ON "core"."reglas_aprobacion"("tenant_id", "accion");
CREATE INDEX "reglas_aprobacion_tenant_id_aprobador_grupo_id_idx"
  ON "core"."reglas_aprobacion"("tenant_id", "aprobador_grupo_id");

ALTER TABLE "core"."reglas_aprobacion" ADD CONSTRAINT "reglas_aprobacion_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core"."reglas_aprobacion" ADD CONSTRAINT "reglas_aprobacion_tenant_id_grupo_fkey"
  FOREIGN KEY ("tenant_id", "aprobador_grupo_id") REFERENCES "core"."grupos_usuarios"("tenant_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "core"."reglas_aprobacion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."reglas_aprobacion" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."reglas_aprobacion" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
-- Desactivar, nunca borrar: una solicitud que nombró la regla sigue sabiendo quién podía aprobarla.
REVOKE DELETE ON "core"."reglas_aprobacion" FROM opai_app;

-- La solicitud recuerda qué regla la pidió (null: la pidió la autonomía del agente, como hasta hoy).
ALTER TABLE "core"."aprobaciones" ADD COLUMN "regla_id" UUID;
CREATE INDEX "aprobaciones_tenant_id_regla_id_idx" ON "core"."aprobaciones"("tenant_id", "regla_id");
-- La regla nombrada es de la MISMA empresa (FK compuesta; con regla_id null no se comprueba).
ALTER TABLE "core"."aprobaciones" ADD CONSTRAINT "aprobaciones_tenant_id_regla_id_fkey"
  FOREIGN KEY ("tenant_id", "regla_id") REFERENCES "core"."reglas_aprobacion"("tenant_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;

-- Reversión: DROP INDEX IF EXISTS "core"."aprobaciones_tenant_id_regla_id_idx";
-- ALTER TABLE "core"."aprobaciones" DROP COLUMN IF EXISTS "regla_id";
-- DROP TABLE IF EXISTS "core"."reglas_aprobacion";
