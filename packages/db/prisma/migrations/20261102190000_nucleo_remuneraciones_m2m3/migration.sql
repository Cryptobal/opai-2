-- CAR-142 · Motor de sueldos M2+M3: indicadores de plataforma, capturas, valores tenant y perfil mutual.
-- Seed verificado al 2-nov-2026 (fuentes del brief 07e M1). IPS 60 UF en topes: por_verificar.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE IF NOT EXISTS "core"."indicadores_legales" (
  "id" UUID NOT NULL,
  "clave" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "unidad" TEXT NOT NULL,
  "periodicidad" TEXT NOT NULL,
  "fuente_primaria" TEXT NOT NULL,
  "fuente_contraste" TEXT,
  "regla_validacion" JSONB,
  "lectura_automatica" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "indicadores_legales_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "indicadores_legales_clave_key" UNIQUE ("clave")
);

CREATE TABLE IF NOT EXISTS "core"."valores_publicados" (
  "id" UUID NOT NULL,
  "indicador_id" UUID NOT NULL,
  "valor_json" JSONB NOT NULL,
  "vigente_desde" DATE NOT NULL,
  "vigente_hasta" DATE,
  "evidencia" TEXT,
  "estado" TEXT NOT NULL DEFAULT 'vigente',
  "fuente" TEXT NOT NULL,
  "consultada_el" DATE,
  "verificacion" TEXT NOT NULL DEFAULT 'verificado',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "valores_publicados_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "valores_publicados_estado_check" CHECK ("estado" IN ('vigente', 'retenido', 'propuesto', 'rechazado'))
);

CREATE TABLE IF NOT EXISTS "core"."capturas_indicador" (
  "id" UUID NOT NULL,
  "indicador_id" UUID NOT NULL,
  "capturado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fuente_consultada" TEXT NOT NULL,
  "valor_leido_json" JSONB,
  "valor_vigente_id" UUID,
  "diferencia" TEXT,
  "resultado" TEXT NOT NULL,
  "alerta_emitida" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "capturas_indicador_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "core"."valores_tenant" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "indicador_id" UUID NOT NULL,
  "valor_json" JSONB NOT NULL,
  "vigente_desde" DATE NOT NULL,
  "vigente_hasta" DATE,
  "motivo" TEXT,
  "evidencia" TEXT,
  "origen" TEXT NOT NULL DEFAULT 'sigue_fuente',
  "estado" TEXT NOT NULL DEFAULT 'propuesto',
  "confirmado_por_id" UUID,
  "confirmado_en" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "valores_tenant_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "valores_tenant_estado_check" CHECK ("estado" IN ('propuesto', 'vigente', 'retenido', 'rechazado')),
  CONSTRAINT "valores_tenant_origen_check" CHECK ("origen" IN ('sigue_fuente', 'propio'))
);

CREATE TABLE IF NOT EXISTS "core"."remuneraciones_perfil" (
  "tenant_id" UUID NOT NULL,
  "mutual_adicional_escalada" INTEGER,
  "mutual_adicional_estado" TEXT NOT NULL DEFAULT 'pendiente',
  "mutual_confirmado_por_id" UUID,
  "mutual_confirmado_en" TIMESTAMPTZ(6),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "remuneraciones_perfil_pkey" PRIMARY KEY ("tenant_id"),
  CONSTRAINT "remuneraciones_perfil_mutual_estado_check" CHECK ("mutual_adicional_estado" IN ('pendiente', 'vigente'))
);

CREATE INDEX IF NOT EXISTS "valores_publicados_indicador_vigente_idx"
  ON "core"."valores_publicados"("indicador_id", "vigente_desde");
CREATE INDEX IF NOT EXISTS "capturas_indicador_indicador_idx"
  ON "core"."capturas_indicador"("indicador_id", "capturado_en");
