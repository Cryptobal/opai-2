-- Opciones de la programación antes de la factura (CAR-221): cuándo salen la proforma y el estado de pago,
-- esperar el OK del cliente (opcional) y exigir OC. Solo columnas nuevas, con DEFAULT: las filas existentes quedan
-- con el comportamiento de hoy (envío al generar, sin exigir OC) y los seguimientos existentes siguen exigiendo el OK.
-- Las tablas ya tienen RLS y su política `tenant_isolation`; no se crean tablas ni se toca ninguna política.
-- Reversión: DROP COLUMN de cada una (sin dependencias).
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "finanzas"."ventas_programaciones"
    ADD COLUMN "esperar_ok" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "exige_oc" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "previo_cuando" TEXT NOT NULL DEFAULT 'generar',
    ADD COLUMN "previo_dia" INTEGER,
    ADD CONSTRAINT "ventas_programaciones_previo_cuando_chk" CHECK ("previo_cuando" IN ('generar', 'fecha_acordada')),
    ADD CONSTRAINT "ventas_programaciones_previo_dia_chk" CHECK ("previo_dia" IS NULL OR "previo_dia" BETWEEN 1 AND 31),
    ADD CONSTRAINT "ventas_programaciones_previo_dia_coherente_chk" CHECK ("previo_cuando" = 'generar' OR "previo_dia" IS NOT NULL);

ALTER TABLE "finanzas"."ventas_cierre_seguimientos"
    ADD COLUMN "requiere_ok" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "finanzas"."ventas_programaciones_corridas"
    ADD COLUMN "previos_enviar_en" DATE,
    ADD COLUMN "previos_enviados_en" TIMESTAMPTZ(6);

COMMIT;
