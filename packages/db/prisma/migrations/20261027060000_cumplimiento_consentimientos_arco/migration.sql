-- Brief 07d · Ley 21.719 por diseño (PR 2, bloque 4): consentimientos, solicitudes del titular
-- (ARCO+) e incidentes/brechas. Migración aditiva. Timestamp posterior a B3 (20261027050000) y
-- anterior a CRM y Puestos. Toda tabla nueva con tenant_id repite ENABLE RLS + política
-- tenant_isolation (REGLAS-codigo.md). Consentimientos e incidentes son append-only de verdad.

-- CreateTable: consentimientos (append-only; §4.4).
CREATE TABLE "core"."consentimientos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "titular_tipo" TEXT NOT NULL,
    "titular_id" UUID NOT NULL,
    "proposito" TEXT NOT NULL,
    "version_aviso" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "origen" TEXT NOT NULL DEFAULT 'interno',
    "nota" TEXT,
    "registrado_por" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consentimientos_pkey" PRIMARY KEY ("id")
);

-- CreateTable: solicitudes del titular (ARCO+; mutable, §4.4).
CREATE TABLE "core"."solicitudes_arco" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "titular_tipo" TEXT,
    "titular_id" UUID,
    "titular_email" TEXT,
    "titular_nombre" TEXT,
    "tipo" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'recibida',
    "plazo_en" TIMESTAMPTZ(6),
    "recibida_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responsable_id" UUID,
    "resultado" TEXT,
    "documento_evidencia_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "solicitudes_arco_pkey" PRIMARY KEY ("id")
);

-- CreateTable: incidentes de seguridad y avisos de brecha (append-only event-sourced; §16.5).
CREATE TABLE "core"."incidentes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "caso_id" UUID NOT NULL,
    "evento" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "ocurrido_en" TIMESTAMPTZ(6),
    "descripcion" TEXT,
    "alcance" TEXT,
    "datos_afectados" TEXT,
    "destinatario" TEXT,
    "canal" TEXT,
    "plazo_en" TIMESTAMPTZ(6),
    "evidencia_doc_id" UUID,
    "nota" TEXT,
    "registrado_por" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incidentes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "consentimientos_tenant_id_titular_tipo_titular_id_proposi_idx" ON "core"."consentimientos"("tenant_id", "titular_tipo", "titular_id", "proposito", "created_at");
CREATE INDEX "solicitudes_arco_tenant_id_estado_plazo_en_idx" ON "core"."solicitudes_arco"("tenant_id", "estado", "plazo_en");
CREATE INDEX "incidentes_tenant_id_caso_id_created_at_idx" ON "core"."incidentes"("tenant_id", "caso_id", "created_at");

-- AddForeignKey
ALTER TABLE "core"."consentimientos" ADD CONSTRAINT "consentimientos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core"."solicitudes_arco" ADD CONSTRAINT "solicitudes_arco_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core"."incidentes" ADD CONSTRAINT "incidentes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS: aislamiento por tenant (plantilla de REGLAS-codigo.md). CI falla si falta (rls-nucleo*.test).
ALTER TABLE "core"."consentimientos" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."consentimientos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core"."solicitudes_arco" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."solicitudes_arco" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core"."incidentes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."incidentes" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- Referencias dentro del mismo tenant (trigger de 20261023170000). Las FK de Postgres no pasan por
-- RLS: sin esto una fila podría apuntar (adivinando el uuid) al documento de otra empresa. El titular
-- (persona/contacto) es polimórfico y lo valida la capacidad vía RLS, como documento_vinculos.
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."solicitudes_arco"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('documento_evidencia_id', 'core.documentos');
CREATE TRIGGER mismo_tenant BEFORE INSERT ON "core"."incidentes"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('evidencia_doc_id', 'core.documentos');

-- Append-only de verdad (§6). El grant inicial (20261023031142_init l.59 y l.61) dio UPDATE/DELETE a
-- opai_app sobre todo `core`. Para las tablas inmutables de este PR (consentimientos e incidentes) se
-- revoca: corregir es una fila nueva (INSERT), nunca UPDATE ni DELETE. El rol propietario conserva sus
-- privilegios (migraciones, seeds). `solicitudes_arco` NO se revoca: su estado avanza y la auditoría
-- prueba cada transición.
REVOKE UPDATE, DELETE ON "core"."consentimientos" FROM opai_app;
REVOKE UPDATE, DELETE ON "core"."incidentes" FROM opai_app;
