-- Brief 11 · Puestos PR 1 (el puesto como posición, ADR-036). Migración ADITIVA: agrega los
-- catálogos PatronTurno y FuncionPuesto por tenant (con RLS tenant_isolation) y amplía el puesto
-- (función, patrón, tramo de noche, horas semanales, colación y cobertura PPC). La columna
-- `dotacion` queda DEPRECADA (no se borra). Siembra los 6 patrones de fábrica por tenant.

-- CreateTable
CREATE TABLE "core"."patrones_turno" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "clase" TEXT NOT NULL DEFAULT 'ciclico',
    "dias_trabajo" INTEGER NOT NULL,
    "dias_descanso" INTEGER NOT NULL,
    "dias_semana" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "de_fabrica" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "patrones_turno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."funciones_puesto" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "vertical" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "funciones_puesto_pkey" PRIMARY KEY ("id")
);

-- AlterTable: el puesto como posición (campos nuevos, todos aditivos)
ALTER TABLE "core"."puestos"
    ADD COLUMN "funcion_id" UUID,
    ADD COLUMN "patron_id" UUID,
    ADD COLUMN "hora_inicio_noche" TEXT,
    ADD COLUMN "hora_fin_noche" TEXT,
    ADD COLUMN "horas_semanales" DECIMAL(5,2),
    ADD COLUMN "colacion_min" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "colacion_fuera" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "cobertura" TEXT NOT NULL DEFAULT 'ppc',
    ADD COLUMN "cobertura_motivo" TEXT DEFAULT 'sin_asignar';

-- CreateIndex
CREATE UNIQUE INDEX "patrones_turno_tenant_id_nombre_key" ON "core"."patrones_turno"("tenant_id", "nombre");
CREATE INDEX "patrones_turno_tenant_id_activo_idx" ON "core"."patrones_turno"("tenant_id", "activo");
CREATE UNIQUE INDEX "funciones_puesto_tenant_id_nombre_key" ON "core"."funciones_puesto"("tenant_id", "nombre");
CREATE INDEX "funciones_puesto_tenant_id_activo_idx" ON "core"."funciones_puesto"("tenant_id", "activo");
CREATE INDEX "puestos_tenant_id_patron_id_idx" ON "core"."puestos"("tenant_id", "patron_id");
CREATE INDEX "puestos_tenant_id_funcion_id_idx" ON "core"."puestos"("tenant_id", "funcion_id");

-- AddForeignKey (tenant_id va en el SQL, sin @relation en Prisma; ADR-036)
ALTER TABLE "core"."patrones_turno" ADD CONSTRAINT "patrones_turno_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core"."funciones_puesto" ADD CONSTRAINT "funciones_puesto_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core"."puestos" ADD CONSTRAINT "puestos_funcion_id_fkey" FOREIGN KEY ("funcion_id") REFERENCES "core"."funciones_puesto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "core"."puestos" ADD CONSTRAINT "puestos_patron_id_fkey" FOREIGN KEY ("patron_id") REFERENCES "core"."patrones_turno"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RLS tenant_isolation en las dos tablas nuevas (no negociable)
ALTER TABLE "core"."patrones_turno" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."patrones_turno" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core"."funciones_puesto" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."funciones_puesto" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- Siembra idempotente de los 6 patrones de fábrica por tenant (4×4, 7×7, 14×14, 5×2, 2×5, 3×4).
-- Corre como el rol propietario de la migración (no opai_app): la RLS no la bloquea.
INSERT INTO "core"."patrones_turno"
  ("id", "tenant_id", "nombre", "clase", "dias_trabajo", "dias_descanso", "dias_semana", "de_fabrica", "activo", "orden", "created_at", "updated_at")
SELECT gen_random_uuid(), t."id", p.nombre, p.clase, p.dias_trabajo, p.dias_descanso, p.dias_semana, true, true, p.orden, now(), now()
FROM "core"."tenants" t
CROSS JOIN (VALUES
  ('4×4',   'ciclico', 4,  4,  ARRAY[]::INTEGER[],        0),
  ('7×7',   'ciclico', 7,  7,  ARRAY[]::INTEGER[],        1),
  ('14×14', 'ciclico', 14, 14, ARRAY[]::INTEGER[],        2),
  ('5×2',   'semanal', 5,  2,  ARRAY[1,2,3,4,5]::INTEGER[], 3),
  ('2×5',   'semanal', 2,  5,  ARRAY[6,7]::INTEGER[],       4),
  ('3×4',   'ciclico', 3,  4,  ARRAY[]::INTEGER[],        5)
) AS p(nombre, clase, dias_trabajo, dias_descanso, dias_semana, orden)
ON CONFLICT ("tenant_id", "nombre") DO NOTHING;
