-- Brief 07d · Ley 21.719 por diseño (PR 3, bloques 9-11): retención y anonimización. Migración
-- aditiva e idempotente (se puede aplicar dos veces sin error). Agrega la marca de anonimización a
-- personas y contactos y el registro append-only de lo que hizo (o simuló) la política de retención.
-- Nada de esto borra ni cambia datos existentes.

-- Marca de anonimización: la fija el trabajo de retención o la anonimización puntual de un titular.
ALTER TABLE "core"."personas" ADD COLUMN IF NOT EXISTS "anonimizada_en" TIMESTAMPTZ(6);
ALTER TABLE "core"."contactos" ADD COLUMN IF NOT EXISTS "anonimizado_en" TIMESTAMPTZ(6);

-- Registro de retención (§6): qué tabla, qué acción, cuántas filas y cuándo. SIN datos personales en
-- claro: solo contadores y, cuando es a pedido de un titular, el id (pseudónimo) de la persona o el
-- contacto. `modo`: «simulacion» (la política aún no está activa para el tenant) o «aplicada».
CREATE TABLE IF NOT EXISTS "core"."retencion_ejecuciones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tabla" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "modo" TEXT NOT NULL,
    "origen" TEXT NOT NULL DEFAULT 'trabajo',
    "dias" INTEGER,
    "corte" TIMESTAMPTZ(6),
    "filas" INTEGER NOT NULL,
    "titular_tipo" TEXT,
    "titular_id" UUID,
    "solicitud_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retencion_ejecuciones_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "retencion_ejecuciones_modo_check" CHECK ("modo" IN ('simulacion', 'aplicada')),
    CONSTRAINT "retencion_ejecuciones_origen_check" CHECK ("origen" IN ('trabajo', 'titular')),
    CONSTRAINT "retencion_ejecuciones_filas_check" CHECK ("filas" >= 0)
);

CREATE INDEX IF NOT EXISTS "retencion_ejecuciones_tenant_id_created_at_idx"
  ON "core"."retencion_ejecuciones"("tenant_id", "created_at");

DO $$ BEGIN
  ALTER TABLE "core"."retencion_ejecuciones" ADD CONSTRAINT "retencion_ejecuciones_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RLS: aislamiento por tenant (plantilla de REGLAS-codigo.md). CI falla si falta (rls-nucleo*.test).
ALTER TABLE "core"."retencion_ejecuciones" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "core"."retencion_ejecuciones";
CREATE POLICY tenant_isolation ON "core"."retencion_ejecuciones" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- La solicitud de origen (si la hay) debe ser del mismo tenant (trigger de 20261023170000).
DROP TRIGGER IF EXISTS mismo_tenant ON "core"."retencion_ejecuciones";
CREATE TRIGGER mismo_tenant BEFORE INSERT ON "core"."retencion_ejecuciones"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('solicitud_id', 'core.solicitudes_arco');

-- Append-only de verdad (§6): el grant inicial dio UPDATE/DELETE a opai_app sobre todo `core`; para
-- la prueba de lo que hizo la política se revoca. El propietario conserva sus privilegios.
REVOKE UPDATE, DELETE ON "core"."retencion_ejecuciones" FROM opai_app;

-- Inversa (manual; Prisma no aplica down; solo si no hay datos que conservar):
--   DROP TABLE "core"."retencion_ejecuciones";
--   ALTER TABLE "core"."personas" DROP COLUMN "anonimizada_en";
--   ALTER TABLE "core"."contactos" DROP COLUMN "anonimizado_en";