CREATE INDEX IF NOT EXISTS "valores_tenant_tenant_indicador_idx"
  ON "core"."valores_tenant"("tenant_id", "indicador_id", "vigente_desde");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'valores_publicados_indicador_id_fkey') THEN
    ALTER TABLE "core"."valores_publicados" ADD CONSTRAINT "valores_publicados_indicador_id_fkey"
      FOREIGN KEY ("indicador_id") REFERENCES "core"."indicadores_legales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'capturas_indicador_indicador_id_fkey') THEN
    ALTER TABLE "core"."capturas_indicador" ADD CONSTRAINT "capturas_indicador_indicador_id_fkey"
      FOREIGN KEY ("indicador_id") REFERENCES "core"."indicadores_legales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'valores_tenant_tenant_id_fkey') THEN
    ALTER TABLE "core"."valores_tenant" ADD CONSTRAINT "valores_tenant_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'valores_tenant_indicador_id_fkey') THEN
    ALTER TABLE "core"."valores_tenant" ADD CONSTRAINT "valores_tenant_indicador_id_fkey"
      FOREIGN KEY ("indicador_id") REFERENCES "core"."indicadores_legales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'remuneraciones_perfil_tenant_id_fkey') THEN
    ALTER TABLE "core"."remuneraciones_perfil" ADD CONSTRAINT "remuneraciones_perfil_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- RLS tenant (11 indicadores del dominio 07e).
INSERT INTO "core"."indicadores_legales" ("id", "clave", "nombre", "unidad", "periodicidad", "fuente_primaria", "fuente_contraste", "lectura_automatica")
VALUES
  ('a1000001-0001-4001-8001-000000000001', 'uf', 'Unidad de Fomento', 'centavos', 'diaria', 'SII', 'Banco Central', true),
  ('a1000001-0001-4001-8001-000000000002', 'utm', 'Unidad Tributaria Mensual', 'clp', 'mensual', 'SII', 'Banco Central', true),
  ('a1000001-0001-4001-8001-000000000003', 'imm', 'Ingreso mínimo mensual', 'clp', 'ley', 'Diario Oficial / DT', NULL, false),
  ('a1000001-0001-4001-8001-000000000004', 'topes', 'Topes previsionales', 'uf_escalada', 'anual', 'Superintendencia de Pensiones', NULL, false),
  ('a1000001-0001-4001-8001-000000000005', 'afp', 'AFP y salud obligatoria', 'tasa_escalada', 'ley', 'Superintendencia de Pensiones', NULL, false),
  ('a1000001-0001-4001-8001-000000000006', 'sis', 'Seguro de invalidez (SIS)', 'tasa_escalada', 'licitacion', 'Superintendencia de Pensiones', NULL, false),
  ('a1000001-0001-4001-8001-000000000007', 'reforma', 'Reforma previsional empleador', 'tasa_escalada', 'ley', 'Ley 21.735', NULL, false),
  ('a1000001-0001-4001-8001-000000000008', 'cesantia', 'Seguro de cesantía', 'tasa_escalada', 'ley', 'Ley 19.728 / DT', NULL, false),
  ('a1000001-0001-4001-8001-000000000009', 'mutual', 'Mutual y SANNA', 'tasa_escalada', 'ley', 'Ley 16.744 / SUSESO', NULL, false),
  ('a1000001-0001-4001-8001-00000000000a', 'jornada', 'Jornada legal', 'horas', 'ley', 'Ley 21.561 / DT', NULL, false),
  ('a1000001-0001-4001-8001-00000000000b', 'impuesto', 'Impuesto único segunda categoría', 'utm_escalada', 'ley', 'SII', NULL, false)
ON CONFLICT ("clave") DO NOTHING;

