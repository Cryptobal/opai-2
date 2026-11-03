-- CAR-25 (B1) · La programación recurrente toma la forma real de 1.0 (FinanceDteRecurringTemplate).
-- ADITIVA: columnas y tabla nuevas, y relajación de CHECK existentes (no destruye datos).
-- No edita 20261103140000. Las tablas existentes ya tienen RLS FORCE y su política.

BEGIN;
SET LOCAL lock_timeout = '5s';

-- ── Programación ───────────────────────────────────────────────────────────────
ALTER TABLE "finanzas"."ventas_programaciones"
  ADD COLUMN "dia_semana" INTEGER,
  ADD COLUMN "mes_del_anio" INTEGER,
  ADD COLUMN "fecha_inicio" DATE,
  ADD COLUMN "fecha_fin" DATE,
  ADD COLUMN "politica_uf" TEXT,
  ADD COLUMN "dia_uf" INTEGER,
  ADD COLUMN "ajuste_ipc_meses" INTEGER,
  ADD COLUMN "ajuste_ipc_desde" DATE,
  ADD COLUMN "envio_automatico" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "receptor_rut" TEXT,
  ADD COLUMN "receptor_razon_social" TEXT,
  ADD COLUMN "receptor_giro" TEXT,
  ADD COLUMN "receptor_direccion" TEXT,
  ADD COLUMN "receptor_comuna" TEXT,
  ADD COLUMN "receptor_ciudad" TEXT,
  ADD COLUMN "ultimo_periodo_1_0" TEXT;

-- Programaciones sin cuenta en 2.0: quedan con el receptor congelado.
ALTER TABLE "finanzas"."ventas_programaciones" ALTER COLUMN "cuenta_id" DROP NOT NULL;
ALTER TABLE "finanzas"."ventas_programaciones" ADD CONSTRAINT "ventas_programaciones_cuenta_o_receptor_chk"
  CHECK ("cuenta_id" IS NOT NULL OR "receptor_rut" IS NOT NULL);

-- Relajar (no destruir): tipos 33, 34, 56 y 61; día de generación 1–31 o -1 (último día).
ALTER TABLE "finanzas"."ventas_programaciones" DROP CONSTRAINT "ventas_programaciones_tipo_dte_chk";
ALTER TABLE "finanzas"."ventas_programaciones" ADD CONSTRAINT "ventas_programaciones_tipo_dte_chk"
  CHECK ("tipo_dte" IN (33, 34, 56, 61));
ALTER TABLE "finanzas"."ventas_programaciones" DROP CONSTRAINT "ventas_programaciones_dia_generacion_chk";
ALTER TABLE "finanzas"."ventas_programaciones" ADD CONSTRAINT "ventas_programaciones_dia_generacion_chk"
  CHECK ("dia_generacion" = -1 OR "dia_generacion" BETWEEN 1 AND 31);

ALTER TABLE "finanzas"."ventas_programaciones" ADD CONSTRAINT "ventas_programaciones_frecuencia_chk"
  CHECK ("frecuencia" IN ('mensual', 'quincenal', 'semanal', 'anual'));
ALTER TABLE "finanzas"."ventas_programaciones" ADD CONSTRAINT "ventas_programaciones_moneda_chk"
  CHECK ("moneda" IN ('CLP', 'UF'));
ALTER TABLE "finanzas"."ventas_programaciones" ADD CONSTRAINT "ventas_programaciones_dia_semana_chk"
  CHECK ("dia_semana" IS NULL OR "dia_semana" BETWEEN 0 AND 6);
ALTER TABLE "finanzas"."ventas_programaciones" ADD CONSTRAINT "ventas_programaciones_mes_del_anio_chk"
  CHECK ("mes_del_anio" IS NULL OR "mes_del_anio" BETWEEN 1 AND 12);
ALTER TABLE "finanzas"."ventas_programaciones" ADD CONSTRAINT "ventas_programaciones_politica_uf_chk"
  CHECK ("politica_uf" IS NULL OR "politica_uf" IN
    ('RUN_DAY', 'LAST_DAY_PREV_MONTH', 'FIRST_DAY_MONTH', 'LAST_DAY_MONTH', 'CUSTOM_DAY'));
ALTER TABLE "finanzas"."ventas_programaciones" ADD CONSTRAINT "ventas_programaciones_dia_uf_chk"
  CHECK ("dia_uf" IS NULL OR "dia_uf" BETWEEN 1 AND 31);
ALTER TABLE "finanzas"."ventas_programaciones" ADD CONSTRAINT "ventas_programaciones_ajuste_ipc_chk"
  CHECK ("ajuste_ipc_meses" IS NULL OR "ajuste_ipc_meses" BETWEEN 1 AND 60);
ALTER TABLE "finanzas"."ventas_programaciones" ADD CONSTRAINT "ventas_programaciones_ultimo_periodo_chk"
  CHECK ("ultimo_periodo_1_0" IS NULL OR "ultimo_periodo_1_0" ~ '^[0-9]{4}-[0-9]{2}(-[0-9]{2})?$');

-- ── Líneas ─────────────────────────────────────────────────────────────────────
-- `monto` queda solo por compatibilidad: ya no se exige. Precios: cantidad NUMERIC(14,4),
-- CLP entero o UF escalada (UF_ESCALA), descuento en centésimas de punto porcentual.
ALTER TABLE "finanzas"."ventas_programaciones_lineas" ALTER COLUMN "monto" DROP NOT NULL;
ALTER TABLE "finanzas"."ventas_programaciones_lineas"
  ADD COLUMN "cantidad" NUMERIC(14,4) NOT NULL DEFAULT 1,
  ADD COLUMN "unidad" TEXT,
  ADD COLUMN "precio_unitario_clp" BIGINT,
  ADD COLUMN "precio_unitario_uf" BIGINT,
  ADD COLUMN "descuento_pct" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "exento" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "cuenta_contable_id" UUID;

