import { executeCapability, registrarCapacidades } from "@opai/capabilities";
import { contextoDePrueba } from "@opai/capabilities/testing";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { ACTIVOS, FILA_ING, S0, semilla } from "./fixtures";
import { MONTO_FLUJO_MAX } from "./esquemas";
import { capacidades } from "./index";

beforeAll(() => {
  registrarCapacidades(capacidades);
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-26T12:00:00Z"));
});

/** V205-01 / CAR-139: saldos acumulados grandes tras migración BIGINT. */
describe("finanzas flujo · saldos acumulados grandes", () => {
  it("planilla.obtener sigue sin INVALID_OUTPUT con dos celdas al tope", async () => {
    const { ctx } = contextoDePrueba({ semilla: semilla(), modulosActivos: ACTIVOS });
    const creada = await executeCapability(ctx, "finanzas.filas.crear", {
      seccion: "ingreso",
      etiqueta: "TEST QA Cliente B",
      arrastre: false,
    });
    if (!creada.ok) throw new Error(JSON.stringify(creada));
    const filaExtra = (creada as { ok: true; data: { id: string } }).data.id;
    for (const filaId of [FILA_ING, filaExtra]) {
      const f = await executeCapability(ctx, "finanzas.celdas.fijar", {
        filaId,
        semana: S0,
        monto: MONTO_FLUJO_MAX,
      });
      expect(f).toMatchObject({ ok: true });
    }
    const saldoEsperado = 100 + MONTO_FLUJO_MAX + MONTO_FLUJO_MAX - 300;
    const planilla = await executeCapability(ctx, "finanzas.planilla.obtener", { semanas: 1 });
    if (!planilla.ok) throw new Error(JSON.stringify(planilla));
    const sem = (planilla.data as { semanas: { saldoFinal: number }[] }).semanas;
    expect(sem[0]?.saldoFinal).toBe(saldoEsperado);
  });
});
