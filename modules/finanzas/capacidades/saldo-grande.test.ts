import { executeCapability, registrarCapacidades } from "@opai/capabilities";
import { contextoDePrueba } from "@opai/capabilities/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ACTIVOS, FILA_ING, S0, semilla } from "./fixtures";
import { capacidades } from "./index";

beforeAll(() => registrarCapacidades(capacidades));

const MONTO_MAX = 2_000_000_000;

/** V205-01 / CAR-139: saldo acumulado > 2.000 millones (misma capacidad que pantalla y MCP). */
describe("finanzas flujo · saldos acumulados grandes", () => {
  it("planilla.obtener y cierres.sellar no devuelven INVALID_OUTPUT", async () => {
    const { ctx } = contextoDePrueba({ semilla: semilla(), modulosActivos: ACTIVOS });
    const creada = await executeCapability(ctx, "finanzas.filas.crear", {
      seccion: "ingreso",
      etiqueta: "Cliente B",
      arrastre: false,
    });
    if (!creada.ok) throw new Error(JSON.stringify(creada));
    const filaExtra = (creada as { ok: true; data: { id: string } }).data.id;
    for (const filaId of [FILA_ING, filaExtra]) {
      const f = await executeCapability(ctx, "finanzas.celdas.fijar", {
        filaId,
        semana: S0,
        monto: MONTO_MAX,
      });
      expect(f).toMatchObject({ ok: true });
    }
    const saldoEsperado = 100 + MONTO_MAX + MONTO_MAX - 300;
    const planilla = await executeCapability(ctx, "finanzas.planilla.obtener", { semanas: 1 });
    if (!planilla.ok) throw new Error(JSON.stringify(planilla));
    const sem = (planilla.data as { semanas: { saldoFinal: number }[] }).semanas;
    expect(sem[0]?.saldoFinal).toBe(saldoEsperado);
    const cierre = await executeCapability(
      ctx,
      "finanzas.cierres.sellar",
      { semana: S0, saldoBanco: saldoEsperado },
      { dryRun: true },
    );
    expect(cierre).toMatchObject({
      ok: true,
      data: { saldoSugerido: saldoEsperado, diferencia: 0 },
    });
  });
});