-- Líneas del modelo anterior: su monto pasa a precio unitario CLP.
UPDATE "finanzas"."ventas_programaciones_lineas"
  SET "precio_unitario_clp" = "monto" WHERE "monto" IS NOT NULL;

-- NOT VALID: exige la regla a toda fila nueva o modificada sin reescanear las existentes.
ALTER TABLE "finanzas"."ventas_programaciones_lineas" ADD CONSTRAINT "ventas_programaciones_lineas_un_precio_chk"
  CHECK (("precio_unitario_clp" IS NULL) <> ("precio_unitario_uf" IS NULL)) NOT VALID;
ALTER TABLE "finanzas"."ventas_programaciones_lineas" ADD CONSTRAINT "ventas_programaciones_lineas_valores_chk"
  CHECK ("cantidad" >= 0 AND "descuento_pct" BETWEEN 0 AND 10000
    AND ("precio_unitario_clp" IS NULL OR "precio_unitario_clp" >= 0)
    AND ("precio_unitario_uf" IS NULL OR "precio_unitario_uf" >= 0)) NOT VALID;

ALTER TABLE "finanzas"."ventas_programaciones_lineas" ADD CONSTRAINT "ventas_programaciones_lineas_cuenta_contable_id_fkey"
  FOREIGN KEY ("cuenta_contable_id") REFERENCES "finanzas"."cuentas_contables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- El precio de la línea debe corresponder a la moneda de su programación (CLP o UF).
CREATE OR REPLACE FUNCTION "finanzas"."verificar_moneda_linea_programacion"() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  m text;
BEGIN
  SELECT "moneda" INTO m FROM "finanzas"."ventas_programaciones" WHERE "id" = NEW."programacion_id";
  IF m = 'UF' AND NEW."precio_unitario_uf" IS NULL THEN
    RAISE EXCEPTION 'la línea de una programación en UF requiere precio en UF' USING ERRCODE = 'check_violation';
  END IF;
  IF m = 'CLP' AND NEW."precio_unitario_clp" IS NULL THEN
    RAISE EXCEPTION 'la línea de una programación en CLP requiere precio en CLP' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER moneda_linea BEFORE INSERT OR UPDATE ON "finanzas"."ventas_programaciones_lineas"
  FOR EACH ROW EXECUTE FUNCTION "finanzas"."verificar_moneda_linea_programacion"();

-- Cuenta contable de la línea dentro del mismo tenant (el trigger existente se reemplaza con más pares).
DROP TRIGGER mismo_tenant ON "finanzas"."ventas_programaciones_lineas";
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "finanzas"."ventas_programaciones_lineas"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"(
    'programacion_id', 'finanzas.ventas_programaciones', 'cuenta_contable_id', 'finanzas.cuentas_contables');

-- ── Destinatarios por correo (además de contactos) ─────────────────────────────
ALTER TABLE "finanzas"."ventas_programaciones_destinatarios" ALTER COLUMN "contacto_id" DROP NOT NULL;
ALTER TABLE "finanzas"."ventas_programaciones_destinatarios"
  ADD COLUMN "correo" TEXT,
  ADD COLUMN "tipo" TEXT NOT NULL DEFAULT 'para';
ALTER TABLE "finanzas"."ventas_programaciones_destinatarios" ADD CONSTRAINT "ventas_programaciones_destinatarios_contacto_o_correo_chk"
  CHECK ("contacto_id" IS NOT NULL OR "correo" IS NOT NULL);
ALTER TABLE "finanzas"."ventas_programaciones_destinatarios" ADD CONSTRAINT "ventas_programaciones_destinatarios_tipo_chk"
  CHECK ("tipo" IN ('para', 'cc'));
CREATE UNIQUE INDEX "vp_destinatarios_tenant_prog_correo_key"
  ON "finanzas"."ventas_programaciones_destinatarios"("tenant_id", "programacion_id", "correo");

-- ── Corridas idempotentes: una por programación y período ──────────────────────
CREATE TABLE "finanzas"."ventas_programaciones_corridas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "programacion_id" UUID NOT NULL,
    "periodo" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ventas_programaciones_corridas_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ventas_programaciones_corridas_programacion_periodo_key"
  ON "finanzas"."ventas_programaciones_corridas"("programacion_id", "periodo");
CREATE INDEX "ventas_programaciones_corridas_tenant_id_idx"
  ON "finanzas"."ventas_programaciones_corridas"("tenant_id");
ALTER TABLE "finanzas"."ventas_programaciones_corridas" ADD CONSTRAINT "ventas_programaciones_corridas_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finanzas"."ventas_programaciones_corridas" ADD CONSTRAINT "ventas_programaciones_corridas_programacion_id_fkey"
  FOREIGN KEY ("programacion_id") REFERENCES "finanzas"."ventas_programaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finanzas"."ventas_programaciones_corridas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finanzas"."ventas_programaciones_corridas" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "finanzas"."ventas_programaciones_corridas" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "finanzas"."ventas_programaciones_corridas"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('programacion_id', 'finanzas.ventas_programaciones');

COMMIT;

-- Reversión (manual, rol propietario; solo si aún no hay filas con la forma nueva):
--   DROP TABLE "finanzas"."ventas_programaciones_corridas";
--   DROP TRIGGER moneda_linea ON "finanzas"."ventas_programaciones_lineas";
--   DROP FUNCTION "finanzas"."verificar_moneda_linea_programacion"();
--   (columnas nuevas: DROP COLUMN; restaurar CHECK 33/34 y 1–31, y NOT NULL de cuenta_id y monto)
