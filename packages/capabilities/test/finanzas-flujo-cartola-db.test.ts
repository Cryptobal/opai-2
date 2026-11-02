// Flujo v2 PR A: semana pasada = real según cartola; migración sin cierre (up/down/up).
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { capacidades } from "../../../modules/finanzas/capacidades";
import { ETIQUETAS_FLUJO } from "@opai/domain";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

const MIGRATION = join(
  process.cwd(),
  "packages/db/prisma/migrations/20261103000000_finanzas_flujo_sin_cierre/migration.sql",
);

describe.skipIf(omitirSuiteDb())("Finanzas · flujo sin cierre (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantId = "";
  const usuarioId = randomUUID();
  const medidor = { registrar: async () => undefined };

  const ctx = (tid = tenantId) =>
    mod.crearContexto({
      tenantId: tid,
      actor: { tipo: "user", id: usuarioId },
      usuario: { id: usuarioId, nombre: "Admin", email: "flujo@cartola.test", platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol: "owner",
      modulosActivos: ["finanzas"],
      medidor,
    });

  const ok = async <T>(id: string, input: unknown, opts?: { dryRun?: boolean }) => {
    const r = await mod.executeCapability(ctx(), id, input, opts);
    if (!r.ok) throw new Error(`${id}: ${r.error.code} ${r.error.message}`);
    return r.data as T;
  };

  beforeAll(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-09T12:00:00Z"));
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(capacidades);
    tenantId = (
      await e.admin.tenant.create({
        data: {
          slug: `flujo-cart-${randomUUID().slice(0, 8)}`,
          nombre: "Flujo Cartola QA SpA",
          vertical: "seguridad",
        },
      })
    ).id;
    await e.admin.user.create({
      data: { id: usuarioId, email: `u-${randomUUID().slice(0, 8)}@flujo.test`, name: "u" },
    });
    await ok("finanzas.ajustes.actualizar", { saldoInicial: 0, desde: "2026-10-26" });
    await ok("finanzas.filas.crear", {
      seccion: "ingreso",
      etiqueta: ETIQUETAS_FLUJO.cobrosSinFila,
      arrastre: true,
    });
    const cuentaId = (
      await ok<{ id: string }>("finanzas.bancos.guardar", {
        banco: "Banco QA",
        numeroVisible: "99001122",
      })
    ).id;
    const filaId = (await e.admin.flujoFila.findFirst({ where: { tenantId } }))!.id;
    const mov = await e.admin.movimientoBancario.create({
      data: {
        tenantId,
        cuentaId,
        fecha: new Date("2026-10-28T12:00:00.000Z"),
        monto: BigInt(250_000),
        glosa: "Abono cartola QA",
        claveDedupe: randomUUID(),
        estado: "pendiente",
        origen: "cartola",
      },
    });
    await ok("finanzas.conciliaciones.confirmar", {
      movimientoId: mov.id,
      enlaces: [{ tipo: "flujo_fila", id: filaId, monto: 250_000 }],
    });
  });

  afterAll(async () => {
    vi.useRealTimers();
    await e?.cerrar();
  });

  it("la semana pasada en planilla coincide con la cartola conciliada", async () => {
    const semanaPasada = "2026-10-26";
    const planilla = await ok<{
      celdas: { semana: string; monto: number; capa: string }[];
      semanas: { semana: string; pasada: boolean; ingresos: number }[];
    }>("finanzas.planilla.obtener", { desde: semanaPasada, semanas: 3 });
    const sem = planilla.semanas.find((s) => s.semana === semanaPasada);
    expect(sem?.pasada).toBe(true);
    expect(sem?.ingresos).toBe(250_000);
    const reales = planilla.celdas.filter((c) => c.semana === semanaPasada && c.capa === "real");
    expect(reales.reduce((s, c) => s + c.monto, 0)).toBe(250_000);
  });

  it("migración 20261103000000 aplica, revierte y vuelve a aplicar", async () => {
    const sql = readFileSync(MIGRATION, "utf8");
    const up = sql.split("-- Reversión:")[0]!;
    const down = `
BEGIN;
SET LOCAL lock_timeout = '5s';
COMMENT ON COLUMN "finanzas"."flujo_ajustes"."tolerancia_cierre" IS NULL;
COMMENT ON COLUMN "finanzas"."flujo_ajustes"."metas_visibles" IS NULL;
ALTER TABLE "finanzas"."flujo_ajustes" ALTER COLUMN "metas_visibles" SET DEFAULT true;
COMMIT;
`;
    await e.admin.$executeRawUnsafe(up);
    const comentario = await e.admin.$queryRaw<{ description: string | null }[]>`
      SELECT col_description('finanzas.flujo_ajustes'::regclass, attnum) AS description
      FROM pg_attribute
      WHERE attrelid = 'finanzas.flujo_ajustes'::regclass AND attname = 'tolerancia_cierre'
    `;
    expect(comentario[0]?.description ?? "").toContain("desuso");
    await e.admin.$executeRawUnsafe(down);
    await e.admin.$executeRawUnsafe(up);
  });
});
