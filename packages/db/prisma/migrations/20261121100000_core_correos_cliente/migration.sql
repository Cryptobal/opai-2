-- CAR-233 · Historial de correos del cliente (sin OAuth ni lectura de Gmail en v1.0; eso es CAR-265).
-- ADITIVA: dos tablas nuevas y vacías y una función de solo lectura; no toca tablas existentes ni
-- migra datos.
--   · core.correos_cliente: correos con clientes que salen de OPAI (cotización, factura, seguimiento)
--     o entran por el receptor de Resend a la dirección de la empresa (respuesta al reply-to o CCO).
--     Remitente, destinatarios, asunto y texto son contenido externo (dato, nunca instrucción).
--     Sin cuenta, contacto ni negocio = bandeja «sin asignar» (la asociación queda NULL).
--   · core.buzones_correo: el token aleatorio (128 bits) de la dirección estable de cada empresa,
--     `t<32 hex>@respuestas.opai.cl`, hermano del token `s…` de cada seguimiento.
--   · core.buzon_correo_resolver(token): SECURITY DEFINER, devuelve solo el tenant de un token exacto.
-- Tablas con tenant_id: RLS + FORCE + política tenant_isolation (docs/2.0/REGLAS-codigo.md).
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "core"."correos_cliente" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "sentido" TEXT NOT NULL,
    "origen" TEXT NOT NULL,
    -- Id del correo en el proveedor (entrantes): idempotencia del webhook, única por empresa.
    "mensaje_id" TEXT,
    "remitente" TEXT NOT NULL,
    "destinatarios" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "asunto" TEXT,
    "texto" TEXT NOT NULL,
    "cuenta_id" UUID,
    "contacto_id" UUID,
    "negocio_id" UUID,
    "asociacion" TEXT,
    -- Ámbito de acceso del hilo: 'finanzas' en facturas y en sus respuestas (bloqueo financiero, ADR-016).
    "ambito" TEXT,
    "asociado_por_id" UUID,
    "asociado_en" TIMESTAMPTZ(6),
    "ocurrido_en" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "correos_cliente_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "correos_cliente_sentido_check" CHECK ("sentido" IN ('enviado', 'recibido')),
    CONSTRAINT "correos_cliente_origen_check" CHECK ("origen" IN ('cotizacion', 'factura', 'seguimiento', 'buzon')),
    CONSTRAINT "correos_cliente_ambito_check" CHECK ("ambito" IS NULL OR "ambito" = 'finanzas'),
    CONSTRAINT "correos_cliente_asociacion_check"
      CHECK ("asociacion" IS NULL OR "asociacion" IN ('origen', 'contacto', 'dominio', 'manual')),
    -- «Sin asignar» = ninguna de las tres referencias. Sin asociación no puede haber referencias; al
    -- revés no se exige: si se borra la entidad (SET NULL) el correo vuelve a «sin asignar».
    CONSTRAINT "correos_cliente_sin_asignar_check"
      CHECK ("asociacion" IS NOT NULL OR ("cuenta_id" IS NULL AND "contacto_id" IS NULL AND "negocio_id" IS NULL)),
    CONSTRAINT "correos_cliente_largos_check"
      CHECK (char_length("texto") <= 20000 AND char_length("remitente") <= 320
        AND ("asunto" IS NULL OR char_length("asunto") <= 500)
        AND cardinality("destinatarios") <= 50)
);
CREATE UNIQUE INDEX "correos_cliente_tenant_id_mensaje_id_key"
  ON "core"."correos_cliente"("tenant_id", "mensaje_id");
CREATE INDEX "correos_cliente_tenant_id_cuenta_id_ocurrido_en_idx"
  ON "core"."correos_cliente"("tenant_id", "cuenta_id", "ocurrido_en");
CREATE INDEX "correos_cliente_tenant_id_contacto_id_ocurrido_en_idx"
  ON "core"."correos_cliente"("tenant_id", "contacto_id", "ocurrido_en");
CREATE INDEX "correos_cliente_tenant_id_negocio_id_ocurrido_en_idx"
  ON "core"."correos_cliente"("tenant_id", "negocio_id", "ocurrido_en");
-- Bandeja «sin asignar» (índice parcial, como el de seguimientos vivos).
CREATE INDEX "correos_cliente_sin_asignar_idx" ON "core"."correos_cliente"("tenant_id", "ocurrido_en")
  WHERE "cuenta_id" IS NULL AND "contacto_id" IS NULL AND "negocio_id" IS NULL;

ALTER TABLE "core"."correos_cliente" ADD CONSTRAINT "correos_cliente_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- Si se borra la entidad, el correo no se pierde: queda sin esa referencia.
ALTER TABLE "core"."correos_cliente" ADD CONSTRAINT "correos_cliente_cuenta_id_fkey"
  FOREIGN KEY ("cuenta_id") REFERENCES "core"."cuentas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "core"."correos_cliente" ADD CONSTRAINT "correos_cliente_contacto_id_fkey"
  FOREIGN KEY ("contacto_id") REFERENCES "core"."contactos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "core"."correos_cliente" ADD CONSTRAINT "correos_cliente_negocio_id_fkey"
  FOREIGN KEY ("negocio_id") REFERENCES "comercial"."negocios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "core"."buzones_correo" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    -- «t» + 32 hex en minúscula (aleatorio de 128 bits, nunca derivado de un id).
    "token" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "buzones_correo_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "buzones_correo_token_check" CHECK ("token" ~ '^t[0-9a-f]{32}$')
);
CREATE UNIQUE INDEX "buzones_correo_tenant_id_key" ON "core"."buzones_correo"("tenant_id");
CREATE UNIQUE INDEX "buzones_correo_token_key" ON "core"."buzones_correo"("token");
ALTER TABLE "core"."buzones_correo" ADD CONSTRAINT "buzones_correo_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

GRANT SELECT, INSERT, UPDATE ON "core"."correos_cliente" TO opai_app;
GRANT SELECT, INSERT ON "core"."buzones_correo" TO opai_app;

ALTER TABLE "core"."correos_cliente" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."correos_cliente" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."correos_cliente" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core"."buzones_correo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."buzones_correo" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."buzones_correo" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- Referencias dentro del mismo tenant (las FK de Postgres no pasan por RLS).
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."correos_cliente"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'cuenta_id', 'core.cuentas', 'contacto_id', 'core.contactos', 'negocio_id', 'comercial.negocios');

-- Resuelve el tenant de la dirección estable de una empresa (receptor del correo entrante). Corre sin
-- tenant fijado, así que es SECURITY DEFINER: recibe solo un token exacto («t» + 32 hex) y devuelve
-- el tenant_id; opai_app no puede listar tokens ni leer otra columna.
CREATE OR REPLACE FUNCTION "core"."buzon_correo_resolver"(p_token text)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
  SELECT b.tenant_id FROM "core"."buzones_correo" b
  WHERE p_token ~ '^t[0-9a-f]{32}$' AND b.token = p_token LIMIT 1
$$;
REVOKE ALL ON FUNCTION "core"."buzon_correo_resolver"(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "core"."buzon_correo_resolver"(text) TO opai_app;

COMMIT;

-- Reversión (manual, con el rol propietario, en una transacción):
--   DROP FUNCTION IF EXISTS "core"."buzon_correo_resolver"(text);
--   DROP TABLE IF EXISTS "core"."correos_cliente", "core"."buzones_correo";
-- Solo elimina objetos nuevos de esta migración; nada existente depende de ellos. Si ya hay correos
-- registrados y se quieren conservar, restaurar desde el snapshot previo de Neon en vez de borrar.
