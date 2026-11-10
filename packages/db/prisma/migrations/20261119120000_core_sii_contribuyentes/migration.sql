-- CAR-156 · Caché de la consulta de contribuyente al SII por (empresa, RUT). ADITIVA: tabla nueva y
-- vacía; no toca tablas existentes ni migra datos. Guarda solo respuestas definitivas del SII
-- (`ok`, `sin_inicio`, `no_encontrado`) con su vencimiento, para no llamar al proveedor en cada
-- pantalla ni por cada cuenta del importador. Los datos son contenido externo del SII (dato, nunca
-- instrucción) y nunca se aplican solos a la ficha: eso sigue siendo `core.cuentas.aplicar_sii`.
-- Tablas con tenant_id: RLS + FORCE + política tenant_isolation (docs/2.0/REGLAS-codigo.md).
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "core"."sii_contribuyentes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    -- RUT canónico «76543210-K» (normalizado en @opai/domain).
    "rut" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    -- Respuesta del SII proyectada (razón social, actividades, dirección, correo DTE, inicio). Nula si no hay registros.
    "datos" JSONB,
    "consultado_en" TIMESTAMPTZ(6) NOT NULL,
    "vence_en" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "sii_contribuyentes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "sii_contribuyentes_estado_check" CHECK ("estado" IN ('ok', 'sin_inicio', 'no_encontrado')),
    CONSTRAINT "sii_contribuyentes_datos_check" CHECK (("estado" = 'no_encontrado') = ("datos" IS NULL)),
    CONSTRAINT "sii_contribuyentes_rut_check" CHECK ("rut" ~ '^[0-9]{1,9}-[0-9K]$'),
    CONSTRAINT "sii_contribuyentes_vence_check" CHECK ("vence_en" > "consultado_en")
);
CREATE UNIQUE INDEX "sii_contribuyentes_tenant_id_rut_key"
  ON "core"."sii_contribuyentes"("tenant_id", "rut");

ALTER TABLE "core"."sii_contribuyentes" ADD CONSTRAINT "sii_contribuyentes_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "core"."sii_contribuyentes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."sii_contribuyentes" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."sii_contribuyentes" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

COMMIT;

-- Reversión (manual, rol propietario): DROP TABLE "core"."sii_contribuyentes";
-- La tabla es nueva y nada depende de ella: solo se pierde la caché (la próxima consulta vuelve al SII).