-- Valores publicados verificados (consulta 1-nov-2026; topes incluye IPS 60 UF por_verificar en metadata).
INSERT INTO "core"."valores_publicados" ("id", "indicador_id", "valor_json", "vigente_desde", "estado", "fuente", "consultada_el", "verificacion")
SELECT gen_random_uuid(), i.id, v.valor::jsonb, v.desde::date, 'vigente', v.fuente, DATE '2026-11-01', v.verif
FROM (VALUES
  ('uf', '4123701', '2026-10-29', 'https://www.sii.cl/valores_y_fechas/uf/uf2026.htm', 'verificado'),
  ('utm', '72151', '2026-10-01', 'https://www.sii.cl/valores_y_fechas/utm/utm2026.htm', 'verificado'),
  ('imm', '553553', '2026-05-01', 'https://www.bcn.cl/leychile/Navegar?idNorma=1225354', 'verificado'),
  ('topes', '{"pensionSaludUf":900000,"ipsUf":600000,"cesantiaUf":1352000,"indemnizacionUf":900000,"ipsPorVerificar":true}', '2026-02-01', 'https://www.spensiones.cl/portal/institucional/594/articles-16921_recurso_1.pdf', 'verificado'),
  ('afp', '{"obligatoria":100000,"salud":70000,"comisiones":{"uno":4600,"modelo":5800,"planvital":11600,"habitat":12700,"capital":14400,"cuprum":14400,"provida":14500}}', '2026-08-01', 'https://www.spensiones.cl/portal/institucional/594/w3-propertyvalue-9893.html', 'verificado'),
  ('sis', '17800', '2026-08-01', 'https://www.spensiones.cl/portal/institucional/594/w3-propertyvalue-9893.html', 'verificado'),
  ('reforma', '{"tasa":35000,"incluyeSis":true}', '2026-08-01', 'https://www.spensiones.cl/portal/institucional/594/w3-propertyvalue-9893.html', 'verificado'),
  ('cesantia', '{"indefinidoEmpleador":24000,"plazoFijoEmpleador":30000,"indefinidoTrabajador":6000}', '2026-01-01', 'https://dt.gob.cl/portal/1628/w3-article-95306.html', 'verificado'),
  ('mutual', '{"basica":9000,"sanna":300}', '2026-01-01', 'https://www.suseso.gob.cl/606/w3-article-18613.html', 'verificado'),
  ('jornada', '42', '2026-04-26', 'https://www.mintrab.gob.cl/40horas-implementacion/', 'verificado'),
  ('impuesto', '[{"hastaUtm":135000,"tasa":0,"rebajaUtm":0},{"hastaUtm":300000,"tasa":40000,"rebajaUtm":5400},{"hastaUtm":500000,"tasa":80000,"rebajaUtm":17400},{"hastaUtm":700000,"tasa":135000,"rebajaUtm":44900},{"hastaUtm":900000,"tasa":230000,"rebajaUtm":111400},{"hastaUtm":1200000,"tasa":304000,"rebajaUtm":178000},{"hastaUtm":3100000,"tasa":350000,"rebajaUtm":233200},{"hastaUtm":null,"tasa":400000,"rebajaUtm":388200}]', '2026-01-01', 'https://www.sii.cl/valores_y_fechas/impuesto_2da_categoria/impuesto2026.htm', 'verificado')
) AS v(clave, valor, desde, fuente, verif)
JOIN "core"."indicadores_legales" i ON i.clave = v.clave
WHERE NOT EXISTS (
  SELECT 1 FROM "core"."valores_publicados" p
  WHERE p.indicador_id = i.id AND p.vigente_desde = v.desde::date
);

GRANT SELECT, INSERT, UPDATE, DELETE ON "core"."valores_tenant" TO opai_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "core"."remuneraciones_perfil" TO opai_app;

ALTER TABLE "core"."valores_tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."valores_tenant" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "core"."valores_tenant";
CREATE POLICY tenant_isolation ON "core"."valores_tenant" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core"."remuneraciones_perfil" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."remuneraciones_perfil" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "core"."remuneraciones_perfil";
CREATE POLICY tenant_isolation ON "core"."remuneraciones_perfil" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

REVOKE ALL ON "core"."indicadores_legales" FROM opai_app;
GRANT SELECT ON "core"."indicadores_legales" TO opai_app;
REVOKE ALL ON "core"."valores_publicados" FROM opai_app;
GRANT SELECT ON "core"."valores_publicados" TO opai_app;
REVOKE ALL ON "core"."capturas_indicador" FROM opai_app;
GRANT SELECT, INSERT ON "core"."capturas_indicador" TO opai_app;

COMMIT;

-- Reversión: requiere snapshot de Neon previo (tablas nuevas y seed de indicadores/valores publicados).
-- BEGIN;
-- SET LOCAL lock_timeout = '5s';
-- DROP TABLE IF EXISTS "core"."remuneraciones_perfil";
-- DROP TABLE IF EXISTS "core"."valores_tenant";
-- DROP TABLE IF EXISTS "core"."capturas_indicador";
-- DROP TABLE IF EXISTS "core"."valores_publicados";
-- DROP TABLE IF EXISTS "core"."indicadores_legales";
-- COMMIT;
