-- CAR-221 · Información completa al emitir (instrucción de Carlos del 8-nov-2026, referencia de OPAI 1.0).
-- Aditiva y reversible: solo columnas nuevas y nulas en tablas existentes, que ya tienen RLS + política
-- tenant_isolation (no se crean tablas). Nada se reescribe; los documentos anteriores quedan con las columnas en NULL.
--   · documentos_emitidos_lineas: cantidad, unidad, precio unitario y descuento de cada línea (hoy solo glosa y monto).
--   · dte_config: código de actividad económica (ACTECO) y oficina del SII del emisor.
--   · perfil_empresa: ciudad del emisor.
-- Reversión: ALTER TABLE ... DROP COLUMN de cada una (todas nulas, sin dependencias).
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "finanzas"."documentos_emitidos_lineas"
    ADD COLUMN "cantidad" DECIMAL(14,4),
    ADD COLUMN "unidad" TEXT,
    ADD COLUMN "precio_unitario" INTEGER,
    ADD COLUMN "descuento_pct" INTEGER,
    ADD CONSTRAINT "documentos_emitidos_lineas_cantidad_chk" CHECK ("cantidad" IS NULL OR "cantidad" > 0),
    ADD CONSTRAINT "documentos_emitidos_lineas_unidad_chk" CHECK ("unidad" IS NULL OR length("unidad") BETWEEN 1 AND 20),
    ADD CONSTRAINT "documentos_emitidos_lineas_precio_chk" CHECK ("precio_unitario" IS NULL OR "precio_unitario" >= 0),
    ADD CONSTRAINT "documentos_emitidos_lineas_descuento_chk" CHECK ("descuento_pct" IS NULL OR "descuento_pct" BETWEEN 0 AND 10000);

ALTER TABLE "finanzas"."dte_config"
    ADD COLUMN "acteco" INTEGER,
    ADD COLUMN "oficina_sii" TEXT,
    ADD CONSTRAINT "dte_config_acteco_chk" CHECK ("acteco" IS NULL OR "acteco" BETWEEN 1 AND 999999),
    ADD CONSTRAINT "dte_config_oficina_sii_chk" CHECK ("oficina_sii" IS NULL OR length("oficina_sii") BETWEEN 1 AND 60);

ALTER TABLE "core"."perfil_empresa" ADD COLUMN "ciudad" TEXT;

COMMIT;
